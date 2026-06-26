import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { Tenant, TenantBranding, TenantMailConfig, User, UserMailConfig } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { decryptSecret, encryptSecret, hashToken } from "../lib/crypto.js";
import { isGoogleMailbox, normalizeMailboxPassword } from "../lib/mailbox-credentials.js";
import { verifyImapLogin } from "./imap.service.js";
import { verifySmtpLogin } from "./smtp.service.js";
import {
  copyTenantMailConfigToUser,
  parseLoginMailConfig,
  resolveEffectiveMailConfig,
  saveUserMailConfig,
  serializeUserMailConfig,
  type UserWithMailRelations,
} from "./user-mail-config.service.js";
import { getEnv } from "../config/env.js";
import {
  isPmailTesterBypassEnabled,
  isPmailTesterEmail,
  isPmailTesterLogin,
} from "./pmail-tester.service.js";
import {
  ensurePrimaryMailAccount,
  getActiveMailAccountSummary,
} from "./mail-account.service.js";

const SESSION_TTL_HOURS = 12;

function gmailAuthHint(): string {
  return "Gmail could not sign in. In Gmail go to Settings → Forwarding and POP/IMAP → enable IMAP. If 2-Step Verification is on, create an App Password at myaccount.google.com/apppasswords and use that here (not your regular Gmail password).";
}

function mailboxAuthErrorMessage(email: string, phase: "imap" | "smtp"): string {
  if (isGoogleMailbox(email)) {
    return phase === "smtp"
      ? "Gmail accepted IMAP but SMTP failed. Use a Google App Password and keep Google selected with smtp.gmail.com:587."
      : gmailAuthHint();
  }
  return "Invalid email or password";
}

function rethrowLoginSetupError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
    const isSqlite = (process.env.DATABASE_URL ?? "").startsWith("file:");
    throw new Error(
      isSqlite
        ? "Local database schema is out of date. From the project root run: npm run db:local:sync, then restart the API."
        : "Server database schema is out of date. Run npm run db:migrate -w hmail-api on the server, then restart the API.",
    );
  }
  throw err;
}

export type UserWithTenant = User & {
  mailConfig: UserMailConfig | null;
  tenant: Tenant & {
    branding: TenantBranding | null;
    mail: TenantMailConfig | null;
  };
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function loginTesterUser(input: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; user: UserWithTenant }> {
  if (!isPmailTesterBypassEnabled()) {
    throw new AuthError("Tester login is not enabled");
  }

  const env = getEnv();
  return loginUser({
    tenantSlug: env.PMAIL_TESTER_TENANT_SLUG,
    email: input.email,
    password: input.password,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function resolveTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, isActive: true },
    include: { branding: true, mail: true },
  });
  if (!tenant) throw new AuthError("Organization not found");
  return tenant;
}

