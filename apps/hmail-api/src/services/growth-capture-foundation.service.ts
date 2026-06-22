import { prisma } from "../lib/prisma.js";
import { ensureGrowthCaptureForm } from "./growth-form.service.js";
import { ensureGrowthPipelineStages } from "./growth-pipeline.service.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

/** Bootstrap Phase C pipeline + capture form for a workspace. */
export async function ensureGrowthCaptureFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  await ensureGrowthPipelineStages(input.tenantId, input.workspaceId);
  const form = await ensureGrowthCaptureForm(input.tenantId, input.workspaceId);

  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (workspace?.status !== "capture_ready") {
    await setWorkspaceStatus(input.workspaceId, "capture_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "capture.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { formKey: form.formKey },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "capture.foundation_ready",
    payload: { formKey: form.formKey },
  });

  return { form };
}
