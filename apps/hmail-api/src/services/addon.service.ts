import { prisma } from "../lib/prisma.js";
import {
  ADDON_CATALOG,
  TRIAL_DAYS,
  getCatalogEntry,
  type AddonCatalogEntry,
  type AddonReleasePhase,
} from "../data/addon-catalog.js";

export type AddonAccessStatus = "none" | "trial" | "active" | "expired";

export interface AddonWithAccess extends AddonCatalogEntry {
  id: string;
  accessStatus: AddonAccessStatus;
  trialEndsAt?: string;
  trialDaysLeft?: number;
  canStartTrial: boolean;
  releasePhase: AddonReleasePhase;
  comingSoon: boolean;
}

export async function seedAddonCatalog(): Promise<void> {
  for (const entry of ADDON_CATALOG) {
    await prisma.addon.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        name: entry.name,
        group: entry.group,
        description: entry.description,
        features: JSON.stringify(entry.features),
        priceCents: entry.priceCents,
        sortOrder: entry.sortOrder,
      },
      update: {
        name: entry.name,
        group: entry.group,
        description: entry.description,
        features: JSON.stringify(entry.features),
        priceCents: entry.priceCents,
        sortOrder: entry.sortOrder,
        isActive: true,
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

export async function listAddonsForTenant(tenantId: string): Promise<AddonWithAccess[]> {
  const [addons, trials, subscriptions] = await Promise.all([
    prisma.addon.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tenantAddonTrial.findMany({ where: { tenantId } }),
    prisma.tenantAddonSubscription.findMany({ where: { tenantId } }),
  ]);

  const trialByAddon = new Map(trials.map((t) => [t.addonId, t]));
  const subByAddon = new Map(subscriptions.map((s) => [s.addonId, s]));

  return addons.map((addon) => {
    const trial = trialByAddon.get(addon.id) ?? null;
    const subscription = subByAddon.get(addon.id) ?? null;
    const access = resolveAccess(trial, subscription);
    const hadTrial = Boolean(trial);
    const catalog = getCatalogEntry(addon.slug);
    const comingSoon = catalog?.comingSoon ?? false;

    return {
      id: addon.id,
      slug: addon.slug,
      name: addon.name,
      group: addon.group as AddonCatalogEntry["group"],
      description: addon.description,
      features: JSON.parse(addon.features) as string[],
      sortOrder: addon.sortOrder,
      priceCents: addon.priceCents,
      releasePhase: catalog?.releasePhase ?? 1,
      comingSoon,
      accessStatus: access.status,
      trialEndsAt: access.trialEndsAt,
      trialDaysLeft: access.trialDaysLeft,
      canStartTrial: !comingSoon && !hadTrial && access.status !== "active",
    };
  });
}

export async function getActiveAddonSlugs(tenantId: string): Promise<string[]> {
  const addons = await listAddonsForTenant(tenantId);
  return addons
    .filter((a) => a.accessStatus === "trial" || a.accessStatus === "active")
    .map((a) => a.slug);
}

export async function tenantHasAddonAccess(tenantId: string, slug: string): Promise<boolean> {
  const slugs = await getActiveAddonSlugs(tenantId);
  return slugs.includes(slug);
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
  endsAt.setDate(endsAt.getDate() + TRIAL_DAYS);

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
  }

  await expireEndedTrials();
}
