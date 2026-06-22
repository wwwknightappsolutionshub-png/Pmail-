import { prisma } from "../lib/prisma.js";
import {
  GROWTH_WIZARD_STEP_COUNT,
  parseGrowthWizardStep,
  wizardStepFieldKey,
} from "../growth/wizard-schema.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { getOrCreateGrowthWorkspace } from "./growth-workspace.service.js";

export async function saveGrowthWizardStep(input: {
  tenantId: string;
  hostingAccountId?: string;
  step: number;
  data: unknown;
}) {
  const workspace = await getOrCreateGrowthWorkspace({
    tenantId: input.tenantId,
    hostingAccountId: input.hostingAccountId,
  });

  const parsed = parseGrowthWizardStep(input.step, input.data);
  const field = wizardStepFieldKey(input.step);

  await prisma.growthBusinessProfile.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      [field]: JSON.stringify(parsed),
    },
    update: {
      [field]: JSON.stringify(parsed),
    },
  });

  const nextStep = Math.min(Math.max(input.step + 1, input.step), GROWTH_WIZARD_STEP_COUNT);
  const wizardStep = input.step >= GROWTH_WIZARD_STEP_COUNT ? GROWTH_WIZARD_STEP_COUNT : nextStep;

  await prisma.growthWorkspace.update({
    where: { id: workspace.id },
    data: { wizardStep },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: workspace.id,
    action: "wizard.step_saved",
    entityType: "growth_wizard",
    entityId: String(input.step),
    metadata: { step: input.step },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: workspace.id,
    eventType: "wizard.step_saved",
    payload: { step: input.step },
  });

  return getOrCreateGrowthWorkspace({
    tenantId: input.tenantId,
    hostingAccountId: input.hostingAccountId,
  });
}

export function getWizardStepMeta() {
  return {
    stepCount: GROWTH_WIZARD_STEP_COUNT,
    steps: [
      { step: 1, title: "Business Information", key: "business" },
      { step: 2, title: "Customer Information", key: "customer" },
      { step: 3, title: "Competitors", key: "competitors" },
      { step: 4, title: "Offer Configuration", key: "offer" },
      { step: 5, title: "Communication Style", key: "style" },
      { step: 6, title: "Assets", key: "assets" },
    ],
  };
}
