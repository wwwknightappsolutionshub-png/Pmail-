import type { GrowthBusinessProfile, GrowthWorkspace } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { GROWTH_WIZARD_STEP_COUNT } from "../growth/wizard-schema.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

type WorkspaceWithProfile = GrowthWorkspace & { businessProfile: GrowthBusinessProfile | null };

function serializeWorkspace(row: WorkspaceWithProfile) {
  const profile = row.businessProfile;
  return {
    id: row.id,
    tenantId: row.tenantId,
    status: row.status,
    wizardStep: row.wizardStep,
    wizardCompletedAt: row.wizardCompletedAt?.toISOString() ?? null,
    hostingAccountId: row.hostingAccountId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    wizard: {
      currentStep: row.wizardStep,
      completed: Boolean(row.wizardCompletedAt),
      steps: {
        step1: profile?.step1Json ? JSON.parse(profile.step1Json) : null,
        step2: profile?.step2Json ? JSON.parse(profile.step2Json) : null,
        step3: profile?.step3Json ? JSON.parse(profile.step3Json) : null,
        step4: profile?.step4Json ? JSON.parse(profile.step4Json) : null,
        step5: profile?.step5Json ? JSON.parse(profile.step5Json) : null,
        step6: profile?.step6Json ? JSON.parse(profile.step6Json) : null,
      },
    },
  };
}

export async function getOrCreateGrowthWorkspace(input: {
  tenantId: string;
  hostingAccountId?: string;
}) {
  let workspace = await prisma.growthWorkspace.findUnique({
    where: { tenantId: input.tenantId },
    include: { businessProfile: true },
  });

  if (!workspace) {
    workspace = await prisma.growthWorkspace.create({
      data: {
        tenantId: input.tenantId,
        hostingAccountId: input.hostingAccountId,
        businessProfile: { create: {} },
      },
      include: { businessProfile: true },
    });

    await logGrowthAudit({
      tenantId: input.tenantId,
      workspaceId: workspace.id,
      action: "workspace.created",
      entityType: "growth_workspace",
      entityId: workspace.id,
    });

    await emitGrowthEvent({
      tenantId: input.tenantId,
      workspaceId: workspace.id,
      eventType: "workspace.created",
    });
  } else if (input.hostingAccountId && !workspace.hostingAccountId) {
    workspace = await prisma.growthWorkspace.update({
      where: { id: workspace.id },
      data: { hostingAccountId: input.hostingAccountId },
      include: { businessProfile: true },
    });
  }

  return serializeWorkspace(workspace);
}

export async function getGrowthWorkspaceForTenant(tenantId: string) {
  const workspace = await prisma.growthWorkspace.findUnique({
    where: { tenantId },
    include: { businessProfile: true },
  });
  if (!workspace) return null;
  return serializeWorkspace(workspace);
}

export async function assertWizardStepsComplete(workspaceId: string) {
  const profile = await prisma.growthBusinessProfile.findUnique({ where: { workspaceId } });
  if (!profile) throw new Error("Business profile not found");

  for (let step = 1; step <= GROWTH_WIZARD_STEP_COUNT; step += 1) {
    const key = `step${step}Json` as keyof GrowthBusinessProfile;
    const raw = profile[key];
    if (!raw || raw === "null") {
      throw new Error(`Wizard step ${step} is incomplete`);
    }
  }
}

export async function markWizardCompleted(workspaceId: string, tenantId: string) {
  await assertWizardStepsComplete(workspaceId);

  const workspace = await prisma.growthWorkspace.update({
    where: { id: workspaceId },
    data: {
      wizardStep: GROWTH_WIZARD_STEP_COUNT,
      wizardCompletedAt: new Date(),
      status: "analysis_queued",
    },
    include: { businessProfile: true },
  });

  await logGrowthAudit({
    tenantId,
    workspaceId,
    action: "wizard.completed",
    entityType: "growth_workspace",
    entityId: workspaceId,
  });

  await emitGrowthEvent({
    tenantId,
    workspaceId,
    eventType: "wizard.completed",
  });

  return serializeWorkspace(workspace);
}

export async function setWorkspaceStatus(workspaceId: string, status: string) {
  await prisma.growthWorkspace.update({
    where: { id: workspaceId },
    data: { status },
  });
}
