import type { PlatformAdmin } from "@prisma/client";
import { getEnv } from "../config/env.js";
import { hashPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

export class PlatformAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformAdminError";
  }
}

export type PlatformAdminRole = "super_admin" | "admin";

export function sanitizePlatformAdmin(admin: PlatformAdmin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as PlatformAdminRole,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    createdAt: admin.createdAt.toISOString(),
  };
}

function validatePassword(password: string): void {
  const env = getEnv();
  if (password.length < env.ADMIN_MIN_PASSWORD_LENGTH) {
    throw new PlatformAdminError(`Password must be at least ${env.ADMIN_MIN_PASSWORD_LENGTH} characters`);
  }
  if (env.NODE_ENV === "production" && env.ADMIN_DISALLOW_DEFAULT_PASSWORD) {
    if (password === env.ADMIN_DEFAULT_PASSWORD) {
      throw new PlatformAdminError("Default admin password is not allowed in production");
    }
  }
}

export async function listPlatformAdmins() {
  const admins = await prisma.platformAdmin.findMany({ orderBy: { email: "asc" } });
  return admins.map(sanitizePlatformAdmin);
}

export async function createPlatformAdmin(input: {
  email: string;
  name: string;
  password: string;
  role?: PlatformAdminRole;
}) {
  validatePassword(input.password);
  const email = input.email.trim().toLowerCase();

  const admin = await prisma.platformAdmin.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role ?? "admin",
    },
  });
  return sanitizePlatformAdmin(admin);
}

export async function updatePlatformAdmin(
  id: string,
  input: Partial<{ name: string; email: string; role: PlatformAdminRole; isActive: boolean; password: string }>,
) {
  if (input.password) validatePassword(input.password);

  const admin = await prisma.platformAdmin.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password !== undefined ? { passwordHash: hashPassword(input.password) } : {}),
    },
  });
  return sanitizePlatformAdmin(admin);
}

export async function deletePlatformAdmin(id: string, actingAdminId: string): Promise<void> {
  if (id === actingAdminId) {
    throw new PlatformAdminError("You cannot delete your own admin account");
  }

  const superAdminCount = await prisma.platformAdmin.count({
    where: { role: "super_admin", isActive: true },
  });
  const target = await prisma.platformAdmin.findUnique({ where: { id } });
  if (!target) throw new PlatformAdminError("Admin not found");

  if (target.role === "super_admin" && superAdminCount <= 1) {
    throw new PlatformAdminError("Cannot delete the last super admin");
  }

  await prisma.platformAdmin.delete({ where: { id } });
}
