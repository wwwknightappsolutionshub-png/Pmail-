import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { Tenant, TenantBranding, TenantMailConfig, User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { decryptSecret, encryptSecret, hashToken } from "../lib/crypto.js";
import { verifyImapLogin } from "./imap.service.js";
import { verifySmtpLogin } from "./smtp.service.js";

const SESSION_TTL_HOURS = 12;

export type UserWithTenant = User & {
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
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; user: UserWithTenant }> {
  const tenant = await resolveTenantBySlug(input.tenantSlug);
  const mailConfig = tenant.mail ?? (await ensureTenantMailConfig(tenant.id));

  const credentials = {
    email: input.email.trim().toLowerCase(),
    password: input.password,
    mailConfig,
  };

  try {
    await verifyImapLogin(credentials);
    await verifySmtpLogin(credentials.email, credentials.password, mailConfig);
  } catch {
    throw new AuthError("Invalid email or password");
  }

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: credentials.email,
      },
    },
    create: {
      tenantId: tenant.id,
      email: credentials.email,
      displayName: credentials.email.split("@")[0],
    },
    update: {
      lastLoginAt: new Date(),
      isActive: true,
    },
    include: {
      tenant: { include: { branding: true, mail: true } },
    },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      encryptedMailPassword: encryptSecret(input.password),
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  return { token, user };
}

async function ensureTenantMailConfig(tenantId: string): Promise<TenantMailConfig> {
  return prisma.tenantMailConfig.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
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

export function sanitizeUser(user: UserWithTenant) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    tenant: {
      id: user.tenant.id,
      slug: user.tenant.slug,
      name: user.tenant.name,
      branding: user.tenant.branding,
      mail: user.tenant.mail
        ? {
            imapHost: user.tenant.mail.imapHost,
            smtpHost: user.tenant.mail.smtpHost,
          }
        : null,
    },
  };
}
