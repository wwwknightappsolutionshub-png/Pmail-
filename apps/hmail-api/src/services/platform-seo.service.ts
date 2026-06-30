import { prisma } from "../lib/prisma.js";
import { listPublishedAddonMarketing } from "./addon-marketing.service.js";
import { listPublishedSections } from "./cms.service.js";
import { listPublicHostingPlans } from "./hosting-plans.service.js";
import { countPublishedArticlesSince } from "./platform-marketing-article.service.js";
import { buildGscOverviewUrl, syncPlatformGscAnalytics } from "./platform-gsc.service.js";
import { listPublicSitemapPaths, resolvePublicSiteOrigin } from "./public-sitemap.service.js";

export type SeoTaskSeverity = "critical" | "warning" | "info" | "ok";
export type SeoTaskCadence = "weekly" | "monthly" | "once";

const DEFAULT_TASKS: Array<{
  taskKey: string;
  title: string;
  description: string;
  cadence: SeoTaskCadence;
  severity: SeoTaskSeverity;
}> = [
  {
    taskKey: "hero_meta",
    title: "Set home page SEO title and description",
    description: "Edit the Hero section SEO fields so search results show a compelling snippet for prohost.cloud.",
    cadence: "weekly",
    severity: "critical",
  },
  {
    taskKey: "gsc_verify",
    title: "Verify domain in Google Search Console",
    description: "Add the site property and confirm VITE_GOOGLE_SITE_VERIFICATION is set before production builds.",
    cadence: "once",
    severity: "critical",
  },
  {
    taskKey: "submit_sitemap",
    title: "Submit sitemap in Search Console",
    description: "Submit https://prohost.cloud/sitemap.xml after each major catalog or blog update.",
    cadence: "monthly",
    severity: "warning",
  },
  {
    taskKey: "publish_blog",
    title: "Publish or refresh a blog article",
    description: "Consistent resources content helps rankings for hosting and PMail+ keywords.",
    cadence: "weekly",
    severity: "warning",
  },
  {
    taskKey: "featured_addons",
    title: "Feature key add-ons on the marketing site",
    description: "Mark high-value PMail+ add-ons as landing featured so they appear in /addons and the sitemap.",
    cadence: "weekly",
    severity: "info",
  },
  {
    taskKey: "hosting_catalog",
    title: "Review hosting plan catalog copy",
    description: "Ensure active plans have clear names, slugs, and taglines for /hosting pages.",
    cadence: "monthly",
    severity: "info",
  },
  {
    taskKey: "internal_links",
    title: "Add internal links from home to key pages",
    description: "Link to /hosting, /addons, /use-case, and recent /blog articles from landing sections.",
    cadence: "monthly",
    severity: "info",
  },
  {
    taskKey: "social_profiles",
    title: "Configure social profile URLs",
    description: "Set VITE_SOCIAL_PROFILE_URLS for Organization schema sameAs links.",
    cadence: "once",
    severity: "info",
  },
];

