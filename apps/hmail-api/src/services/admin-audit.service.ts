import { prisma } from "../lib/prisma.js";

export type AuditInput = {
  adminId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAdminAction(input: AuditInput): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress,
    },
  });
}

export async function listRecentAuditLogs(limit = 50) {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: { select: { id: true, email: true, name: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata ? (JSON.parse(log.metadata) as Record<string, unknown>) : null,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
    admin: log.admin,
  }));
}
