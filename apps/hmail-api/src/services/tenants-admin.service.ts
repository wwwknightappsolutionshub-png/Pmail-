import { prisma } from "../lib/prisma.js";

export type TenantInput = {
  slug: string;
  name: string;
  isActive?: boolean;
};

function serializeTenant(tenant: {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { hostingAccounts: number; users: number };
}) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    isActive: tenant.isActive,
    hostingAccountCount: tenant._count?.hostingAccounts ?? 0,
    userCount: tenant._count?.users ?? 0,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

export async function listTenants() {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { hostingAccounts: true, users: true } },
    },
    orderBy: { name: "asc" },
  });
  return tenants.map(serializeTenant);
}

export async function getTenant(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { hostingAccounts: true, users: true } },
      branding: true,
      mail: true,
    },
  });
  if (!tenant) return null;
  return {
    ...serializeTenant(tenant),
    branding: tenant.branding,
    mail: tenant.mail,
  };
}

export async function createTenant(input: TenantInput) {
  const tenant = await prisma.tenant.create({
    data: {
      slug: input.slug.trim().toLowerCase(),
      name: input.name,
      isActive: input.isActive ?? true,
      branding: { create: { productName: "hmail" } },
      mail: { create: {} },
    },
    include: {
      _count: { select: { hostingAccounts: true, users: true } },
    },
  });
  return serializeTenant(tenant);
}

export async function updateTenant(id: string, input: Partial<TenantInput>) {
  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug.trim().toLowerCase() } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: {
      _count: { select: { hostingAccounts: true, users: true } },
    },
  });
  return serializeTenant(tenant);
}

export async function deleteTenant(id: string): Promise<void> {
  await prisma.tenant.delete({ where: { id } });
}
