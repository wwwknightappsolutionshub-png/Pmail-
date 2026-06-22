import { prisma } from "../lib/prisma.js";
import {
  GROWTH_PLAN_CATALOG,
  GROWTH_PLAN_CHECKOUT_SLUGS,
  resolveGrowthPlanFromCheckoutSlug,
  getGrowthCheckoutSlug,
  type GrowthPlanLimits,
  type GrowthPlanSlug,
  isGrowthPlanSlug,
} from "../growth/plan-types.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import type { PaymentProviderId } from "../config/env.js";
import { GrowthSettingsError } from "./growth-settings.service.js";

export class GrowthPlanError extends Error {
  code: "limit_reached" | "feature_locked" | "no_access";

  constructor(message: string, code: "limit_reached" | "feature_locked" | "no_access") {
    super(message);
    this.name = "GrowthPlanError";
    this.code = code;
  }
}

const TIER_RANK: Record<GrowthPlanSlug, number> = {
  starter: 0,
  pro: 1,
  agency: 2,
};

function maxPlanSlug(a: GrowthPlanSlug, b: GrowthPlanSlug): GrowthPlanSlug {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function tenantHasGrowthAccess(tenantId: string): Promise<boolean> {
  if (process.env.GROWTH_DEV_UNLOCK === "true") return true;
  for (const slug of new Set([...Object.values(GROWTH_PLAN_CHECKOUT_SLUGS)])) {
    if (await tenantHasAddonAccess(tenantId, slug)) return true;
  }
  return false;
}

export async function getGrowthWorkspaceSettings(workspaceId: string) {
  return prisma.growthWorkspaceSettings.findUnique({ where: { workspaceId } });
}

export async function resolveGrowthPlanSlugFromSubscriptions(tenantId: string): Promise<GrowthPlanSlug | null> {
  const subscriptions = await prisma.tenantAddonSubscription.findMany({
    where: { tenantId, status: "active" },
    include: { addon: { select: { slug: true } } },
  });

  let tier: GrowthPlanSlug | null = null;
  for (const sub of subscriptions) {
    const fromSlug = resolveGrowthPlanFromCheckoutSlug(sub.addon.slug);
    if (!fromSlug) continue;
    tier = tier ? maxPlanSlug(tier, fromSlug) : fromSlug;
  }
  return tier;
}

/** Effective tier used for limits — honors admin override, else active Growth subscriptions. */
export async function resolveEffectiveGrowthPlanSlug(
  tenantId: string,
  workspaceId: string,
): Promise<GrowthPlanSlug> {
  const settings = await getGrowthWorkspaceSettings(workspaceId);
  if (settings?.planTierOverride && isGrowthPlanSlug(settings.planSlug)) {
    return settings.planSlug;
  }

  const fromSubs = await resolveGrowthPlanSlugFromSubscriptions(tenantId);
  if (fromSubs) return fromSubs;

  const stored = settings?.planSlug ?? "starter";
  return isGrowthPlanSlug(stored) ? stored : "starter";
}

export async function resolveGrowthPlanSlug(tenantId: string, workspaceId: string): Promise<GrowthPlanSlug> {
  return resolveEffectiveGrowthPlanSlug(tenantId, workspaceId);
}

export async function getGrowthPlanLimits(tenantId: string, workspaceId: string): Promise<GrowthPlanLimits> {
  const planSlug = await resolveEffectiveGrowthPlanSlug(tenantId, workspaceId);
  return GROWTH_PLAN_CATALOG[planSlug].limits;
}

export async function getGrowthUsage(tenantId: string, workspaceId: string) {
  const since = monthStart();

  const [leadsThisMonth, automationCount, contentAssets] = await Promise.all([
    prisma.growthLead.count({
      where: { tenantId, workspaceId, createdAt: { gte: since }, source: { not: "manual" } },
    }),
    prisma.growthAutomation.count({ where: { tenantId, workspaceId } }),
    prisma.growthContentAsset.findMany({
      where: { tenantId, workspaceId },
      select: { bodyJson: true },
    }),
  ]);

  let publishedPages = 0;
  for (const asset of contentAssets) {
    try {
      const body = JSON.parse(asset.bodyJson) as { publish?: { publishedAt?: string } };
      if (body.publish?.publishedAt) publishedPages += 1;
    } catch {
      // ignore malformed body
    }
  }

  return { leadsThisMonth, automationCount, publishedPages, periodStart: since.toISOString() };
}

export async function getGrowthPlanSnapshot(tenantId: string, workspaceId: string) {
  const planSlug = await resolveEffectiveGrowthPlanSlug(tenantId, workspaceId);
  const plan = GROWTH_PLAN_CATALOG[planSlug];
  const settings = await getGrowthWorkspaceSettings(workspaceId);
  const limits = plan.limits;
  const usage = await getGrowthUsage(tenantId, workspaceId);
  const hasAccess = await tenantHasGrowthAccess(tenantId);

  return {
    addonSlug: getGrowthCheckoutSlug(planSlug),
    hasAccess,
    planSlug,
    planName: plan.name,
    priceCents: plan.priceCents,
    limits,
    usage,
    planTierOverride: settings?.planTierOverride ?? false,
  };
}

export async function assertGrowthAccess(tenantId: string): Promise<void> {
  if (!(await tenantHasGrowthAccess(tenantId))) {
    throw new GrowthPlanError(
      "Prohost Growth subscription required. Start a trial or subscribe from Settings.",
      "no_access",
    );
  }
}

export async function assertGrowthLeadCapacity(tenantId: string, workspaceId: string): Promise<void> {
  await assertGrowthAccess(tenantId);
  const limits = await getGrowthPlanLimits(tenantId, workspaceId);
  const usage = await getGrowthUsage(tenantId, workspaceId);
  if (usage.leadsThisMonth >= limits.leadsPerMonth) {
    throw new GrowthPlanError(
      `Monthly lead limit reached (${limits.leadsPerMonth}). Upgrade your Growth plan in Settings.`,
      "limit_reached",
    );
  }
}

export async function assertGrowthAutomationCapacity(
  tenantId: string,
  workspaceId: string,
): Promise<void> {
  await assertGrowthAccess(tenantId);
  const limits = await getGrowthPlanLimits(tenantId, workspaceId);
  const usage = await getGrowthUsage(tenantId, workspaceId);
  if (usage.automationCount >= limits.automations) {
    throw new GrowthPlanError(
      `Automation limit reached (${limits.automations}). Upgrade your Growth plan in Settings.`,
      "limit_reached",
    );
  }
}

export async function assertGrowthPublishCapacity(tenantId: string, workspaceId: string): Promise<void> {
  await assertGrowthAccess(tenantId);
  const limits = await getGrowthPlanLimits(tenantId, workspaceId);
  const usage = await getGrowthUsage(tenantId, workspaceId);
  if (usage.publishedPages >= limits.publishedPages) {
    throw new GrowthPlanError(
      `Published page limit reached (${limits.publishedPages}). Upgrade your Growth plan in Settings.`,
      "limit_reached",
    );
  }
}

export async function assertGrowthAnalyticsAccess(tenantId: string, workspaceId: string): Promise<void> {
  await assertGrowthAccess(tenantId);
  const limits = await getGrowthPlanLimits(tenantId, workspaceId);
  if (!limits.analytics) {
    throw new GrowthPlanError(
      "This feature requires a Pro or Agency Growth plan. Upgrade in Settings.",
      "feature_locked",
    );
  }
}

export async function assertGrowthChannelsAccess(tenantId: string, workspaceId: string): Promise<void> {
  await assertGrowthAnalyticsAccess(tenantId, workspaceId);
}

export function assertPanelOwnerPlanSlugChange(planSlug?: string): void {
  if (planSlug !== undefined) {
    throw new GrowthSettingsError(
      "Plan tier changes must go through checkout. Contact support for manual adjustments.",
      "forbidden",
    );
  }
}

export async function adminSetGrowthPlanTierInternal(input: {
  tenantId: string;
  workspaceId: string;
  planSlug: GrowthPlanSlug;
  planTierOverride: boolean;
}) {
  return prisma.growthWorkspaceSettings.upsert({
    where: { workspaceId: input.workspaceId },
    create: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      planSlug: input.planSlug,
      planTierOverride: input.planTierOverride,
    },
    update: {
      planSlug: input.planSlug,
      planTierOverride: input.planTierOverride,
    },
  });
}

