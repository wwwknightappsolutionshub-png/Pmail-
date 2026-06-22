import { getReadiness } from "./health.service.js";
import { getMarketingLeadStats } from "./marketing-leads.service.js";
import { getMembershipStats } from "./membership.service.js";
import { getInquiryStats } from "./inquiry.service.js";

export async function getAdminPollSnapshot() {
  const [readiness, leadStats, membershipStats, inquiryStats] = await Promise.all([
    getReadiness(),
    getMarketingLeadStats(),
    getMembershipStats(),
    getInquiryStats(),
  ]);

  const salesPipelinePending =
    leadStats.funnel.new + membershipStats.demoSent + inquiryStats.open;

  return {
    polledAt: new Date().toISOString(),
    health: {
      status: readiness.status,
      uptimeSeconds: readiness.uptimeSeconds,
      databaseOk: readiness.checks.database?.ok ?? false,
    },
    leads: {
      newCount: leadStats.funnel.new,
      total: leadStats.total,
      funnel: leadStats.funnel,
      newThisWeek: leadStats.newThisWeek,
    },
    salesPipeline: {
      pendingCount: salesPipelinePending,
      leads: { newCount: leadStats.funnel.new },
      membership: { demoSent: membershipStats.demoSent, newCount: membershipStats.newCount },
      inquiries: { open: inquiryStats.open },
    },
  };
}
