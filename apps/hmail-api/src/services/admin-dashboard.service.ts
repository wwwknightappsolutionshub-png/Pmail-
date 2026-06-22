import { prisma } from "../lib/prisma.js";
import { getReadiness } from "./health.service.js";
import { getMarketingLeadStats } from "./marketing-leads.service.js";

export async function getAdminDashboard() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    tenantCount,
    activeTenantCount,
    mailUserCount,
    activeMailUserCount,
    hostingAccountCount,
    suspendedHostingCount,
    hostingPlanCount,
    addonCount,
    activeAddonTrials,
    activeAddonSubscriptions,
    vpsCount,
    runningVpsCount,
    platformAdminCount,
    recentTenants,
    recentHostingAccounts,
    recentAuditLogs,
    tenantsCreatedThisWeek,
    hostingCreatedThisWeek,
    leadStats,
    readiness,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.hostingAccount.count(),
    prisma.hostingAccount.count({ where: { isSuspended: true } }),
    prisma.hostingPlan.count({ where: { isActive: true } }),
    prisma.addon.count({ where: { isActive: true } }),
    prisma.tenantAddonTrial.count({ where: { status: "active", endsAt: { gt: now } } }),
    prisma.tenantAddonSubscription.count({ where: { status: "active" } }),
    prisma.vpsInstance.count(),
    prisma.vpsInstance.count({ where: { status: "running", isActive: true } }),
    prisma.platformAdmin.count({ where: { isActive: true } }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, slug: true, name: true, isActive: true, createdAt: true },
    }),
    prisma.hostingAccount.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        username: true,
        domain: true,
        isSuspended: true,
        createdAt: true,
        tenant: { select: { slug: true, name: true } },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { admin: { select: { email: true, name: true } } },
    }),
    prisma.tenant.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.hostingAccount.count({ where: { createdAt: { gte: weekAgo } } }),
    getMarketingLeadStats(),
    getReadiness(),
  ]);

  return {
    summary: {
      tenants: { total: tenantCount, active: activeTenantCount, createdThisWeek: tenantsCreatedThisWeek },
      mailUsers: { total: mailUserCount, active: activeMailUserCount },
      hosting: {
        accounts: hostingAccountCount,
        suspended: suspendedHostingCount,
        plans: hostingPlanCount,
        createdThisWeek: hostingCreatedThisWeek,
      },
      addons: {
        catalog: addonCount,
        activeTrials: activeAddonTrials,
        activeSubscriptions: activeAddonSubscriptions,
      },
      vps: { total: vpsCount, running: runningVpsCount },
      platformAdmins: platformAdminCount,
      leads: {
        total: leadStats.total,
        newThisWeek: leadStats.newThisWeek,
        qualifiedUnconverted: leadStats.qualifiedUnconverted,
        conversionRate: leadStats.conversionRate,
        funnel: leadStats.funnel,
      },
    },
    health: {
      status: readiness.status,
      uptimeSeconds: readiness.uptimeSeconds,
      databaseOk: readiness.checks.database?.ok ?? false,
    },
    alerts: [
      ...(leadStats.funnel.new > 0
        ? [{ level: "info" as const, message: `${leadStats.funnel.new} new lead(s) awaiting contact` }]
        : []),
      ...(leadStats.qualifiedUnconverted > 0
        ? [{ level: "warning" as const, message: `${leadStats.qualifiedUnconverted} qualified lead(s) ready to convert` }]
        : []),
      ...(suspendedHostingCount > 0
        ? [{ level: "warning" as const, message: `${suspendedHostingCount} hosting account(s) suspended` }]
        : []),
      ...(readiness.status !== "ready"
        ? [{ level: "error" as const, message: "Platform readiness degraded — review system status" }]
        : []),
    ],
    recentTenants: recentTenants.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    recentHostingAccounts: recentHostingAccounts.map((a) => ({
      id: a.id,
      loginId: `${a.username}@${a.domain}`,
      isSuspended: a.isSuspended,
      tenant: a.tenant,
      createdAt: a.createdAt.toISOString(),
    })),
    recentActivity: recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
      admin: log.admin,
    })),
  };
}
