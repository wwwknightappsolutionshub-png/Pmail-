import { prisma } from "../lib/prisma.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

/** Mark workspace analytics-ready after capture + chatbot foundations exist. */
export async function ensureGrowthAnalyticsFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (workspace?.status !== "analytics_ready") {
    await setWorkspaceStatus(input.workspaceId, "analytics_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "analytics.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "analytics.foundation_ready",
  });

  return { workspaceStatus: "analytics_ready" as const };
}
