import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { GrowthAnalyticsEventType } from "../growth/analytics-events.js";
import { isGrowthAnalyticsEventType } from "../growth/analytics-events.js";

export async function recordGrowthAnalyticsEvent(input: {
  tenantId: string;
  workspaceId: string;
  eventType: GrowthAnalyticsEventType;
  sourcePage?: string;
  path?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isGrowthAnalyticsEventType(input.eventType)) {
    throw new Error(`Invalid analytics event type: ${input.eventType}`);
  }

  await prisma.growthAnalyticsEvent.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      eventType: input.eventType,
      sourcePage: input.sourcePage?.trim() || null,
      path: input.path?.trim() || null,
      utmSource: input.utmSource?.trim() || null,
      utmMedium: input.utmMedium?.trim() || null,
      utmCampaign: input.utmCampaign?.trim() || null,
      referrer: input.referrer?.trim() || null,
      metadataJson: JSON.stringify(input.metadata ?? {}),
    },
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getGrowthAnalyticsDashboard(
  tenantId: string,
  workspaceId: string,
  days = 30,
) {
  const { assertGrowthAnalyticsAccess } = await import("./growth-plan.service.js");
  await assertGrowthAnalyticsAccess(tenantId, workspaceId);

  const rangeDays = Math.min(Math.max(days, 7), 90);
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const [events, leads] = await Promise.all([
    prisma.growthAnalyticsEvent.findMany({
      where: { tenantId, workspaceId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.growthLead.findMany({
      where: { tenantId, workspaceId, createdAt: { gte: since } },
      select: {
        id: true,
        source: true,
        sourcePage: true,
        createdAt: true,
        attributionJson: true,
      },
    }),
  ]);

  const totals = {
    pageViews: 0,
    formSubmits: 0,
    chatOpens: 0,
    chatCompletes: 0,
    leads: leads.length,
  };

  const bySourcePage: Record<string, { pageViews: number; leads: number }> = {};
  const byUtmSource: Record<string, number> = {};
  const referrerCounts: Record<string, number> = {};
  const dailyMap = new Map<string, { pageViews: number; leads: number }>();

  for (let i = 0; i < rangeDays; i += 1) {
    const day = formatDayKey(new Date(Date.now() - (rangeDays - 1 - i) * 24 * 60 * 60 * 1000));
    dailyMap.set(day, { pageViews: 0, leads: 0 });
  }

  for (const event of events) {
    if (event.eventType === "page_view") totals.pageViews += 1;
    if (event.eventType === "form_submit") totals.formSubmits += 1;
    if (event.eventType === "chat_open") totals.chatOpens += 1;
    if (event.eventType === "chat_complete") totals.chatCompletes += 1;

    const pageKey = event.sourcePage ?? "unknown";
    if (!bySourcePage[pageKey]) bySourcePage[pageKey] = { pageViews: 0, leads: 0 };
    if (event.eventType === "page_view") bySourcePage[pageKey].pageViews += 1;

    if (event.utmSource) {
      byUtmSource[event.utmSource] = (byUtmSource[event.utmSource] ?? 0) + 1;
    }
    if (event.referrer) {
      referrerCounts[event.referrer] = (referrerCounts[event.referrer] ?? 0) + 1;
    }

    const day = formatDayKey(startOfDay(event.createdAt));
    const bucket = dailyMap.get(day);
    if (bucket && event.eventType === "page_view") bucket.pageViews += 1;
  }

  for (const lead of leads) {
    const pageKey = lead.sourcePage ?? "unknown";
    if (!bySourcePage[pageKey]) bySourcePage[pageKey] = { pageViews: 0, leads: 0 };
    bySourcePage[pageKey].leads += 1;

    let utmSource: string | undefined;
    try {
      const attribution = JSON.parse(lead.attributionJson) as Record<string, unknown>;
      const raw = attribution.utm_source ?? attribution.utmSource;
      if (typeof raw === "string" && raw.trim()) utmSource = raw.trim();
    } catch {
      utmSource = undefined;
    }
    if (utmSource) byUtmSource[utmSource] = (byUtmSource[utmSource] ?? 0) + 1;

    const day = formatDayKey(startOfDay(lead.createdAt));
    const bucket = dailyMap.get(day);
    if (bucket) bucket.leads += 1;
  }

  const conversionRate =
    totals.pageViews > 0 ? Math.round((totals.leads / totals.pageViews) * 1000) / 10 : 0;

  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([referrer, count]) => ({ referrer, count }));

  return {
    rangeDays,
    since: since.toISOString(),
    totals,
    funnel: {
      pageViews: totals.pageViews,
      formSubmits: totals.formSubmits,
      chatCompletes: totals.chatCompletes,
      leads: totals.leads,
      conversionRate,
    },
    bySourcePage,
    byUtmSource,
    daily: Array.from(dailyMap.entries()).map(([date, counts]) => ({ date, ...counts })),
    topReferrers,
    leadsBySource: leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
