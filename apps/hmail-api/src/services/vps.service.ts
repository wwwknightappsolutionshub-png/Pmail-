import { prisma } from "../lib/prisma.js";

export type VpsStatus = "provisioning" | "running" | "stopped" | "suspended";

export type VpsInput = {
  tenantId?: string | null;
  label: string;
  hostname: string;
  ipAddress?: string | null;
  region?: string;
  planSlug?: string;
  cpuCores?: number;
  ramMb?: number;
  diskGb?: number;
  status?: VpsStatus;
  isActive?: boolean;
};

function serializeVps(vps: {
  id: string;
  tenantId: string | null;
  label: string;
  hostname: string;
  ipAddress: string | null;
  region: string;
  planSlug: string;
  cpuCores: number;
  ramMb: number;
  diskGb: number;
  status: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenant?: { id: string; slug: string; name: string } | null;
}) {
  return {
    id: vps.id,
    tenantId: vps.tenantId,
    label: vps.label,
    hostname: vps.hostname,
    ipAddress: vps.ipAddress,
    region: vps.region,
    planSlug: vps.planSlug,
    cpuCores: vps.cpuCores,
    ramMb: vps.ramMb,
    diskGb: vps.diskGb,
    status: vps.status as VpsStatus,
    isActive: vps.isActive,
    createdAt: vps.createdAt.toISOString(),
    updatedAt: vps.updatedAt.toISOString(),
    tenant: vps.tenant ?? null,
  };
}

export async function listVpsInstances() {
  const instances = await prisma.vpsInstance.findMany({
    include: { tenant: { select: { id: true, slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return instances.map(serializeVps);
}

export async function getVpsInstance(id: string) {
  const vps = await prisma.vpsInstance.findUnique({
    where: { id },
    include: { tenant: { select: { id: true, slug: true, name: true } } },
  });
  return vps ? serializeVps(vps) : null;
}

export async function createVpsInstance(input: VpsInput) {
  const vps = await prisma.vpsInstance.create({
    data: {
      tenantId: input.tenantId ?? null,
      label: input.label.trim(),
      hostname: input.hostname.trim().toLowerCase(),
      ipAddress: input.ipAddress?.trim() || null,
      region: input.region ?? "ca-central-1",
      planSlug: input.planSlug ?? "vps-s",
      cpuCores: input.cpuCores ?? 2,
      ramMb: input.ramMb ?? 4096,
      diskGb: input.diskGb ?? 80,
      status: input.status ?? "provisioning",
      isActive: input.isActive ?? true,
    },
    include: { tenant: { select: { id: true, slug: true, name: true } } },
  });
  return serializeVps(vps);
}

export async function updateVpsInstance(id: string, input: Partial<VpsInput>) {
  const vps = await prisma.vpsInstance.update({
    where: { id },
    data: {
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.hostname !== undefined ? { hostname: input.hostname.trim().toLowerCase() } : {}),
      ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress?.trim() || null } : {}),
      ...(input.region !== undefined ? { region: input.region } : {}),
      ...(input.planSlug !== undefined ? { planSlug: input.planSlug } : {}),
      ...(input.cpuCores !== undefined ? { cpuCores: input.cpuCores } : {}),
      ...(input.ramMb !== undefined ? { ramMb: input.ramMb } : {}),
      ...(input.diskGb !== undefined ? { diskGb: input.diskGb } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { tenant: { select: { id: true, slug: true, name: true } } },
  });
  return serializeVps(vps);
}

export async function deleteVpsInstance(id: string): Promise<void> {
  await prisma.vpsInstance.delete({ where: { id } });
}

export async function seedDemoVps(tenantId: string): Promise<void> {
  const existing = await prisma.vpsInstance.findFirst({
    where: { hostname: "demo-vps-01.hostnet.local" },
  });
  if (existing) return;

  await prisma.vpsInstance.create({
    data: {
      tenantId,
      label: "Demo VPS",
      hostname: "demo-vps-01.hostnet.local",
      ipAddress: "203.0.113.42",
      region: "ca-central-1",
      planSlug: "vps-m",
      cpuCores: 4,
      ramMb: 8192,
      diskGb: 160,
      status: "running",
    },
  });
}
