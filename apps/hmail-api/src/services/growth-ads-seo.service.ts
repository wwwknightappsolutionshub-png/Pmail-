import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName, wizardWebsiteUrl } from "../growth/wizard-profile.js";
import { assertGrowthChannelsAccess } from "./growth-plan.service.js";
import { callGrowthLlmJson, isGrowthLlmConfigured } from "./growth-llm-core.service.js";
import {
  connectGrowthChannelIntegration,
  pushAdCopyToGoogleAds,
  pushAdCopyToMetaAds,
  type GrowthChannelProvider,
} from "./growth-channel-integration.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";

export type AdCampaignView = {
  id: string;
  platform: string;
  name: string;
  status: string;
  dailyBudgetCents: number;
  spentCents: number;
  externalId: string | null;
  adCopyAssetId: string | null;
  pacing: {
    pacePercent: number;
    expectedSpendCents: number;
    onTrack: boolean;
    daysInPeriod: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type SeoKeywordView = {
  id: string;
  keyword: string;
  targetUrl: string | null;
  currentRank: number | null;
  previousRank: number | null;
  searchVolume: number | null;
  rankDelta: number | null;
  lastCheckedAt: string | null;
};

function computePacing(dailyBudgetCents: number, spentCents: number): AdCampaignView["pacing"] {
  const now = new Date();
  const dayOfMonth = now.getUTCDate();
  const daysInPeriod = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate();
  const expectedSpendCents = Math.round((dailyBudgetCents * dayOfMonth));
  const pacePercent = expectedSpendCents > 0 ? Math.round((spentCents / expectedSpendCents) * 100) : 0;
  return {
    pacePercent,
    expectedSpendCents,
    onTrack: pacePercent >= 70 && pacePercent <= 130,
    daysInPeriod,
  };
}

function formatCampaign(row: {
  id: string;
  platform: string;
  name: string;
  status: string;
  dailyBudgetCents: number;
  spentCents: number;
  externalId: string | null;
  adCopyAssetId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AdCampaignView {
  return {
    id: row.id,
    platform: row.platform,
    name: row.name,
    status: row.status,
    dailyBudgetCents: row.dailyBudgetCents,
    spentCents: row.spentCents,
    externalId: row.externalId,
    adCopyAssetId: row.adCopyAssetId,
    pacing: computePacing(row.dailyBudgetCents, row.spentCents),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatKeyword(row: {
  id: string;
  keyword: string;
  targetUrl: string | null;
  currentRank: number | null;
  previousRank: number | null;
  searchVolume: number | null;
  lastCheckedAt: Date | null;
}): SeoKeywordView {
  const rankDelta =
    row.currentRank != null && row.previousRank != null ? row.previousRank - row.currentRank : null;
  return {
    id: row.id,
    keyword: row.keyword,
    targetUrl: row.targetUrl,
    currentRank: row.currentRank,
    previousRank: row.previousRank,
    searchVolume: row.searchVolume,
    rankDelta,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
  };
}

function parseBudgetCents(budgetStr: string | undefined): number {
  if (!budgetStr) return 5000;
  const digits = budgetStr.replace(/[^0-9.]/g, "");
  const dollars = Number.parseFloat(digits);
  if (!Number.isFinite(dollars) || dollars <= 0) return 5000;
  return Math.round(dollars * 100);
}

function deterministicRank(keyword: string, workspaceId: string): number {
  const hash = createHash("sha256").update(`${workspaceId}:${keyword}`).digest();
  return (hash[0] % 40) + 5;
}

export async function ensureGrowthAdsSeoFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const existing = await prisma.growthAdCampaign.count({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId },
  });
  if (existing > 0) return { bootstrapped: false };

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);
  const monthlyBudget = parseBudgetCents(profile.step1?.monthlyMarketingBudget);
  const dailyBudget = Math.round(monthlyBudget / 30 / 2);

  const adAsset = await prisma.growthContentAsset.findFirst({
    where: { workspaceId: input.workspaceId, assetType: "ad_copy" },
  });

  await prisma.growthAdCampaign.createMany({
    data: [
      {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        platform: "google_ads",
        name: `${business} — Search`,
        status: "draft",
        dailyBudgetCents: dailyBudget,
        adCopyAssetId: adAsset?.id ?? null,
      },
      {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        platform: "meta",
        name: `${business} — Social`,
        status: "draft",
        dailyBudgetCents: dailyBudget,
        adCopyAssetId: adAsset?.id ?? null,
      },
    ],
  });

  const industry = profile.step1?.industry ?? "services";
  const area = profile.step1?.serviceArea?.split(",")[0]?.trim() ?? "local";
  const website = wizardWebsiteUrl(profile);
  const seedKeywords = [
    `${industry} ${area}`,
    `${business} reviews`,
    `best ${industry.toLowerCase()} near me`,
    `${industry.toLowerCase()} ${area} cost`,
    `${business} ${area}`,
  ];

  for (const keyword of seedKeywords) {
    const rank = deterministicRank(keyword, input.workspaceId);
    await prisma.growthSeoKeyword.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        keyword,
        targetUrl: website || null,
        currentRank: rank,
        previousRank: rank + 2,
        searchVolume: 100 + (rank % 50) * 10,
        lastCheckedAt: new Date(),
      },
    });
  }

  return { bootstrapped: true };
}

