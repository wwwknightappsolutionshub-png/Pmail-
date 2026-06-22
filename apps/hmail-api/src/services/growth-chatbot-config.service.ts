import { prisma } from "../lib/prisma.js";
import {
  buildQualificationChatbotSteps,
  GROWTH_QUALIFICATION_BOT_KEY,
  type GrowthChatbotStep,
} from "../growth/chatbot-steps.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";

function serializeConfig(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  botKey: string;
  title: string;
  welcomeMessage: string;
  stepsJson: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    botKey: row.botKey,
    title: row.title,
    welcomeMessage: row.welcomeMessage,
    steps: JSON.parse(row.stepsJson) as GrowthChatbotStep[],
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureGrowthChatbotConfig(tenantId: string, workspaceId: string) {
  const existing = await prisma.growthChatbotConfig.findFirst({
    where: { workspaceId, botKey: GROWTH_QUALIFICATION_BOT_KEY },
  });
  if (existing) return serializeConfig(existing);

  const profile = await loadGrowthWizardProfile(workspaceId);
  const business = wizardBusinessName(profile);
  const steps = buildQualificationChatbotSteps(profile);
  const welcomeMessage = steps[0]?.message ?? `Hi! Welcome to ${business}.`;

  const row = await prisma.growthChatbotConfig.create({
    data: {
      tenantId,
      workspaceId,
      botKey: GROWTH_QUALIFICATION_BOT_KEY,
      title: `${business} assistant`,
      welcomeMessage,
      stepsJson: JSON.stringify(steps),
      isActive: true,
    },
  });
  return serializeConfig(row);
}

export async function getGrowthChatbotConfigForWorkspace(workspaceId: string) {
  const row = await prisma.growthChatbotConfig.findFirst({
    where: { workspaceId, botKey: GROWTH_QUALIFICATION_BOT_KEY, isActive: true },
  });
  if (!row) return null;
  return serializeConfig(row);
}

export async function getGrowthChatbotByTenantSlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return null;

  const workspace = await prisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
  if (!workspace) return null;

  const config = await ensureGrowthChatbotConfig(tenant.id, workspace.id);
  if (!config.isActive) return null;

  return { tenant: { id: tenant.id, slug: tenant.slug }, workspaceId: workspace.id, config };
}

export async function listGrowthChatbotConfigs(tenantId: string, workspaceId: string) {
  await ensureGrowthChatbotConfig(tenantId, workspaceId);
  const rows = await prisma.growthChatbotConfig.findMany({
    where: { tenantId, workspaceId },
    orderBy: { botKey: "asc" },
  });
  return rows.map(serializeConfig);
}
