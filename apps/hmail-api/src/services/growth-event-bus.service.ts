import { prisma } from "../lib/prisma.js";

export async function emitGrowthEvent(input: {
  tenantId: string;
  workspaceId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  const row = await prisma.growthEvent.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      payloadJson: JSON.stringify(input.payload ?? {}),
    },
  });

  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    eventType: row.eventType,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listGrowthEvents(
  tenantId: string,
  workspaceId: string,
  limit = 50,
) {
  const rows = await prisma.growthEvent.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    eventType: row.eventType,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));
}