function serializeSettings(row: {
  id: string;
  siteUrl: string;
  gscPropertyUrl: string | null;
  gscConnectedAt: Date | null;
  ga4MeasurementId: string | null;
  bingSiteVerification: string | null;
  defaultLocale: string;
  alternateLocales: string | null;
  lastWeeklyScanAt: Date | null;
  lastMonthlyScanAt: Date | null;
  gscRefreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const hasGscToken =
    Boolean(row.gscRefreshToken?.trim()) || Boolean(process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?.trim());
  return {
    id: row.id,
    siteUrl: row.siteUrl,
    gscPropertyUrl: row.gscPropertyUrl,
    gscConnectedAt: row.gscConnectedAt?.toISOString() ?? null,
    gscConfigured: hasGscToken,
    ga4MeasurementId: row.ga4MeasurementId,
    bingSiteVerification: row.bingSiteVerification,
    defaultLocale: row.defaultLocale,
    alternateLocales: row.alternateLocales ? (JSON.parse(row.alternateLocales) as string[]) : [],
    lastWeeklyScanAt: row.lastWeeklyScanAt?.toISOString() ?? null,
    lastMonthlyScanAt: row.lastMonthlyScanAt?.toISOString() ?? null,
    gscOverviewUrl: buildGscOverviewUrl(row.gscPropertyUrl),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeTask(row: {
  id: string;
  taskKey: string;
  title: string;
  description: string | null;
  cadence: string;
  severity: string;
  dueAt: Date | null;
  completedAt: Date | null;
  status: string;
  autoDetected: boolean;
  metadataJson: string | null;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    taskKey: row.taskKey,
    title: row.title,
    description: row.description,
    cadence: row.cadence,
    severity: row.severity as SeoTaskSeverity,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    status: row.status,
    autoDetected: row.autoDetected,
    metadata: row.metadataJson ? (JSON.parse(row.metadataJson) as Record<string, unknown>) : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeKeyword(row: {
  id: string;
  keyword: string;
  targetPath: string | null;
  currentPosition: number | null;
  previousPosition: number | null;
  impressions: number | null;
  clicks: number | null;
  lastSyncedAt: Date | null;
  updatedAt: Date;
}) {
  const delta =
    row.currentPosition != null && row.previousPosition != null
      ? Math.round((row.previousPosition - row.currentPosition) * 10) / 10
      : null;
  return {
    id: row.id,
    keyword: row.keyword,
    targetPath: row.targetPath,
    currentPosition: row.currentPosition,
    previousPosition: row.previousPosition,
    positionDelta: delta,
    impressions: row.impressions,
    clicks: row.clicks,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeSnapshot(row: {
  id: string;
  period: string;
  healthScore: number;
  sitemapUrlCount: number;
  avgPosition: number | null;
  totalImpressions: number;
  totalClicks: number;
  issuesJson: string;
  capturedAt: Date;
}) {
  return {
    id: row.id,
    period: row.period,
    healthScore: row.healthScore,
    sitemapUrlCount: row.sitemapUrlCount,
    avgPosition: row.avgPosition,
    totalImpressions: row.totalImpressions,
    totalClicks: row.totalClicks,
    issues: JSON.parse(row.issuesJson) as Array<{ code: string; message: string; severity: SeoTaskSeverity }>,
    capturedAt: row.capturedAt.toISOString(),
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getPlatformSeoSettings() {
  const row =
    (await prisma.platformSeoSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.platformSeoSettings.create({
      data: {
        id: "default",
        siteUrl: resolvePublicSiteOrigin(),
        gscPropertyUrl: "sc-domain:prohost.cloud",
      },
    }));
  return row;
}

export async function getPlatformSeoSettingsPublic() {
  const settings = await getPlatformSeoSettings();
  return serializeSettings(settings);
}

export async function updatePlatformSeoSettings(input: {
  siteUrl?: string;
  gscPropertyUrl?: string | null;
  gscRefreshToken?: string | null;
  ga4MeasurementId?: string | null;
  bingSiteVerification?: string | null;
  defaultLocale?: string;
  alternateLocales?: string[];
}) {
  await getPlatformSeoSettings();
  const row = await prisma.platformSeoSettings.update({
    where: { id: "default" },
    data: {
      ...(input.siteUrl !== undefined ? { siteUrl: input.siteUrl.replace(/\/$/, "") } : {}),
      ...(input.gscPropertyUrl !== undefined ? { gscPropertyUrl: input.gscPropertyUrl?.trim() || null } : {}),
      ...(input.gscRefreshToken !== undefined
        ? {
            gscRefreshToken: input.gscRefreshToken?.trim() || null,
            gscConnectedAt: input.gscRefreshToken?.trim() ? new Date() : null,
          }
        : {}),
      ...(input.ga4MeasurementId !== undefined ? { ga4MeasurementId: input.ga4MeasurementId?.trim() || null } : {}),
      ...(input.bingSiteVerification !== undefined
        ? { bingSiteVerification: input.bingSiteVerification?.trim() || null }
        : {}),
      ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale.trim() || "en-CA" } : {}),
      ...(input.alternateLocales !== undefined
        ? { alternateLocales: JSON.stringify(input.alternateLocales.filter(Boolean)) }
        : {}),
    },
  });
  return serializeSettings(row);
}

export async function seedPlatformSeoTasks() {
  const now = new Date();
  for (const task of DEFAULT_TASKS) {
    const dueAt = task.cadence === "once" ? null : addDays(now, task.cadence === "weekly" ? 7 : 30);
    await prisma.platformSeoTask.upsert({
      where: { taskKey: task.taskKey },
      create: {
        taskKey: task.taskKey,
        title: task.title,
        description: task.description,
        cadence: task.cadence,
        severity: task.severity,
        dueAt,
        status: "pending",
        autoDetected: true,
      },
      update: {},
    });
  }
}

async function upsertDetectedTask(input: {
  taskKey: string;
  title: string;
  description: string;
  severity: SeoTaskSeverity;
  cadence: SeoTaskCadence;
  healthy: boolean;
  metadata?: Record<string, unknown>;
}) {
  const existing = await prisma.platformSeoTask.findUnique({ where: { taskKey: input.taskKey } });
  const now = new Date();
  const dueAt = input.cadence === "once" ? null : addDays(now, input.cadence === "weekly" ? 7 : 30);

  if (input.healthy) {
    if (existing) {
      await prisma.platformSeoTask.update({
        where: { taskKey: input.taskKey },
        data: {
          severity: "ok",
          status: "done",
          completedAt: now,
          dueAt,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    }
    return;
  }

  await prisma.platformSeoTask.upsert({
    where: { taskKey: input.taskKey },
    create: {
      taskKey: input.taskKey,
      title: input.title,
      description: input.description,
      cadence: input.cadence,
      severity: input.severity,
      dueAt,
      status: "pending",
      autoDetected: true,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
    update: {
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "pending",
      completedAt: null,
      dueAt: existing?.dueAt && existing.dueAt < now ? now : dueAt,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

async function checkUrlOk(origin: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin.replace(/\/$/, "")}${path}`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runPlatformSeoScan(period: "weekly" | "monthly" = "weekly") {
  const settings = await getPlatformSeoSettings();
  const origin = settings.siteUrl?.trim() || resolvePublicSiteOrigin();
  const issues: Array<{ code: string; message: string; severity: SeoTaskSeverity }> = [];

  const sections = await listPublishedSections();
  const hero = sections.find((section) => section.sectionKey === "hero");
  const heroMetaOk = Boolean(hero?.metaTitle?.trim() && hero?.metaDescription?.trim());
  if (!heroMetaOk) {
    issues.push({
      code: "hero_meta_missing",
      message: "Hero SEO title or description is empty.",
      severity: "critical",
    });
  }
  await upsertDetectedTask({
    taskKey: "hero_meta",
    title: "Set home page SEO title and description",
    description: "Edit Hero section SEO fields in Landing sections.",
    severity: "critical",
    cadence: "weekly",
    healthy: heroMetaOk,
  });

  const googleVerification = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
  const gscOk = Boolean(googleVerification) || Boolean(settings.gscRefreshToken?.trim());
  if (!gscOk) {
    issues.push({
      code: "gsc_not_verified",
      message: "Google Search Console verification token is not configured.",
      severity: "critical",
    });
  }
  await upsertDetectedTask({
    taskKey: "gsc_verify",
    title: "Verify domain in Google Search Console",
    description: "Set VITE_GOOGLE_SITE_VERIFICATION or connect GSC API refresh token.",
    severity: "critical",
    cadence: "once",
    healthy: gscOk,
  });

  const paths = await listPublicSitemapPaths();
  const sitemapOk = await checkUrlOk(origin, "/sitemap.xml");
  const robotsOk = await checkUrlOk(origin, "/robots.txt");
  if (!sitemapOk) {
    issues.push({ code: "sitemap_unreachable", message: "Sitemap is not reachable.", severity: "critical" });
  }
  if (!robotsOk) {
    issues.push({ code: "robots_unreachable", message: "robots.txt is not reachable.", severity: "warning" });
  }

  const keyPaths = ["/", "/hosting", "/addons", "/use-case", "/blog"];
  for (const path of keyPaths) {
    const ok = await checkUrlOk(origin, path);
    if (!ok) {
      issues.push({
        code: `url_unreachable_${path.replace(/\//g, "_") || "home"}`,
        message: `${path} returned a non-OK response.`,
        severity: path === "/" ? "critical" : "warning",
      });
    }
  }

  const thirtyDaysAgo = addDays(new Date(), -30);
  const recentArticles = await countPublishedArticlesSince(thirtyDaysAgo);
  const blogOk = recentArticles > 0;
  if (!blogOk) {
    issues.push({
      code: "blog_stale",
      message: "No blog articles published in the last 30 days.",
      severity: "warning",
    });
  }
  await upsertDetectedTask({
    taskKey: "publish_blog",
    title: "Publish or refresh a blog article",
    description: "Add resources content under SEO → Articles.",
    severity: "warning",
    cadence: "weekly",
    healthy: blogOk,
    metadata: { recentArticles },
  });

  const addons = await listPublishedAddonMarketing();
  const featuredCount = addons.filter((addon) => addon.landingFeatured).length;
  const featuredOk = featuredCount >= 3;
  if (!featuredOk) {
    issues.push({
      code: "few_featured_addons",
      message: `Only ${featuredCount} add-on(s) are marked landing featured (target: 3+).`,
      severity: "info",
    });
  }
  await upsertDetectedTask({
    taskKey: "featured_addons",
    title: "Feature key add-ons on the marketing site",
    description: "Mark at least 3 high-value add-ons as landing featured.",
    severity: "info",
    cadence: "weekly",
    healthy: featuredOk,
    metadata: { featuredCount },
  });

  const plans = await listPublicHostingPlans();
  const hostingOk = plans.length > 0;
  if (!hostingOk) {
    issues.push({ code: "no_hosting_plans", message: "No active public hosting plans.", severity: "warning" });
  }
  await upsertDetectedTask({
    taskKey: "hosting_catalog",
    title: "Review hosting plan catalog copy",
    description: "Ensure active hosting plans are published.",
    severity: "info",
    cadence: "monthly",
    healthy: hostingOk,
    metadata: { planCount: plans.length },
  });

  const socialOk = Boolean(process.env.VITE_SOCIAL_PROFILE_URLS?.trim());
  await upsertDetectedTask({
    taskKey: "social_profiles",
    title: "Configure social profile URLs",
    description: "Set VITE_SOCIAL_PROFILE_URLS in production .env.",
    severity: "info",
    cadence: "once",
    healthy: socialOk,
  });

  const gsc = await syncPlatformGscAnalytics();
  if (gsc.connected) {
    for (const row of gsc.queryRows.slice(0, 25)) {
      const existing = await prisma.platformSeoKeyword.findUnique({ where: { keyword: row.keyword } });
      await prisma.platformSeoKeyword.upsert({
        where: { keyword: row.keyword },
        create: {
          keyword: row.keyword,
          currentPosition: row.position,
          impressions: row.impressions,
          clicks: row.clicks,
          lastSyncedAt: new Date(),
        },
        update: {
          previousPosition: existing?.currentPosition ?? null,
          currentPosition: row.position,
          impressions: row.impressions,
          clicks: row.clicks,
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const healthScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10);

  const snapshot = await prisma.platformSeoSnapshot.create({
    data: {
      period,
      healthScore,
      sitemapUrlCount: paths.length,
      avgPosition: gsc.avgPosition,
      totalImpressions: gsc.totalImpressions,
      totalClicks: gsc.totalClicks,
      issuesJson: JSON.stringify(issues),
    },
  });

  await prisma.platformSeoSettings.update({
    where: { id: "default" },
    data: period === "weekly" ? { lastWeeklyScanAt: new Date() } : { lastMonthlyScanAt: new Date() },
  });

  return {
    snapshot: serializeSnapshot(snapshot),
    issueCount: issues.length,
    gscConnected: gsc.connected,
  };
}

export async function getPlatformSeoOverview() {
  const [settings, tasks, keywords, weeklySnapshots, monthlySnapshots] = await Promise.all([
    getPlatformSeoSettingsPublic(),
    prisma.platformSeoTask.findMany({ orderBy: [{ severity: "asc" }, { dueAt: "asc" }] }),
    prisma.platformSeoKeyword.findMany({ orderBy: [{ currentPosition: "asc" }, { keyword: "asc" }], take: 25 }),
    prisma.platformSeoSnapshot.findMany({ where: { period: "weekly" }, orderBy: { capturedAt: "desc" }, take: 8 }),
    prisma.platformSeoSnapshot.findMany({ where: { period: "monthly" }, orderBy: { capturedAt: "desc" }, take: 6 }),
  ]);

  const openTasks = tasks.filter((task) => task.status === "pending");
  const actionCount = openTasks.filter((task) => task.severity === "critical" || task.severity === "warning").length;

  const severityRank: Record<string, number> = { critical: 0, warning: 1, info: 2, ok: 3 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusRank = a.status === "pending" && b.status !== "pending" ? -1 : b.status === "pending" && a.status !== "pending" ? 1 : 0;
    if (statusRank !== 0) return statusRank;
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });

  return {
    settings,
    healthScore: weeklySnapshots[0]?.healthScore ?? null,
    actionCount,
    tasks: sortedTasks.map(serializeTask),
    keywords: keywords.map(serializeKeyword),
    weeklySnapshots: weeklySnapshots.map(serializeSnapshot),
    monthlySnapshots: monthlySnapshots.map(serializeSnapshot),
    latestSnapshot: weeklySnapshots[0] ? serializeSnapshot(weeklySnapshots[0]) : null,
  };
}

export async function listPlatformSeoTasks() {
  const rows = await prisma.platformSeoTask.findMany({
    orderBy: [{ status: "asc" }, { severity: "asc" }, { dueAt: "asc" }],
  });
  return rows.map(serializeTask);
}

export async function completePlatformSeoTask(id: string, status: "done" | "skipped" = "done") {
  const existing = await prisma.platformSeoTask.findUnique({ where: { id } });
  if (!existing) throw new Error("Task not found");

  const now = new Date();
  const dueAt =
    existing.cadence === "once"
      ? null
      : addDays(now, existing.cadence === "weekly" ? 7 : 30);

  const row = await prisma.platformSeoTask.update({
    where: { id },
    data: {
      status,
      completedAt: now,
      severity: status === "done" ? "ok" : existing.severity,
      dueAt,
    },
  });
  return serializeTask(row);
}

export async function listPlatformSeoKeywords() {
  const rows = await prisma.platformSeoKeyword.findMany({
    orderBy: [{ currentPosition: "asc" }, { keyword: "asc" }],
  });
  return rows.map(serializeKeyword);
}

export async function upsertPlatformSeoKeyword(input: { keyword: string; targetPath?: string | null }) {
  const keyword = input.keyword.trim().toLowerCase();
  if (!keyword) throw new Error("Keyword is required");
  const row = await prisma.platformSeoKeyword.upsert({
    where: { keyword },
    create: {
      keyword,
      targetPath: input.targetPath?.trim() || null,
    },
    update: {
      targetPath: input.targetPath?.trim() || null,
    },
  });
  return serializeKeyword(row);
}

export async function deletePlatformSeoKeyword(id: string) {
  await prisma.platformSeoKeyword.delete({ where: { id } });
}

export async function syncPlatformSeoFromGsc() {
  const gsc = await syncPlatformGscAnalytics();
  if (!gsc.connected) {
    return { connected: false, keywords: await listPlatformSeoKeywords() };
  }

  for (const row of gsc.queryRows) {
    const existing = await prisma.platformSeoKeyword.findUnique({ where: { keyword: row.keyword } });
    await prisma.platformSeoKeyword.upsert({
      where: { keyword: row.keyword },
      create: {
        keyword: row.keyword,
        currentPosition: row.position,
        impressions: row.impressions,
        clicks: row.clicks,
        lastSyncedAt: new Date(),
      },
      update: {
        previousPosition: existing?.currentPosition ?? null,
        currentPosition: row.position,
        impressions: row.impressions,
        clicks: row.clicks,
        lastSyncedAt: new Date(),
      },
    });
  }

  await prisma.platformSeoSettings.update({
    where: { id: "default" },
    data: { gscConnectedAt: new Date() },
  });

  return {
    ...gsc,
    connected: true,
    keywords: await listPlatformSeoKeywords(),
  };
}

export async function getPlatformSeoPublicConfig() {
  const settings = await getPlatformSeoSettings();
  return {
    ga4MeasurementId: settings.ga4MeasurementId,
    defaultLocale: settings.defaultLocale,
    alternateLocales: settings.alternateLocales ? (JSON.parse(settings.alternateLocales) as string[]) : [],
    bingSiteVerification: settings.bingSiteVerification,
  };
}
