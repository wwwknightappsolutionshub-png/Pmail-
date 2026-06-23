import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import {
  ADDON_CATALOG,
  JOB_HUNTER_ADDON_SLUG,
  JOB_HUNTER_TRIAL_DAYS,
  TRIAL_DAYS,
  getCatalogEntry,
  getPlatformBundleAnchorSlug,
  MARKETPLACE_PLATFORM_BUNDLE_SLUGS,
  MARKETPLACE_PLATFORM_BUNDLE_SLUG_SET,
  PANEL_WORKSPACE_WELCOME_TRIAL_SLUG_SET,
  resolveAddonIsPaid,
  resolveAddonKind,
  resolveAddonMinTenantSeats,
  resolveAddonTenantSeatPriceCents,
  resolveAddonUserPriceCents,
  type AddonCatalogEntry,
  type AddonReleasePhase,
} from "../data/addon-catalog.js";

export type AddonAccessStatus = "none" | "trial" | "active" | "expired";
export type AddonSubscriptionScope = "user" | "tenant";

export interface AddonWithAccess extends AddonCatalogEntry {
  id: string;
  addonKind: string;
  isPaid: boolean;
  tenantPriceCents: number;
  minTenantSeats: number;
  accessStatus: AddonAccessStatus;
  trialEndsAt?: string;
  trialDaysLeft?: number;
  canStartTrial: boolean;
  /** Active user/tenant subscription on this add-on (not bundle-included access). */
  hasDirectSubscription: boolean;
  releasePhase: AddonReleasePhase;
  comingSoon: boolean;
}

export async function seedAddonCatalog(): Promise<void> {
  for (const entry of ADDON_CATALOG) {
    const addonKind = resolveAddonKind(entry);
    const priceCents = resolveAddonUserPriceCents(entry);
    const tenantPriceCents = resolveAddonTenantSeatPriceCents(entry);
    const minTenantSeats = resolveAddonMinTenantSeats(entry);
    const isPaid = resolveAddonIsPaid(entry);
    await prisma.addon.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        name: entry.name,
        group: entry.group,
        vertical: entry.vertical,
        addonKind,
        description: entry.description,
        features: JSON.stringify(entry.features),
        priceCents,
        tenantPriceCents,
        minTenantSeats,
        isPaid,
        releasePhase: entry.releasePhase,
        comingSoon: entry.comingSoon ?? false,
        sortOrder: entry.sortOrder,
      },
      update: {
        name: entry.name,
        group: entry.group,
        vertical: entry.vertical,
        addonKind,
        description: entry.description,
        features: JSON.stringify(entry.features),
        priceCents,
        tenantPriceCents,
        minTenantSeats,
        isPaid,
        releasePhase: entry.releasePhase,
        comingSoon: entry.comingSoon ?? false,
        sortOrder: entry.sortOrder,
        isActive: true,
        deletedAt: null,
      },
    });
  }
}

