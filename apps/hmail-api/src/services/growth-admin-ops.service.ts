import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import {
  GROWTH_PLAN_CHECKOUT_SLUGS,
  resolveGrowthPlanFromCheckoutSlug,
  type GrowthPlanSlug,
  isGrowthPlanSlug,
} from "../growth/plan-types.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import {
  adminSetGrowthPlanTierInternal,
  resolveEffectiveGrowthPlanSlug,
  syncGrowthPlanFromSubscriptions,
} from "./growth-plan.service.js";

const GROWTH_ADDON_SLUGS = new Set(Object.values(GROWTH_PLAN_CHECKOUT_SLUGS));

export class GrowthAdminOpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrowthAdminOpsError";
  }
}

function periodEnd(days: number): Date {
  const end = new Date();
  end.setDate(end.getDate() + days);
  return end;
}

export async function getTenantGrowthOps(tenantId: string) {
  const workspace = await prisma.growthWorkspace.findUnique({
    where: { tenantId },
    include: { settings: true },
  });

  if (!workspace) {
    return { hasWorkspace: false as const };
  }

  const settings = workspace.settings;
  return {
    hasWorkspace: true as const,
    workspaceId: workspace.id,
    workspaceStatus: workspace.status,
    planSlug: settings?.planSlug ?? "starter",
    planTierOverride: settings?.planTierOverride ?? false,
    effectivePlanSlug: await resolveEffectiveGrowthPlanSlug(tenantId, workspace.id),
  };
}

export async function grantTenantAddonSubscription(
  tenantId: string,
  input: { addonSlug: string; periodDays?: number },
) {
  const addon = await prisma.addon.findFirst({ where: { slug: input.addonSlug, isActive: true } });
  if (!addon) throw new GrowthAdminOpsError("Add-on not found");

  const days = input.periodDays ?? 30;
  const subscription = await prisma.tenantAddonSubscription.upsert({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
    create: {
      tenantId,
      addonId: addon.id,
      status: "active",
      paymentProvider: "admin",
      currentPeriodEnd: periodEnd(days),
    },
    update: {
      status: "active",
      paymentProvider: "admin",
      currentPeriodEnd: periodEnd(days),
    },
    include: { addon: { select: { slug: true, name: true } } },
  });

  const planSlug = resolveGrowthPlanFromCheckoutSlug(subscription.addon.slug);
  if (planSlug) {
    await syncGrowthPlanFromSubscriptions(tenantId);
  }

  return {
    id: subscription.id,
    addonSlug: subscription.addon.slug,
    addonName: subscription.addon.name,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    planSlug: planSlug ?? null,
  };
}

export async function revokeTenantAddonSubscription(tenantId: string, subscriptionId: string) {
  const subscription = await prisma.tenantAddonSubscription.findFirst({
    where: { id: subscriptionId, tenantId },
    include: { addon: { select: { slug: true } } },
  });
  if (!subscription) throw new GrowthAdminOpsError("Subscription not found");

  await prisma.tenantAddonSubscription.update({
    where: { id: subscriptionId },
    data: { status: "canceled" },
  });

  if (GROWTH_ADDON_SLUGS.has(subscription.addon.slug)) {
    await syncGrowthPlanFromSubscriptions(tenantId);
  }
}

export async function adminSetTenantGrowthPlanTier(
  tenantId: string,
  input: { planSlug: GrowthPlanSlug; planTierOverride?: boolean },
) {
  if (!isGrowthPlanSlug(input.planSlug)) {
    throw new GrowthAdminOpsError("Invalid Growth plan tier");
  }

  const workspace = await prisma.growthWorkspace.findUnique({ where: { tenantId } });
  if (!workspace) throw new GrowthAdminOpsError("Growth workspace not found for tenant");

  const override = input.planTierOverride ?? true;
  const settings = await adminSetGrowthPlanTierInternal({
    tenantId,
    workspaceId: workspace.id,
    planSlug: input.planSlug,
    planTierOverride: override,
  });

  await logGrowthAudit({
    tenantId,
    workspaceId: workspace.id,
    action: "admin.plan_tier.set",
    entityType: "growth_workspace_settings",
    entityId: settings.id,
    metadata: { planSlug: input.planSlug, planTierOverride: override, source: "super_admin" },
  });

  return {
    workspaceId: workspace.id,
    planSlug: settings.planSlug,
    planTierOverride: settings.planTierOverride,
  };
}
