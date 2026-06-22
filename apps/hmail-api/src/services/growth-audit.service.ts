import { prisma } from "../lib/prisma.js";

export async function logGrowthAudit(input: {
  tenantId: string;
  workspaceId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.growthAuditLog.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}