function daysLeft(endsAt: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function resolveAccess(
  trial: { status: string; endsAt: Date } | null,
  subscription: { status: string } | null,
): { status: AddonAccessStatus; trialEndsAt?: string; trialDaysLeft?: number } {
  if (subscription?.status === "active") {
    return { status: "active" };
  }

  if (trial) {
    if (trial.status === "active" && trial.endsAt.getTime() > Date.now()) {
      return {
        status: "trial",
        trialEndsAt: trial.endsAt.toISOString(),
        trialDaysLeft: daysLeft(trial.endsAt),
      };
    }
    return { status: "expired", trialEndsAt: trial.endsAt.toISOString(), trialDaysLeft: 0 };
  }

  return { status: "none" };
}

function isActiveSub(sub: { status: string; currentPeriodEnd?: Date | null } | null | undefined): boolean {
  if (!sub || sub.status !== "active") return false;
  return !sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > Date.now();
}

export async function listAddonsForTenant(tenantId: string, userId?: string): Promise<AddonWithAccess[]> {
  const [addons, trials, subscriptions, userSubscriptions, user, panelWelcomeTrialActive] = await Promise.all([
    prisma.addon.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.tenantAddonTrial.findMany({ where: { tenantId } }),
    prisma.tenantAddonSubscription.findMany({ where: { tenantId } }),
    userId ? prisma.userAddonSubscription.findMany({ where: { tenantId, userId } }) : Promise.resolve([]),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { email: true } }) : Promise.resolve(null),
    userId
      ? import("./panel-workspace-trial.service.js").then((m) => m.hasActivePanelWorkspaceWelcomeTrial(userId))
      : Promise.resolve(false),
  ]);

  const env = getEnv();
  const testerUnlocked =
    env.PMAIL_TESTER_UNLOCK_ALL_ADDONS &&
    user?.email.toLowerCase() === env.PMAIL_TESTER_EMAIL.toLowerCase();
  const trialByAddon = new Map(trials.map((t) => [t.addonId, t]));
  const subByAddon = new Map(subscriptions.map((s) => [s.addonId, s]));
  const userSubByAddon = new Map(userSubscriptions.map((s) => [s.addonId, s]));
  const activeVerticals = new Set<string>();
  const anchorSlug = getPlatformBundleAnchorSlug();
  const anchorAddon = addons.find((entry) => entry.slug === anchorSlug);
  const activePlatformBundle =
    (anchorAddon &&
      (isActiveSub(subByAddon.get(anchorAddon.id)) ||
        (userId ? isActiveSub(userSubByAddon.get(anchorAddon.id)) : false))) ||
    MARKETPLACE_PLATFORM_BUNDLE_SLUGS.some((slug) => {
      const addon = addons.find((entry) => entry.slug === slug);
      if (!addon) return false;
      return (
        isActiveSub(subByAddon.get(addon.id)) || (userId ? isActiveSub(userSubByAddon.get(addon.id)) : false)
      );
    });

  for (const addon of addons) {
    if (addon.addonKind !== "vertical") continue;
    if (isActiveSub(subByAddon.get(addon.id)) || isActiveSub(userSubByAddon.get(addon.id))) {
      activeVerticals.add(addon.vertical);
    }
  }

  return addons.map((addon) => {
    const trial = trialByAddon.get(addon.id) ?? null;
    const subscription = subByAddon.get(addon.id) ?? userSubByAddon.get(addon.id) ?? null;
    const tenantSubscription = subByAddon.get(addon.id) ?? null;
    const userSubscription = userId ? userSubByAddon.get(addon.id) ?? null : null;
    const hasDirectSubscription =
      isActiveSub(tenantSubscription) || isActiveSub(userSubscription);
    const directAccess = resolveAccess(trial, subscription);
    const verticalBundleAccess = addon.addonKind === "vertical" && activeVerticals.has(addon.vertical);
    const platformBundleAccess =
      addon.addonKind === "platform" &&
      MARKETPLACE_PLATFORM_BUNDLE_SLUG_SET.has(addon.slug) &&
      activePlatformBundle;
    const panelWelcomeTrialAccess =
      panelWelcomeTrialActive && PANEL_WORKSPACE_WELCOME_TRIAL_SLUG_SET.has(addon.slug);
    const access =
      testerUnlocked || verticalBundleAccess || platformBundleAccess || panelWelcomeTrialAccess
        ? { status: "active" as const }
        : directAccess;
    const hadTrial = Boolean(trial);
    const catalog = getCatalogEntry(addon.slug);
    const comingSoon = catalog?.comingSoon ?? false;

    return {
      id: addon.id,
      slug: addon.slug,
      name: addon.name,
      group: addon.group as AddonCatalogEntry["group"],
      vertical: (addon.vertical as AddonCatalogEntry["vertical"]) ?? catalog?.vertical ?? "platform",
      addonKind: addon.addonKind,
      description: addon.description,
      features: JSON.parse(addon.features) as string[],
      sortOrder: addon.sortOrder,
      priceCents: addon.priceCents,
      tenantPriceCents: addon.tenantPriceCents,
      minTenantSeats: addon.minTenantSeats,
      isPaid: addon.isPaid,
      releasePhase: (addon.releasePhase as AddonReleasePhase) ?? catalog?.releasePhase ?? 1,
      comingSoon: addon.comingSoon || comingSoon,
      accessStatus: access.status,
      trialEndsAt: access.trialEndsAt,
      trialDaysLeft: access.trialDaysLeft,
      canStartTrial: !comingSoon && !hadTrial && access.status !== "active",
      hasDirectSubscription,
    };
  });
}

