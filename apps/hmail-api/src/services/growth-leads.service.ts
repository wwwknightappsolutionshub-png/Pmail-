import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { queueGrowthLeadNotification } from "./growth-lead-notify.service.js";
import { recordGrowthAnalyticsEvent } from "./growth-analytics.service.js";
import { queueGrowthAutomations } from "./growth-automation-engine.service.js";
import { assertGrowthLeadCapacity } from "./growth-plan.service.js";
import { isValidGrowthStageSlug } from "./growth-pipeline.service.js";

export function computeGrowthLeadScore(input: {
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  source?: string;
  attribution?: Record<string, unknown>;
  formData?: Record<string, string>;
}): number {
  let score = 0;
  if (input.phone?.trim()) score += 10;
  if (input.company?.trim()) score += 10;
  if ((input.message?.trim().length ?? 0) >= 50) score += 15;
  if (input.source === "landing") score += 5;
  if (input.source === "chatbot") score += 10;
  const utm = input.attribution?.utm_source ?? input.attribution?.utmSource;
  if (typeof utm === "string" && utm.trim()) score += 10;
  if (input.formData?.timeline === "ASAP") score += 15;
  if ((input.formData?.need?.trim().length ?? 0) >= 30) score += 10;
  return score;
}

function formatLead(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  stageSlug: string;
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  sourcePage: string | null;
  formDataJson: string;
  attributionJson: string;
  score: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    stageSlug: row.stageSlug,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    company: row.company,
    message: row.message,
    source: row.source,
    sourcePage: row.sourcePage,
    formData: JSON.parse(row.formDataJson) as Record<string, string>,
    attribution: JSON.parse(row.attributionJson) as Record<string, unknown>,
    score: row.score,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function recordLeadActivity(input: {
  tenantId: string;
  workspaceId: string;
  leadId: string;
  activityType: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.growthLeadActivity.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      leadId: input.leadId,
      activityType: input.activityType,
      summary: input.summary,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}

export async function createGrowthLead(input: {
  tenantId: string;
  workspaceId: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source?: string;
  sourcePage?: string;
  formData?: Record<string, string>;
  attribution?: Record<string, unknown>;
  stageSlug?: string;
}) {
  const stageSlug = input.stageSlug ?? "new";
  const valid = await isValidGrowthStageSlug(input.tenantId, input.workspaceId, stageSlug);
  if (!valid) throw new Error(`Invalid pipeline stage: ${stageSlug}`);

  if (input.source !== "manual") {
    await assertGrowthLeadCapacity(input.tenantId, input.workspaceId);
  }

  const score = computeGrowthLeadScore({
    phone: input.phone,
    company: input.company,
    message: input.message,
    source: input.source,
    attribution: input.attribution,
    formData: input.formData,
  });

  const row = await prisma.growthLead.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      stageSlug,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      message: input.message?.trim() || null,
      source: input.source ?? "form",
      sourcePage: input.sourcePage?.trim() || null,
      formDataJson: JSON.stringify(input.formData ?? {}),
      attributionJson: JSON.stringify(input.attribution ?? {}),
      score,
      status: "open",
    },
  });

  await recordLeadActivity({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    leadId: row.id,
    activityType: "created",
    summary: input.source === "manual" ? "Lead added manually" : `Lead captured from ${row.source}`,
    metadata: { sourcePage: row.sourcePage, score },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "lead.created",
    entityType: "growth_lead",
    entityId: row.id,
    metadata: { source: row.source, score },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "lead.captured",
    payload: { leadId: row.id, email: row.email, source: row.source, score },
  });

  const lead = formatLead(row);
  queueGrowthLeadNotification({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    lead,
  });

  if (row.source === "form") {
    const utmSource = input.attribution?.utm_source ?? input.attribution?.utmSource;
    const utmMedium = input.attribution?.utm_medium ?? input.attribution?.utmMedium;
    const utmCampaign = input.attribution?.utm_campaign ?? input.attribution?.utmCampaign;
    const referrer = input.attribution?.referrer;
    await recordGrowthAnalyticsEvent({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      eventType: "form_submit",
      sourcePage: row.sourcePage ?? undefined,
      utmSource: typeof utmSource === "string" ? utmSource : undefined,
      utmMedium: typeof utmMedium === "string" ? utmMedium : undefined,
      utmCampaign: typeof utmCampaign === "string" ? utmCampaign : undefined,
      referrer: typeof referrer === "string" ? referrer : undefined,
      metadata: { leadId: row.id },
    }).catch(() => undefined);
  }

  queueGrowthAutomations({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    triggerType: "lead_created",
    leadId: row.id,
    context: { source: row.source },
  });

  return lead;
}

