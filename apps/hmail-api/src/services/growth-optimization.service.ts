import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { getGrowthAnalyticsDashboard } from "./growth-analytics.service.js";
import { getGrowthPlanSnapshot, assertGrowthAnalyticsAccess } from "./growth-plan.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import {
  generateAiOptimizationInsights,
  getLatestWeeklyBrief,
  storeWeeklyBrief,
} from "./growth-optimization-llm.service.js";

export type OptimizationInsightDraft = {
  category: string;
  priority: "high" | "medium" | "low";
  title: string;
  summary: string;
  actionLabel?: string;
  actionTarget?: string;
  metrics?: Record<string, unknown>;
};

function formatInsight(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  category: string;
  priority: string;
  title: string;
  summary: string;
  actionLabel: string | null;
  actionTarget: string | null;
  metricsJson: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    category: row.category,
    priority: row.priority,
    title: row.title,
    summary: row.summary,
    actionLabel: row.actionLabel,
    actionTarget: row.actionTarget,
    metrics: JSON.parse(row.metricsJson) as Record<string, unknown>,
    status: row.status,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildInsightDrafts(input: {
  dashboard: Awaited<ReturnType<typeof getGrowthAnalyticsDashboard>>;
  plan: Awaited<ReturnType<typeof getGrowthPlanSnapshot>>;
  publishedCount: number;
  blogCount: number;
}): OptimizationInsightDraft[] {
  const drafts: OptimizationInsightDraft[] = [];
  const { dashboard, plan, publishedCount, blogCount } = input;
  const conversion = dashboard.funnel.conversionRate;

  if (dashboard.totals.pageViews >= 10 && conversion < 2) {
    drafts.push({
      category: "conversion",
      priority: "high",
      title: "Conversion rate is below 2%",
      summary: `You had ${dashboard.totals.pageViews} page views but only ${dashboard.totals.leads} leads (${conversion}% conversion). Strengthen your homepage headline and add a chatbot prompt above the fold.`,
      actionLabel: "Review chatbot",
      actionTarget: "/growth/chatbot",
      metrics: { conversionRate: conversion, pageViews: dashboard.totals.pageViews, leads: dashboard.totals.leads },
    });
  }

  if (dashboard.totals.chatOpens >= 3 && dashboard.totals.chatCompletes < dashboard.totals.chatOpens * 0.5) {
    drafts.push({
      category: "conversion",
      priority: "high",
      title: "Chatbot drop-off is high",
      summary: `${dashboard.totals.chatOpens} chats started but only ${dashboard.totals.chatCompletes} completed. Shorten qualification questions or move email capture earlier.`,
      actionLabel: "Open chatbot",
      actionTarget: "/growth/chatbot",
      metrics: { chatOpens: dashboard.totals.chatOpens, chatCompletes: dashboard.totals.chatCompletes },
    });
  }

  if (dashboard.totals.pageViews >= 5 && Object.keys(dashboard.byUtmSource).length === 0) {
    drafts.push({
      category: "traffic",
      priority: "medium",
      title: "Add UTM tags to outbound links",
      summary: "No UTM attribution detected yet. Tag email signatures, social posts, and ads with utm_source so Analytics shows which channels drive leads.",
      actionLabel: "View analytics",
      actionTarget: "/growth/analytics",
    });
  }

  const topPages = Object.entries(dashboard.bySourcePage).sort((a, b) => b[1].pageViews - a[1].pageViews);
  const highTrafficLowLead = topPages.find(([, stats]) => stats.pageViews >= 5 && stats.leads === 0);
  if (highTrafficLowLead) {
    drafts.push({
      category: "content",
      priority: "medium",
      title: `Improve capture on "${highTrafficLowLead[0]}"`,
      summary: `This page has ${highTrafficLowLead[1].pageViews} views but zero leads. Add a stronger CTA, social proof, or move the capture form higher on the page.`,
      actionLabel: "Open content studio",
      actionTarget: "/growth/studio",
      metrics: { sourcePage: highTrafficLowLead[0], pageViews: highTrafficLowLead[1].pageViews },
    });
  }

  if (publishedCount === 0 && plan.usage.publishedPages === 0) {
    drafts.push({
      category: "content",
      priority: "high",
      title: "Publish your day-one bundle",
      summary: "Your content bundle is ready but nothing is live on public_html yet. Publish homepage and top blog posts to start collecting analytics and leads.",
      actionLabel: "Publish content",
      actionTarget: "/growth/dashboard",
    });
  }

  if (blogCount >= 5 && publishedCount < 3) {
    drafts.push({
      category: "content",
      priority: "medium",
      title: "Publish more blog posts for SEO",
      summary: `You have ${blogCount} blog drafts but only ${publishedCount} published pages. Publishing 3–5 posts unlocks long-tail search traffic.`,
      actionLabel: "Content studio",
      actionTarget: "/growth/studio",
    });
  }

  if (plan.usage.leadsThisMonth >= plan.limits.leadsPerMonth * 0.8) {
    drafts.push({
      category: "plan",
      priority: "high",
      title: "Approaching monthly lead limit",
      summary: `${plan.usage.leadsThisMonth} of ${plan.limits.leadsPerMonth} leads used this month. Upgrade to Pro before capture forms stop accepting submissions.`,
      actionLabel: "Upgrade plan",
      actionTarget: "/growth/settings",
      metrics: { leadsUsed: plan.usage.leadsThisMonth, leadLimit: plan.limits.leadsPerMonth },
    });
  }

  if (!plan.limits.analytics) {
    drafts.push({
      category: "plan",
      priority: "medium",
      title: "Unlock analytics & optimization",
      summary: "Upgrade to Pro to see funnel metrics, UTM breakdowns, and automated weekly optimization recommendations.",
      actionLabel: "Upgrade to Pro",
      actionTarget: "/growth/settings",
    });
  }

  if (dashboard.totals.leads >= 3 && (dashboard.leadsBySource.form ?? 0) < dashboard.totals.leads * 0.3) {
    drafts.push({
      category: "automation",
      priority: "low",
      title: "Diversify lead sources",
      summary: "Most leads are not coming from forms. Promote your chatbot on service pages and ensure capture forms are embedded on every published landing page.",
      actionLabel: "Pipeline",
      actionTarget: "/growth/pipeline",
      metrics: dashboard.leadsBySource,
    });
  }

  if (drafts.length === 0) {
    drafts.push({
      category: "general",
      priority: "low",
      title: "Keep momentum — you're on track",
      summary: "Traffic and capture look healthy for this stage. Check back after more page views or run Refresh to regenerate tips as data grows.",
      actionLabel: "View dashboard",
      actionTarget: "/growth/dashboard",
    });
  }

  return drafts;
}

export async function refreshGrowthOptimizationInsights(
  tenantId: string,
  workspaceId: string,
  options?: { skipAccessCheck?: boolean },
) {
  if (!options?.skipAccessCheck) {
    await assertGrowthAnalyticsAccess(tenantId, workspaceId);
  }
  const plan = await getGrowthPlanSnapshot(tenantId, workspaceId);

  let dashboard: Awaited<ReturnType<typeof getGrowthAnalyticsDashboard>> | null = null;
  if (plan.limits.analytics) {
    try {
      dashboard = await getGrowthAnalyticsDashboard(tenantId, workspaceId, 30);
    } catch {
      dashboard = null;
    }
  }

  if (!dashboard) {
    dashboard = {
      rangeDays: 30,
      since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      totals: { pageViews: 0, formSubmits: 0, chatOpens: 0, chatCompletes: 0, leads: plan.usage.leadsThisMonth },
      funnel: {
        pageViews: 0,
        formSubmits: 0,
        chatCompletes: 0,
        leads: plan.usage.leadsThisMonth,
        conversionRate: 0,
      },
      bySourcePage: {},
      byUtmSource: {},
      daily: [],
      topReferrers: [],
      leadsBySource: {},
    };
  }

  const assets = await prisma.growthContentAsset.findMany({
    where: { tenantId, workspaceId },
    select: { assetType: true, bodyJson: true },
  });

  let publishedCount = 0;
  let blogCount = 0;
  for (const asset of assets) {
    if (asset.assetType === "blog_post") blogCount += 1;
    try {
      const body = JSON.parse(asset.bodyJson) as { publish?: { publishedAt?: string } };
      if (body.publish?.publishedAt) publishedCount += 1;
    } catch {
      // ignore
    }
  }

  const ruleDrafts = buildInsightDrafts({ dashboard, plan, publishedCount, blogCount });

  const aiResult = await generateAiOptimizationInsights({
    tenantId,
    workspaceId,
    ruleDrafts,
    analyticsJson: dashboard as unknown as Record<string, unknown>,
    planJson: {
      planSlug: plan.planSlug,
      limits: plan.limits,
      usage: plan.usage,
    },
    contentStats: { publishedCount, blogCount },
  });

  const mergedDrafts: OptimizationInsightDraft[] = [
    ...ruleDrafts.map((d) => ({ ...d, metrics: { ...(d.metrics ?? {}), source: "rule" } })),
  ];
  for (const aiDraft of aiResult.insights) {
    const duplicate = mergedDrafts.some(
      (d) => d.title.toLowerCase() === aiDraft.title.toLowerCase(),
    );
    if (!duplicate) mergedDrafts.push(aiDraft);
  }

  if (aiResult.weeklyBrief) {
    await storeWeeklyBrief({
      tenantId,
      workspaceId,
      briefMarkdown: aiResult.weeklyBrief,
      insightCount: mergedDrafts.length,
    });
  }

  const drafts = mergedDrafts;

  await prisma.growthOptimizationInsight.deleteMany({
    where: { tenantId, workspaceId, status: "open" },
  });

  const created = [];
  for (const [index, draft] of drafts.entries()) {
    const row = await prisma.growthOptimizationInsight.create({
      data: {
        id: randomUUID(),
        tenantId,
        workspaceId,
        category: draft.category,
        priority: draft.priority,
        title: draft.title,
        summary: draft.summary,
        actionLabel: draft.actionLabel ?? null,
        actionTarget: draft.actionTarget ?? null,
        metricsJson: JSON.stringify(draft.metrics ?? {}),
        sortOrder: index,
      },
    });
    created.push(formatInsight(row));
  }

  await logGrowthAudit({
    tenantId,
    workspaceId,
    action: "optimization.refreshed",
    entityType: "growth_optimization",
    entityId: workspaceId,
    metadata: { insightCount: created.length },
  });

  await emitGrowthEvent({
    tenantId,
    workspaceId,
    eventType: "optimization.refreshed",
    payload: { insightCount: created.length },
  });

  return created;
}

export async function listGrowthOptimizationInsights(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthOptimizationInsight.findMany({
    where: { tenantId, workspaceId, status: { not: "dismissed" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(formatInsight);
}

export async function dismissGrowthOptimizationInsight(
  tenantId: string,
  workspaceId: string,
  insightId: string,
) {
  await assertGrowthAnalyticsAccess(tenantId, workspaceId);
  const row = await prisma.growthOptimizationInsight.findFirst({
    where: { id: insightId, tenantId, workspaceId },
  });
  if (!row) throw new Error("Insight not found");

  const updated = await prisma.growthOptimizationInsight.update({
    where: { id: insightId },
    data: { status: "dismissed" },
  });
  return formatInsight(updated);
}

export async function getGrowthOptimizationSummary(tenantId: string, workspaceId: string) {
  await assertGrowthAnalyticsAccess(tenantId, workspaceId);
  const insights = await listGrowthOptimizationInsights(tenantId, workspaceId);
  const highPriority = insights.filter((i) => i.priority === "high").length;
  const weeklyBrief = await getLatestWeeklyBrief(workspaceId);
  const aiInsightCount = insights.filter((i) => i.metrics?.source === "ai").length;
  return {
    insightCount: insights.length,
    highPriorityCount: highPriority,
    aiInsightCount,
    weeklyBrief,
    insights,
  };
}