export async function getMarketplaceActiveAddonSlugs(tenantId: string, userId?: string): Promise<string[]> {
  const addons = await listAddonsForTenant(tenantId, userId);
  return addons
    .filter((a) => a.accessStatus === "trial" || a.accessStatus === "active")
    .map((a) => a.slug);
}

export async function getActiveAddonSlugs(tenantId: string, userId?: string): Promise<string[]> {
  const slugs = await getMarketplaceActiveAddonSlugs(tenantId, userId);
  if (!userId) return slugs;

  const { hasJobHunterReadAccess } = await import("./job-hunter-entitlement.service.js");
  if (!slugs.includes(JOB_HUNTER_ADDON_SLUG) && (await hasJobHunterReadAccess(tenantId, userId))) {
    return [...slugs, JOB_HUNTER_ADDON_SLUG];
  }
  return slugs;
}

export async function tenantHasAddonAccess(tenantId: string, slug: string, userId?: string): Promise<boolean> {
  if (slug === JOB_HUNTER_ADDON_SLUG && userId) {
    const { hasJobHunterReadAccess } = await import("./job-hunter-entitlement.service.js");
    return hasJobHunterReadAccess(tenantId, userId);
  }
  const slugs = await getMarketplaceActiveAddonSlugs(tenantId, userId);
  return slugs.includes(slug);
}

