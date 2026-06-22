import { prisma } from "../lib/prisma.js";

export const GROWTH_DEFAULT_PIPELINE_STAGES = [
  { slug: "new", label: "New", sortOrder: 0, isClosed: false },
  { slug: "contacted", label: "Contacted", sortOrder: 1, isClosed: false },
  { slug: "qualified", label: "Qualified", sortOrder: 2, isClosed: false },
  { slug: "appointment", label: "Appointment", sortOrder: 3, isClosed: false },
  { slug: "proposal", label: "Proposal", sortOrder: 4, isClosed: false },
  { slug: "won", label: "Won", sortOrder: 5, isClosed: true },
  { slug: "lost", label: "Lost", sortOrder: 6, isClosed: true },
] as const;

function formatStage(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  slug: string;
  label: string;
  sortOrder: number;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sortOrder,
    isClosed: row.isClosed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureGrowthPipelineStages(tenantId: string, workspaceId: string) {
  const count = await prisma.growthPipelineStage.count({ where: { workspaceId } });
  if (count > 0) return;

  await prisma.growthPipelineStage.createMany({
    data: GROWTH_DEFAULT_PIPELINE_STAGES.map((stage) => ({
      tenantId,
      workspaceId,
      ...stage,
    })),
  });
}

export async function listGrowthPipelineStages(tenantId: string, workspaceId: string) {
  await ensureGrowthPipelineStages(tenantId, workspaceId);
  const rows = await prisma.growthPipelineStage.findMany({
    where: { tenantId, workspaceId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(formatStage);
}

export async function isValidGrowthStageSlug(
  tenantId: string,
  workspaceId: string,
  stageSlug: string,
): Promise<boolean> {
  await ensureGrowthPipelineStages(tenantId, workspaceId);
  const row = await prisma.growthPipelineStage.findFirst({
    where: { tenantId, workspaceId, slug: stageSlug },
  });
  return Boolean(row);
}

export async function getGrowthPipelineBoard(tenantId: string, workspaceId: string) {
  const stages = await listGrowthPipelineStages(tenantId, workspaceId);
  const leads = await prisma.growthLead.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
  });

  const leadsByStage: Record<string, typeof leads> = {};
  for (const stage of stages) {
    leadsByStage[stage.slug] = [];
  }
  for (const lead of leads) {
    if (!leadsByStage[lead.stageSlug]) leadsByStage[lead.stageSlug] = [];
    leadsByStage[lead.stageSlug].push(lead);
  }

  return {
    stages,
    leadsByStage: Object.fromEntries(
      stages.map((stage) => [
        stage.slug,
        (leadsByStage[stage.slug] ?? []).map((lead) => ({
          id: lead.id,
          fullName: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          message: lead.message,
          source: lead.source,
          sourcePage: lead.sourcePage,
          score: lead.score,
          status: lead.status,
          stageSlug: lead.stageSlug,
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
        })),
      ]),
    ),
  };
}