/** Sync stored plan from subscriptions when not under admin override. */
export async function syncGrowthPlanFromSubscriptions(
  tenantId: string,
  workspaceId?: string,
  options?: { dryRun?: boolean },
): Promise<GrowthPlanSlug | null> {
  const ws =
    workspaceId != null
      ? await prisma.growthWorkspace.findUnique({ where: { id: workspaceId }, include: { settings: true } })
      : await prisma.growthWorkspace.findUnique({ where: { tenantId }, include: { settings: true } });

  if (!ws) return null;
  if (ws.settings?.planTierOverride) {
    return isGrowthPlanSlug(ws.settings.planSlug) ? ws.settings.planSlug : "starter";
  }

  const tier = await resolveGrowthPlanSlugFromSubscriptions(tenantId);
  const nextSlug = tier ?? "starter";

  if (!options?.dryRun) {
    await prisma.growthWorkspaceSettings.upsert({
      where: { workspaceId: ws.id },
      create: {
        tenantId,
        workspaceId: ws.id,
        planSlug: nextSlug,
        planTierOverride: false,
      },
      update: {
        planSlug: nextSlug,
      },
    });
  }

  return nextSlug;
}

export async function upgradeGrowthPlanOnSubscription(
  tenantId: string,
  planSlug: GrowthPlanSlug = "pro",
): Promise<void> {
  const workspace = await prisma.growthWorkspace.findUnique({ where: { tenantId } });
  if (!workspace) return;

  await prisma.growthWorkspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    create: {
      tenantId,
      workspaceId: workspace.id,
      planSlug,
      planTierOverride: false,
    },
    update: {
      planSlug,
      planTierOverride: false,
    },
  });
}

export function listGrowthPlanOptions() {
  return Object.values(GROWTH_PLAN_CATALOG).map((plan) => ({
    ...plan,
    checkoutSlug: getGrowthCheckoutSlug(plan.slug),
  }));
}

export async function createGrowthPlanCheckout(input: {
  tenantSlug: string;
  planSlug: GrowthPlanSlug;
  customerEmail: string;
  provider: PaymentProviderId;
}) {
  if (!isGrowthPlanSlug(input.planSlug)) {
    throw new GrowthPlanError("Invalid plan slug", "no_access");
  }

  const panelBase = process.env.GROWTH_PANEL_URL?.trim() || "http://localhost:5174";
  const { createPaymentCheckout } = await import("./payment.service.js");

  return createPaymentCheckout({
    provider: input.provider,
    productType: "addon",
    productSlug: getGrowthCheckoutSlug(input.planSlug),
    tenantSlug: input.tenantSlug,
    customerEmail: input.customerEmail,
    successUrl: `${panelBase}/growth/settings?upgraded=${input.planSlug}`,
    cancelUrl: `${panelBase}/growth/settings`,
  });
}