export async function listGrowthLeads(tenantId: string, workspaceId: string, stageSlug?: string) {
  const rows = await prisma.growthLead.findMany({
    where: {
      tenantId,
      workspaceId,
      ...(stageSlug ? { stageSlug } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(formatLead);
}

export async function getGrowthLead(tenantId: string, workspaceId: string, leadId: string) {
  const row = await prisma.growthLead.findFirst({
    where: { id: leadId, tenantId, workspaceId },
  });
  if (!row) return null;
  return formatLead(row);
}

export async function updateGrowthLeadStage(
  tenantId: string,
  workspaceId: string,
  leadId: string,
  stageSlug: string,
  options?: { skipAutomations?: boolean },
) {
  const valid = await isValidGrowthStageSlug(tenantId, workspaceId, stageSlug);
  if (!valid) throw new Error(`Invalid pipeline stage: ${stageSlug}`);

  const existing = await prisma.growthLead.findFirst({
    where: { id: leadId, tenantId, workspaceId },
  });
  if (!existing) throw new Error("Lead not found");

  const stage = await prisma.growthPipelineStage.findFirst({
    where: { tenantId, workspaceId, slug: stageSlug },
  });

  const row = await prisma.growthLead.update({
    where: { id: leadId },
    data: {
      stageSlug,
      status: stage?.isClosed ? "closed" : "open",
    },
  });

  await recordLeadActivity({
    tenantId,
    workspaceId,
    leadId,
    activityType: "stage_changed",
    summary: `Moved to ${stage?.label ?? stageSlug}`,
    metadata: { from: existing.stageSlug, to: stageSlug },
  });

  await emitGrowthEvent({
    tenantId,
    workspaceId,
    eventType: "lead.stage_changed",
    payload: { leadId, from: existing.stageSlug, to: stageSlug },
  });

  if (!options?.skipAutomations) {
    queueGrowthAutomations({
      tenantId,
      workspaceId,
      triggerType: "stage_changed",
      leadId,
      context: { fromStage: existing.stageSlug, toStage: stageSlug, source: existing.source },
    });
  }

  return formatLead(row);
}

export async function updateGrowthLead(
  tenantId: string,
  workspaceId: string,
  leadId: string,
  input: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    company?: string | null;
    message?: string | null;
  },
) {
  const existing = await prisma.growthLead.findFirst({
    where: { id: leadId, tenantId, workspaceId },
  });
  if (!existing) throw new Error("Lead not found");

  const fullName = input.fullName?.trim() ?? existing.fullName;
  const email = input.email?.trim().toLowerCase() ?? existing.email;
  const phone =
    input.phone === undefined ? existing.phone : input.phone?.trim() || null;
  const company =
    input.company === undefined ? existing.company : input.company?.trim() || null;
  const message =
    input.message === undefined ? existing.message : input.message?.trim() || null;

  const score = computeGrowthLeadScore({
    phone,
    company,
    message,
    source: existing.source,
    attribution: JSON.parse(existing.attributionJson) as Record<string, unknown>,
  });

  const row = await prisma.growthLead.update({
    where: { id: leadId },
    data: { fullName, email, phone, company, message, score },
  });

  await recordLeadActivity({
    tenantId,
    workspaceId,
    leadId,
    activityType: "updated",
    summary: "Lead details updated",
    metadata: { fields: Object.keys(input) },
  });

  await logGrowthAudit({
    tenantId,
    workspaceId,
    action: "lead.updated",
    entityType: "growth_lead",
    entityId: leadId,
  });

  return formatLead(row);
}

export async function getGrowthLeadStats(tenantId: string, workspaceId: string) {
  const leads = await prisma.growthLead.findMany({
    where: { tenantId, workspaceId },
    select: { stageSlug: true, score: true, status: true, createdAt: true },
  });

  const byStage: Record<string, number> = {};
  let totalScore = 0;
  for (const lead of leads) {
    byStage[lead.stageSlug] = (byStage[lead.stageSlug] ?? 0) + 1;
    totalScore += lead.score;
  }

  const last7Days = leads.filter(
    (lead) => lead.createdAt.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).length;

  return {
    totalLeads: leads.length,
    openLeads: leads.filter((l) => l.status === "open").length,
    last7Days,
    averageScore: leads.length ? Math.round(totalScore / leads.length) : 0,
    byStage,
  };
}

export async function listGrowthLeadActivities(tenantId: string, workspaceId: string, leadId: string) {
  const rows = await prisma.growthLeadActivity.findMany({
    where: { tenantId, workspaceId, leadId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    activityType: row.activityType,
    summary: row.summary,
    metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  }));
}
