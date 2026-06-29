import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { PlatformAdmin } from "@prisma/client";
import { getEnv } from "../config/env.js";
import { hashPassword, hashToken, verifyPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

const ADMIN_SESSION_TTL_HOURS = 24;

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function sanitizeAdmin(admin: PlatformAdmin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
  };
}

export async function seedPlatformAdmin(): Promise<void> {
  const env = getEnv();
  const email = env.ADMIN_DEFAULT_EMAIL.toLowerCase();
  const passwordHash = hashPassword(env.ADMIN_DEFAULT_PASSWORD);

  await prisma.platformAdmin.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name: "Prohost Cloud Admin",
      role: "super_admin",
    },
    update: {
      name: "Prohost Cloud Admin",
      role: "super_admin",
    },
  });

  if (env.NODE_ENV === "development") {
    const opsEmail = "ops@hostnet.local";
    await prisma.platformAdmin.upsert({
      where: { email: opsEmail },
      create: {
        email: opsEmail,
        passwordHash: hashPassword("ops-admin-pass12"),
        name: "Operations Admin",
        role: "admin",
      },
      update: {
        name: "Operations Admin",
      },
    });
  }
}

export async function loginAdmin(input: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; admin: PlatformAdmin }> {
  const email = input.email.trim().toLowerCase();
  const admin = await prisma.platformAdmin.findFirst({
    where: { email, isActive: true },
  });

  if (!admin || !verifyPassword(input.password, admin.passwordHash)) {
    throw new AdminAuthError("Invalid email or password");
  }

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  return { token, admin };
}

export async function logoutAdminSession(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function changeAdminPassword(input: {
  adminId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const env = getEnv();
  if (input.newPassword.length < env.ADMIN_MIN_PASSWORD_LENGTH) {
    throw new AdminAuthError(`Password must be at least ${env.ADMIN_MIN_PASSWORD_LENGTH} characters`);
  }
  if (env.NODE_ENV === "production" && env.ADMIN_DISALLOW_DEFAULT_PASSWORD) {
    if (input.newPassword === env.ADMIN_DEFAULT_PASSWORD) {
      throw new AdminAuthError("Default admin password is not allowed in production");
    }
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { id: input.adminId } });
  if (!admin || !admin.isActive) {
    throw new AdminAuthError("Current password is incorrect");
  }
  if (!verifyPassword(input.currentPassword, admin.passwordHash)) {
    throw new AdminAuthError("Current password is incorrect");
  }

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { passwordHash: hashPassword(input.newPassword) },
  });
}

export async function getAdminContext(req: Request): Promise<PlatformAdmin | null> {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const token = bearer || (req.cookies?.hostnet_admin_session as string | undefined);
  if (!token) return null;

  const session = await prisma.adminSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: { admin: true },
  });

  if (!session?.admin.isActive) return null;
  return session.admin;
}
