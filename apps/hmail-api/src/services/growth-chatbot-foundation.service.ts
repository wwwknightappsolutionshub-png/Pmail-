import { prisma } from "../lib/prisma.js";
import { ensureGrowthChatbotConfig } from "./growth-chatbot-config.service.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

/** Bootstrap Phase D qualification chatbot for a workspace. */
export async function ensureGrowthChatbotFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const config = await ensureGrowthChatbotConfig(input.tenantId, input.workspaceId);

  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (workspace?.status !== "chatbot_ready") {
    await setWorkspaceStatus(input.workspaceId, "chatbot_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "chatbot.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { botKey: config.botKey },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "chatbot.foundation_ready",
    payload: { botKey: config.botKey },
  });

  return { config };
}