function nextMonthlyPeriodEnd(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

export async function startAddonSubscription(
  tenantId: string,
  userId: string,
  slug: string,
  scope: AddonSubscriptionScope,
  requestedSeats?: number,
): Promise<AddonWithAccess> {
  const addon = await prisma.addon.findFirst({ where: { slug, isActive: true, deletedAt: null } });
  if (!addon) throw new Error("Add-on not found");
  if (addon.comingSoon) throw new Error("This add-on is coming soon");
  if (!addon.isPaid) throw new Error("This add-on is included and does not require checkout");

  const currentPeriodEnd = nextMonthlyPeriodEnd();
  if (scope === "tenant") {
    const seats = Math.max(addon.minTenantSeats, requestedSeats ?? addon.minTenantSeats);
    await prisma.tenantAddonSubscription.upsert({
      where: { tenantId_addonId: { tenantId, addonId: addon.id } },
      create: {
        tenantId,
        addonId: addon.id,
        scope: "tenant",
        seats,
        priceCentsPerSeat: addon.tenantPriceCents,
        status: "active",
        paymentProvider: "local_checkout",
        currentPeriodEnd,
      },
      update: {
        scope: "tenant",
        seats,
        priceCentsPerSeat: addon.tenantPriceCents,
        status: "active",
        canceledAt: null,
        currentPeriodEnd,
      },
    });
  } else {
    await prisma.userAddonSubscription.upsert({
      where: { userId_addonId: { userId, addonId: addon.id } },
      create: {
        tenantId,
        userId,
        addonId: addon.id,
        scope: "user",
        priceCents: addon.priceCents,
        status: "active",
        currentPeriodEnd,
      },
      update: {
        scope: "user",
        priceCents: addon.priceCents,
        status: "active",
        canceledAt: null,
        currentPeriodEnd,
      },
    });
  }

  if (addon.addonKind === "vertical") {
    await prisma.user.update({
      where: { id: userId },
      data: { businessVertical: addon.vertical },
    });
  }

  const list = await listAddonsForTenant(tenantId, userId);
  const result = list.find((a) => a.slug === slug);
  if (!result) throw new Error("Failed to load add-on");
  return result;
}

export async function startAddonTrial(
  tenantId: string,
  slug: string,
  userEmail: string,
): Promise<AddonWithAccess> {
  const addon = await prisma.addon.findFirst({ where: { slug, isActive: true } });
  if (!addon) {
    throw new Error("Add-on not found");
  }

  const catalog = getCatalogEntry(slug);
  if (catalog?.comingSoon) {
    throw new Error("This add-on is coming soon");
  }

  const existingTrial = await prisma.tenantAddonTrial.findUnique({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
  });

  if (existingTrial) {
    throw new Error("Trial already used for this add-on");
  }

  const activeSub = await prisma.tenantAddonSubscription.findUnique({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
  });
  if (activeSub?.status === "active") {
    throw new Error("Add-on is already active");
  }

  const endsAt = new Date();
  const trialDays = slug === JOB_HUNTER_ADDON_SLUG ? JOB_HUNTER_TRIAL_DAYS : TRIAL_DAYS;
  endsAt.setDate(endsAt.getDate() + trialDays);

  await prisma.tenantAddonTrial.create({
    data: {
      tenantId,
      addonId: addon.id,
      endsAt,
      status: "active",
    },
  });

  const { sendAddonTrialEmail } = await import("./addon-email.service.js");
  await sendAddonTrialEmail({
    tenantId,
    addonId: addon.id,
    addonName: addon.name,
    userEmail,
    emailType: "welcome",
  });

  await prisma.tenantAddonTrial.update({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
    data: { welcomeEmailSent: true },
  });

  const list = await listAddonsForTenant(tenantId);
  const result = list.find((a) => a.slug === slug);
  if (!result) throw new Error("Failed to load add-on");
  return result;
}

export async function expireEndedTrials(): Promise<number> {
  const now = new Date();
  const expired = await prisma.tenantAddonTrial.findMany({
    where: { status: "active", endsAt: { lt: now } },
    include: { addon: true, tenant: { include: { users: true } } },
  });

  for (const trial of expired) {
    await prisma.tenantAddonTrial.update({
      where: { id: trial.id },
      data: { status: "expired" },
    });

    const userEmail = trial.tenant.users[0]?.email;
    if (userEmail && !trial.expiredEmailSent) {
      const { sendAddonTrialEmail } = await import("./addon-email.service.js");
      await sendAddonTrialEmail({
        tenantId: trial.tenantId,
        addonId: trial.addonId,
        addonName: trial.addon.name,
        userEmail,
        emailType: "expired",
      });
      await prisma.tenantAddonTrial.update({
        where: { id: trial.id },
        data: { expiredEmailSent: true },
      });
    }
  }

  return expired.length;
}

export async function processTrialNurtureEmails(): Promise<void> {
  const now = new Date();
  const day3Threshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const day6Threshold = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

  const activeTrials = await prisma.tenantAddonTrial.findMany({
    where: { status: "active", endsAt: { gt: now } },
    include: { addon: true, tenant: { include: { users: true } } },
  });

  const { sendAddonTrialEmail } = await import("./addon-email.service.js");

  for (const trial of activeTrials) {
    const userEmail = trial.tenant.users[0]?.email;
    if (!userEmail) continue;

    if (!trial.day3EmailSent && trial.startedAt <= day3Threshold) {
      await sendAddonTrialEmail({
        tenantId: trial.tenantId,
        addonId: trial.addonId,
        addonName: trial.addon.name,
        userEmail,
        emailType: "day3",
        trialEndsAt: trial.endsAt,
      });
      await prisma.tenantAddonTrial.update({
        where: { id: trial.id },
        data: { day3EmailSent: true },
      });
    }

    if (
      trial.trialSource === "referral_reward" &&
      !trial.discountEmailSent &&
      trial.startedAt <= day6Threshold
    ) {
      await sendAddonTrialEmail({
        tenantId: trial.tenantId,
        addonId: trial.addonId,
        addonName: "PMail+ Platform tools",
        userEmail,
        emailType: "day6",
        trialEndsAt: trial.endsAt,
      });
      await prisma.tenantAddonTrial.update({
        where: { id: trial.id },
        data: { discountEmailSent: true },
      });
    }
  }

  await expireEndedTrials();
}
