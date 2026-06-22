import { prisma } from "../lib/prisma.js";
import { getBillingLifecycleSummary } from "./billing-lifecycle.service.js";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDayBuckets(days: number) {
  const buckets: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push(dayKey(d));
  }
  return buckets;
}

function countByDay(dates: Date[], days: number) {
  const keys = buildDayBuckets(days);
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const date of dates) {
    const k = dayKey(date);
    if (k in counts) counts[k]++;
  }
  return keys.map((date) => ({ date, count: counts[date] }));
}

function revenueByDay(
  rows: { completedAt: Date | null; amountCents: number }[],
  days: number,
) {
  const keys = buildDayBuckets(days);
  const totals = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const row of rows) {
    if (!row.completedAt) continue;
    const k = dayKey(row.completedAt);
    if (k in totals) totals[k] += row.amountCents;
  }
  return keys.map((date) => ({ date, revenueCents: totals[date] }));
}

export async function getAdminTrends(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [tenants, leads, accounts, checkouts] = await Promise.all([
    prisma.tenant.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.marketingLead.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.hostingAccount.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.paymentCheckout.findMany({
      where: { status: "completed", completedAt: { gte: since } },
      select: { completedAt: true, amountCents: true },
    }),
  ]);

  return {
    days,
    tenants: countByDay(
      tenants.map((t) => t.createdAt),
      days,
    ),
    leads: countByDay(
      leads.map((l) => l.createdAt),
      days,
    ),
    hostingAccounts: countByDay(
      accounts.map((a) => a.createdAt),
      days,
    ),
    revenue: revenueByDay(checkouts, days),
  };
}

export async function getBillingRevenueDashboard() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    activeHostingSubs,
    activeAddonSubs,
    lifetimeAgg,
    last30Agg,
    recentPayments,
    billing,
  ] = await Promise.all([
    prisma.hostingPlanSubscription.findMany({
      where: { status: "active" },
      include: { hostingPlan: { select: { priceCents: true, name: true, slug: true } } },
    }),
    prisma.tenantAddonSubscription.findMany({
      where: { status: "active" },
      include: { addon: { select: { priceCents: true, name: true, slug: true } } },
    }),
    prisma.paymentCheckout.aggregate({
      where: { status: "completed" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentCheckout.aggregate({
      where: { status: "completed", completedAt: { gte: thirtyDaysAgo } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.paymentCheckout.findMany({
      where: { status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        productName: true,
        productSlug: true,
        amountCents: true,
        currency: true,
        customerEmail: true,
        completedAt: true,
        provider: true,
      },
    }),
    getBillingLifecycleSummary(),
  ]);

  const hostingMrrCents = activeHostingSubs.reduce((sum, s) => sum + s.hostingPlan.priceCents, 0);
  const addonMrrCents = activeAddonSubs.reduce((sum, s) => sum + s.addon.priceCents, 0);

  return {
    mrrCents: hostingMrrCents + addonMrrCents,
    hostingMrrCents,
    addonMrrCents,
    activeHostingSubscriptions: activeHostingSubs.length,
    activeAddonSubscriptions: activeAddonSubs.length,
    lifetimeRevenueCents: lifetimeAgg._sum.amountCents ?? 0,
    lifetimeOrders: lifetimeAgg._count,
    last30RevenueCents: last30Agg._sum.amountCents ?? 0,
    last30Orders: last30Agg._count,
    billing,
    topHostingPlans: summarizePlanMrr(activeHostingSubs),
    topAddons: summarizeAddonMrr(activeAddonSubs),
    recentPayments: recentPayments.map((p) => ({
      ...p,
      completedAt: p.completedAt?.toISOString() ?? null,
    })),
  };
}

function summarizePlanMrr(
  subs: Array<{ hostingPlan: { slug: string; name: string; priceCents: number } }>,
) {
  const map = new Map<string, { name: string; count: number; mrrCents: number }>();
  for (const sub of subs) {
    const cur = map.get(sub.hostingPlan.slug) ?? {
      name: sub.hostingPlan.name,
      count: 0,
      mrrCents: 0,
    };
    cur.count++;
    cur.mrrCents += sub.hostingPlan.priceCents;
    map.set(sub.hostingPlan.slug, cur);
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.mrrCents - a.mrrCents);
}

function summarizeAddonMrr(subs: Array<{ addon: { slug: string; name: string; priceCents: number } }>) {
  const map = new Map<string, { name: string; count: number; mrrCents: number }>();
  for (const sub of subs) {
    const cur = map.get(sub.addon.slug) ?? { name: sub.addon.name, count: 0, mrrCents: 0 };
    cur.count++;
    cur.mrrCents += sub.addon.priceCents;
    map.set(sub.addon.slug, cur);
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.mrrCents - a.mrrCents);
}
