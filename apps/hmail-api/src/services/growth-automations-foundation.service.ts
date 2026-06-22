import { prisma } from "../lib/prisma.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { ensureDefaultGrowthAutomations } from "./growth-automation.service.js";

/** Mark workspace automations-ready after analytics foundation exists. */
export async function ensureGrowthAutomationsFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const automations = await ensureDefaultGrowthAutomations(input.tenantId, input.workspaceId);

  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (workspace?.status !== "automations_ready") {
    await setWorkspaceStatus(input.workspaceId, "automations_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "automations.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { automationCount: automations.length },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "automations.foundation_ready",
    payload: { automationCount: automations.length },
  });

  return { workspaceStatus: "automations_ready" as const, automations };
}
