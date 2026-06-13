import { prisma } from "../lib/prisma.js";

interface AuditInput {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logComplianceEvent(input: AuditInput): Promise<void> {
  await prisma.complianceAuditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function listComplianceLogs(tenantId: string, limit = 100) {
  const logs = await prisma.complianceAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    userEmail: log.userEmail,
    metadata: log.metadata ? (JSON.parse(log.metadata) as Record<string, unknown>) : null,
    createdAt: log.createdAt.toISOString(),
  }));
}
