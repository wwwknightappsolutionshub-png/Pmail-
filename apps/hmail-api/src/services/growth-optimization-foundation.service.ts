import { prisma } from "../lib/prisma.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { refreshGrowthOptimizationInsights } from "./growth-optimization.service.js";

/** Mark workspace optimization-ready with initial insight batch. */
export async function ensureGrowthOptimizationFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (!workspace) throw new Error("Growth workspace not found");

  const insights = await refreshGrowthOptimizationInsights(input.tenantId, input.workspaceId, {
    skipAccessCheck: true,
  });

  if (workspace.status !== "optimization_ready") {
    await setWorkspaceStatus(input.workspaceId, "optimization_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "optimization.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { insightCount: insights.length },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "optimization.foundation_ready",
    payload: { insightCount: insights.length },
  });

  return { workspaceStatus: "optimization_ready" as const, insights };
}