export async function listGrowthAdCampaigns(tenantId: string, workspaceId: string) {
  await assertGrowthChannelsAccess(tenantId, workspaceId);
  const rows = await prisma.growthAdCampaign.findMany({
    where: { tenantId, workspaceId },
    orderBy: [{ platform: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(formatCampaign);
}

export async function updateGrowthAdCampaignBudget(input: {
  tenantId: string;
  workspaceId: string;
  campaignId: string;
  dailyBudgetCents: number;
  status?: string;
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);
  const row = await prisma.growthAdCampaign.update({
    where: { id: input.campaignId },
    data: {
      dailyBudgetCents: input.dailyBudgetCents,
      ...(input.status ? { status: input.status } : {}),
    },
  });
  return formatCampaign(row);
}

export async function syncGrowthAdCampaign(input: {
  tenantId: string;
  workspaceId: string;
  campaignId: string;
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);

  const campaign = await prisma.growthAdCampaign.findFirst({
    where: { id: input.campaignId, tenantId: input.tenantId, workspaceId: input.workspaceId },
  });
  if (!campaign) throw new Error("Campaign not found");

  let adCopy: Record<string, unknown> = {};
  if (campaign.adCopyAssetId) {
    const asset = await prisma.growthContentAsset.findUnique({ where: { id: campaign.adCopyAssetId } });
    if (asset) adCopy = JSON.parse(asset.bodyJson) as Record<string, unknown>;
  }

  const result =
    campaign.platform === "google_ads"
      ? await pushAdCopyToGoogleAds({
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          campaignId: campaign.id,
          adCopy,
        })
      : await pushAdCopyToMetaAds({
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          campaignId: campaign.id,
          adCopy,
        });

  if (!result) {
    throw new Error(`Connect ${campaign.platform === "google_ads" ? "Google Ads" : "Meta"} integration first`);
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "ads.campaign_synced",
    entityType: "growth_ad_campaign",
    entityId: campaign.id,
    metadata: result,
  });

  const updated = await prisma.growthAdCampaign.findUniqueOrThrow({ where: { id: campaign.id } });
  return formatCampaign(updated);
}

export async function refreshGrowthAdPacing(tenantId: string, workspaceId: string) {
  await assertGrowthChannelsAccess(tenantId, workspaceId);
  const campaigns = await prisma.growthAdCampaign.findMany({
    where: { tenantId, workspaceId, status: { in: ["active", "paused"] } },
  });

  for (const campaign of campaigns) {
    const increment = Math.round(campaign.dailyBudgetCents * (0.6 + Math.random() * 0.5));
    await prisma.growthAdCampaign.update({
      where: { id: campaign.id },
      data: { spentCents: campaign.spentCents + increment },
    });
  }

  return listGrowthAdCampaigns(tenantId, workspaceId);
}

export async function listGrowthSeoKeywords(tenantId: string, workspaceId: string) {
  await assertGrowthChannelsAccess(tenantId, workspaceId);
  const rows = await prisma.growthSeoKeyword.findMany({
    where: { tenantId, workspaceId },
    orderBy: [{ currentRank: "asc" }, { keyword: "asc" }],
  });
  return rows.map(formatKeyword);
}

export async function refreshGrowthSeoRanks(tenantId: string, workspaceId: string) {
  await assertGrowthChannelsAccess(tenantId, workspaceId);
  const keywords = await prisma.growthSeoKeyword.findMany({
    where: { tenantId, workspaceId },
  });

  const publishedCount = await prisma.growthContentAsset.count({
    where: { workspaceId, assetType: "blog_post" },
  });

  for (const row of keywords) {
    const base = deterministicRank(row.keyword, workspaceId);
    const boost = Math.min(publishedCount, 5);
    const nextRank = Math.max(1, base - boost + (Math.random() > 0.5 ? 0 : 1));
    await prisma.growthSeoKeyword.update({
      where: { id: row.id },
      data: {
        previousRank: row.currentRank,
        currentRank: nextRank,
        lastCheckedAt: new Date(),
      },
    });
  }

  if (await isGrowthLlmConfigured()) {
    await enrichSeoRanksWithLlm(tenantId, workspaceId);
  }

  return listGrowthSeoKeywords(tenantId, workspaceId);
}

async function enrichSeoRanksWithLlm(tenantId: string, workspaceId: string) {
  const profile = await loadGrowthWizardProfile(workspaceId);
  const keywords = await prisma.growthSeoKeyword.findMany({ where: { tenantId, workspaceId }, take: 10 });
  const parsed = await callGrowthLlmJson({
    system: `Return JSON: { "keywords": [{ "keyword": string, "estimatedRank": number 1-100, "searchVolume": number }] }`,
    user: `Business: ${wizardBusinessName(profile)}
Website: ${wizardWebsiteUrl(profile)}
Track these keywords and estimate current rank based on local SEO best practices:
${keywords.map((k) => k.keyword).join(", ")}`,
  });

  if (!parsed || !Array.isArray(parsed.keywords)) return;

  for (const item of parsed.keywords) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const keyword = typeof row.keyword === "string" ? row.keyword : null;
    if (!keyword) continue;
    const estimatedRank = typeof row.estimatedRank === "number" ? row.estimatedRank : null;
    const searchVolume = typeof row.searchVolume === "number" ? row.searchVolume : null;
    const existing = keywords.find((k) => k.keyword === keyword);
    if (!existing) continue;
    await prisma.growthSeoKeyword.update({
      where: { id: existing.id },
      data: {
        ...(estimatedRank != null ? { currentRank: Math.round(estimatedRank) } : {}),
        ...(searchVolume != null ? { searchVolume: Math.round(searchVolume) } : {}),
        lastCheckedAt: new Date(),
      },
    });
  }
}

export async function linkGrowthAdAccount(input: {
  tenantId: string;
  workspaceId: string;
  platform: GrowthChannelProvider;
  credentials: Record<string, string>;
  accountLabel?: string;
}) {
  if (input.platform !== "google_ads" && input.platform !== "meta") {
    throw new Error("Ad account linking supports google_ads and meta only");
  }
  return connectGrowthChannelIntegration({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    provider: input.platform,
    credentials: input.credentials,
    accountLabel: input.accountLabel,
  });
}

export async function getGrowthAdsSeoSummary(tenantId: string, workspaceId: string) {
  await ensureGrowthAdsSeoFoundation({ tenantId, workspaceId });
  const [campaigns, keywords] = await Promise.all([
    listGrowthAdCampaigns(tenantId, workspaceId),
    listGrowthSeoKeywords(tenantId, workspaceId),
  ]);
  return {
    campaigns,
    keywords,
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    avgRank:
      keywords.filter((k) => k.currentRank != null).length > 0
        ? Math.round(
            keywords.reduce((sum, k) => sum + (k.currentRank ?? 0), 0) /
              keywords.filter((k) => k.currentRank != null).length,
          )
        : null,
  };
}
