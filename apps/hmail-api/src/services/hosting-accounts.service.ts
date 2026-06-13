import type { HostingAccount, HostingPlan, Tenant } from "@prisma/client";
import { hashPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

export type HostingAccountInput = {
  tenantId: string;
  planId?: string | null;
  username: string;
  domain: string;
  homePath?: string;
  password: string;
  diskQuotaMb?: number;
  diskUsedMb?: number;
  bandwidthMb?: number;
  bandwidthUsedMb?: number;
  emailAccounts?: number;
  databases?: number;
  isSuspended?: boolean;
};

type AccountWithRelations = HostingAccount & {
  tenant: Pick<Tenant, "id" | "slug" | "name" | "isActive">;
  plan: Pick<HostingPlan, "id" | "slug" | "name"> | null;
};

function serializeAccount(account: AccountWithRelations) {
  return {
    id: account.id,
    tenantId: account.tenantId,
    planId: account.planId,
    username: account.username,
    domain: account.domain,
    homePath: account.homePath,
    diskQuotaMb: account.diskQuotaMb,
    diskUsedMb: account.diskUsedMb,
    bandwidthMb: account.bandwidthMb,
    bandwidthUsedMb: account.bandwidthUsedMb,
    emailAccounts: account.emailAccounts,
    databases: account.databases,
    isSuspended: account.isSuspended,
    tenant: account.tenant,
    plan: account.plan,
    loginId: `${account.username}@${account.domain}`,
    updatedAt: account.updatedAt.toISOString(),
  };
}

const accountInclude = {
  tenant: { select: { id: true, slug: true, name: true, isActive: true } },
  plan: { select: { id: true, slug: true, name: true } },
} as const;

export async function listHostingAccounts() {
  const accounts = await prisma.hostingAccount.findMany({
    include: accountInclude,
    orderBy: { createdAt: "desc" },
  });
  return accounts.map(serializeAccount);
}

export async function getHostingAccount(id: string) {
  const account = await prisma.hostingAccount.findUnique({
    where: { id },
    include: accountInclude,
  });
  if (!account) return null;
  return serializeAccount(account);
}

export async function createHostingAccount(input: HostingAccountInput) {
  const username = input.username.trim().toLowerCase();
  const domain = input.domain.trim().toLowerCase();
  const homePath = input.homePath ?? `/home/${username}`;

  const account = await prisma.hostingAccount.create({
    data: {
      tenantId: input.tenantId,
      planId: input.planId ?? null,
      username,
      domain,
      homePath,
      passwordHash: hashPassword(input.password),
      diskQuotaMb: input.diskQuotaMb ?? 1024,
      diskUsedMb: input.diskUsedMb ?? 0,
      bandwidthMb: input.bandwidthMb ?? 10240,
      bandwidthUsedMb: input.bandwidthUsedMb ?? 0,
      emailAccounts: input.emailAccounts ?? 5,
      databases: input.databases ?? 1,
      isSuspended: input.isSuspended ?? false,
    },
    include: accountInclude,
  });
  return serializeAccount(account);
}

export async function updateHostingAccount(id: string, input: Partial<HostingAccountInput>) {
  const account = await prisma.hostingAccount.update({
    where: { id },
    data: {
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.planId !== undefined ? { planId: input.planId } : {}),
      ...(input.username !== undefined ? { username: input.username.trim().toLowerCase() } : {}),
      ...(input.domain !== undefined ? { domain: input.domain.trim().toLowerCase() } : {}),
      ...(input.homePath !== undefined ? { homePath: input.homePath } : {}),
      ...(input.password !== undefined ? { passwordHash: hashPassword(input.password) } : {}),
      ...(input.diskQuotaMb !== undefined ? { diskQuotaMb: input.diskQuotaMb } : {}),
      ...(input.diskUsedMb !== undefined ? { diskUsedMb: input.diskUsedMb } : {}),
      ...(input.bandwidthMb !== undefined ? { bandwidthMb: input.bandwidthMb } : {}),
      ...(input.bandwidthUsedMb !== undefined ? { bandwidthUsedMb: input.bandwidthUsedMb } : {}),
      ...(input.emailAccounts !== undefined ? { emailAccounts: input.emailAccounts } : {}),
      ...(input.databases !== undefined ? { databases: input.databases } : {}),
      ...(input.isSuspended !== undefined ? { isSuspended: input.isSuspended } : {}),
    },
    include: accountInclude,
  });
  return serializeAccount(account);
}

export async function deleteHostingAccount(id: string): Promise<void> {
  await prisma.hostingAccount.delete({ where: { id } });
}

export async function seedDemoHostingAccount(tenantId: string, planId?: string): Promise<void> {
  const username = "demo";
  const domain = "hostnet.local";

  await prisma.hostingAccount.upsert({
    where: { username_domain: { username, domain } },
    create: {
      tenantId,
      planId: planId ?? null,
      username,
      domain,
      homePath: "/home/demo",
      passwordHash: hashPassword("panel123"),
      diskQuotaMb: 5120,
      diskUsedMb: 1240,
      bandwidthMb: 51200,
      bandwidthUsedMb: 8200,
      emailAccounts: 25,
      databases: 5,
    },
    update: {
      tenantId,
      planId: planId ?? null,
      diskQuotaMb: 5120,
      diskUsedMb: 1240,
      bandwidthMb: 51200,
      bandwidthUsedMb: 8200,
      emailAccounts: 25,
      databases: 5,
    },
  });
}
