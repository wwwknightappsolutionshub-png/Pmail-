import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { Tenant, TenantBranding, TenantMailConfig, User, UserMailConfig } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { decryptSecret, encryptSecret, hashToken } from "../lib/crypto.js";
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
  isPmailTesterLogin,
} from "./pmail-tester.service.js";

const SESSION_TTL_HOURS = 12;

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

  const credentials = {
    email: credentialsEmail,
    password: input.password,
    mailConfig,
  };

  if (!isLocalTester) {
    try {
      await verifyImapLogin(credentials);
      await verifySmtpLogin(credentials.email, credentials.password, mailConfig);
    } catch {
      throw new AuthError("Invalid email or password");
    }
  }

  const user = await prisma.user.upsert({
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

  if (!user.mailConfig) {
    if (pendingUserMailConfig) {
      await saveUserMailConfig(user.id, pendingUserMailConfig);
    } else if (tenant.mail?.mailOnboardingComplete) {
      await copyTenantMailConfigToUser(user.id, tenant.mail);
    }
  }

  const userWithConfig = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      mailConfig: true,
      tenant: { include: { branding: true, mail: true } },
    },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: userWithConfig.id,
      tokenHash: hashToken(token),
      encryptedMailPassword: encryptSecret(input.password),
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  const { ensureAutoReplyComplimentary } = await import("./auto-reply-entitlement.service.js");
  await ensureAutoReplyComplimentary(userWithConfig.id, userWithConfig.businessVertical);

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
  };
}

export async function getAuthContext(req: Request): Promise<{
  user: UserWithTenant;
  mailPassword: string;
} | null> {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = req.cookies?.hmail_session as string | undefined;
  const token = bearer || cookieToken;
  if (!token) return null;
  return getSessionUser(token);
}

export function resolveAuthMailConfig(user: UserWithMailRelations): TenantMailConfig | null {
  return resolveEffectiveMailConfig(user);
}

export function sanitizeUser(user: UserWithTenant) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    businessVertical: user.businessVertical,
    uiThemeVersion: user.uiThemeVersion,
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
