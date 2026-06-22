import { getMarketingLeadStats } from "./marketing-leads.service.js";
import { getMembershipStats } from "./membership.service.js";
import { getInquiryStats } from "./inquiry.service.js";
import { prisma } from "../lib/prisma.js";

export async function getSalesPipelineOverview() {
  const [leadStats, membershipStats, inquiryStats, recentMembership, recentInquiries, recentLeads] =
    await Promise.all([
      getMarketingLeadStats(),
      getMembershipStats(),
      getInquiryStats(),
      prisma.membershipApplication.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.inquirySubmission.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.marketingLead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return {
    leads: leadStats,
    membership: membershipStats,
    inquiries: inquiryStats,
    recent: {
      membership: recentMembership.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        workEmail: r.workEmail,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      inquiries: recentInquiries.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      leads: recentLeads.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  };
}

export async function getSalesPipelineTrends(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [membership, inquiries, leads] = await Promise.all([
    prisma.membershipApplication.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, hostingScale: true },
    }),
    prisma.inquirySubmission.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.marketingLead.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true },
    }),
  ]);

  const byDay = new Map<string, { membership: number; inquiries: number; leads: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    byDay.set(d.toISOString().slice(0, 10), { membership: 0, inquiries: 0, leads: 0 });
  }

  for (const row of membership) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.membership += 1;
  }
  for (const row of inquiries) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.inquiries += 1;
  }
  for (const row of leads) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) bucket.leads += 1;
  }

  const hostingScaleMix: Record<string, number> = {};
  for (const row of membership) {
    hostingScaleMix[row.hostingScale] = (hostingScaleMix[row.hostingScale] ?? 0) + 1;
  }

  return {
    days,
    series: [...byDay.entries()].map(([date, counts]) => ({ date, ...counts })),
    hostingScaleMix,
  };
}