export async function loginUser(input: {
  tenantSlug: string;
  email: string;
  password: string;
  providerPreset?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; user: UserWithTenant }> {
  const tenant = await resolveTenantBySlug(input.tenantSlug);
  const credentialsEmail = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: credentialsEmail,
      },
    },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
  });

  const isLocalTester = isPmailTesterLogin({
    tenantSlug: input.tenantSlug,
    email: credentialsEmail,
    password: input.password,
  });

  let mailConfig = existingUser ? resolveEffectiveMailConfig(existingUser) : null;
  let pendingUserMailConfig = existingUser?.mailConfig ? null : parseLoginMailConfig(input);

  if (!mailConfig && isLocalTester && tenant.mail) {
    mailConfig = {
      id: "tester-mail",
      tenantId: tenant.id,
      imapHost: tenant.mail.imapHost,
      imapPort: tenant.mail.imapPort,
      imapSecure: tenant.mail.imapSecure,
      smtpHost: tenant.mail.smtpHost,
      smtpPort: tenant.mail.smtpPort,
      smtpSecure: tenant.mail.smtpSecure,
      mailOnboardingComplete: true,
    };
  }

  if (!mailConfig && !pendingUserMailConfig) {
    if (tenant.mail?.mailOnboardingComplete) {
      pendingUserMailConfig = {
        providerPreset: "custom",
        imapHost: tenant.mail.imapHost,
        imapPort: tenant.mail.imapPort,
        imapSecure: tenant.mail.imapSecure,
        smtpHost: tenant.mail.smtpHost,
        smtpPort: tenant.mail.smtpPort,
        smtpSecure: tenant.mail.smtpSecure,
      };
    }
  }

  if (!mailConfig && pendingUserMailConfig) {
    mailConfig = {
      id: "pending",
      tenantId: tenant.id,
      ...pendingUserMailConfig,
      mailOnboardingComplete: true,
    };
  }

  if (!mailConfig) {
    throw new AuthError("Select your mail provider and sign in to connect your mailbox.");
  }

  const mailPassword = normalizeMailboxPassword(credentialsEmail, input.password);

  const credentials = {
    email: credentialsEmail,
    password: mailPassword,
    mailConfig,
  };

  if (!isLocalTester) {
    try {
      await verifyImapLogin(credentials);
    } catch (err) {
      console.error("[auth] IMAP verify failed", err);
      throw new AuthError(mailboxAuthErrorMessage(credentialsEmail, "imap"));
    }
    try {
      await verifySmtpLogin(credentials.email, credentials.password, mailConfig);
    } catch (err) {
      console.error("[auth] SMTP verify failed", err);
      throw new AuthError(mailboxAuthErrorMessage(credentialsEmail, "smtp"));
    }
  }

  let user;
  try {
    user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: credentialsEmail,
      },
    },
    create: {
      tenantId: tenant.id,
      email: credentialsEmail,
      displayName: credentialsEmail.split("@")[0],
    },
    update: {
      lastLoginAt: new Date(),
      isActive: true,
    },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
    });
  } catch (err) {
    rethrowLoginSetupError(err);
  }

  try {
    if (!user.mailConfig) {
      if (pendingUserMailConfig) {
        await saveUserMailConfig(user.id, pendingUserMailConfig);
      } else if (tenant.mail?.mailOnboardingComplete) {
        await copyTenantMailConfigToUser(user.id, tenant.mail);
      }
    }
  } catch (err) {
    rethrowLoginSetupError(err);
  }

  let userWithConfig: UserWithTenant;
  try {
    userWithConfig = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        mailConfig: true,
        tenant: { include: { branding: true, mail: true } },
      },
    });
  } catch (err) {
    rethrowLoginSetupError(err);
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  try {
    await prisma.session.create({
      data: {
        userId: userWithConfig.id,
        tokenHash: hashToken(token),
        encryptedMailPassword: encryptSecret(mailPassword),
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    rethrowLoginSetupError(err);
  }

  try {
    const { ensureAutoReplyComplimentary } = await import("./auto-reply-entitlement.service.js");
    await ensureAutoReplyComplimentary(userWithConfig.id, userWithConfig.businessVertical);
  } catch (err) {
    console.error("[auth] auto-reply setup failed", err);
  }

  try {
    await ensurePrimaryMailAccount(userWithConfig, mailPassword);
  } catch (err) {
    rethrowLoginSetupError(err);
  }

  try {
    const { ensurePanelWorkspaceWelcomeTrial, ensurePmailTesterPanelWorkspaceTrial } = await import(
      "./panel-workspace-trial.service.js"
    );
    await ensurePanelWorkspaceWelcomeTrial(userWithConfig.id);

    if (isPmailTesterEmail(userWithConfig.email)) {
      await ensurePmailTesterPanelWorkspaceTrial(userWithConfig.id);
      const { resetPmailTesterCareerState, ensurePmailTesterAccountingWorkspace } = await import(
        "./pmail-tester-seed.service.js"
      );
      await resetPmailTesterCareerState(userWithConfig.id);
      await ensurePmailTesterAccountingWorkspace(userWithConfig.tenant.id, userWithConfig.id);
    } else {
      const { syncCareerMailSignalsForUser } = await import("./job-hunter-applications.service.js");
      void syncCareerMailSignalsForUser(tenant.id, userWithConfig.id).catch((err) => {
        console.error("[auth] career signal sync failed", err);
      });
    }
  } catch (err) {
    console.error("[auth] panel workspace trial setup failed", err);
  }

  return { token, user: userWithConfig };
}

export async function logoutSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function getSessionUser(token: string): Promise<{
  user: UserWithTenant;
  mailPassword: string;
  activeMailAccountId: string | null;
} | null> {
  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          mailConfig: true,
          tenant: { include: { branding: true, mail: true } },
        },
      },
    },
  });

  if (!session || !session.user.isActive || !session.user.tenant.isActive) {
    return null;
  }

  return {
    user: session.user,
    mailPassword: decryptSecret(session.encryptedMailPassword),
    activeMailAccountId: session.activeMailAccountId,
  };
}

export async function getAuthContext(req: Request): Promise<{
  user: UserWithTenant;
  mailPassword: string;
  activeMailAccountId: string | null;
} | null> {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  return getSessionUser(token);
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.hmail_session as string | undefined;
  return bearer || cookieToken || null;
}

export function resolveAuthMailConfig(user: UserWithMailRelations): TenantMailConfig | null {
  return resolveEffectiveMailConfig(user);
}

export function sanitizeUser(
  user: UserWithTenant,
  mailSession?: { activeMailAccount: Awaited<ReturnType<typeof getActiveMailAccountSummary>>["activeMailAccount"]; mailAccountCount: number },
) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    businessVertical: user.businessVertical,
    uiThemeVersion: user.uiThemeVersion,
    mailPushEnabled: user.mailPushEnabled,
    tenant: {
      id: user.tenant.id,
      slug: user.tenant.slug,
      name: user.tenant.name,
      branding: user.tenant.branding,
      mail: user.tenant.mail
        ? {
            imapHost: user.tenant.mail.imapHost,
            smtpHost: user.tenant.mail.smtpHost,
            mailOnboardingComplete: user.tenant.mail.mailOnboardingComplete,
          }
        : null,
    },
    mailConfig: user.mailConfig ? serializeUserMailConfig(user.mailConfig) : null,
    activeMailAccount: mailSession?.activeMailAccount ?? null,
    mailAccountCount: mailSession?.mailAccountCount ?? 0,
  };
}

export async function updateUserThemeVersion(userId: string, uiThemeVersion: "dark" | "light") {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { uiThemeVersion },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
  });

  return sanitizeUser(user);
}

export async function updateUserMailPushEnabled(userId: string, mailPushEnabled: boolean) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { mailPushEnabled },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
  });

  if (!mailPushEnabled) {
    await prisma.pwaPushSubscription.deleteMany({ where: { userId } });
  }

  return sanitizeUser(user);
}

export async function listTenantWorkspaceUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.email.split("@")[0],
  }));
}
