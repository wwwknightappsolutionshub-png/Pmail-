import {
  ADDON_CATALOG,
  ADDON_GROUP_LABELS,
  getCatalogEntry,
  resolveAddonIsPaid,
  resolveAddonKind,
  resolveAddonMinTenantSeats,
  resolveAddonTenantSeatPriceCents,
  resolveAddonUserPriceCents,
  type AddonGroup,
} from "../data/addon-catalog.js";
import { ADDON_VERTICAL_LABELS, type AddonVertical } from "../data/addon-verticals.js";
import { prisma } from "../lib/prisma.js";

export type AddonMarketingInput = {
  addonId?: string;
  addonSlug?: string;
  marketingTitle?: string | null;
  marketingSubtitle?: string | null;
  longDescription?: string | null;
  badge?: string | null;
  displayPriceCents?: number;
  trialDays?: number;
  ctaLabel?: string;
  landingFeatured?: boolean;
  sortOrder?: number;
  isPublished?: boolean;
};

function serializeMarketing(row: {
  id: string;
  addonId: string;
  marketingTitle: string | null;
  marketingSubtitle: string | null;
  longDescription: string | null;
  badge: string | null;
  displayPriceCents: number;
  trialDays: number;
  ctaLabel: string;
  landingFeatured: boolean;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
  addon: {
    slug: string;
    name: string;
    group: string;
    description: string;
    features: string;
    priceCents: number;
    tenantPriceCents: number;
    minTenantSeats: number;
    isPaid: boolean;
    addonKind: string;
    vertical: string;
    releasePhase: number;
    comingSoon: boolean;
    isActive: boolean;
  };
}) {
  let features: string[] = [];
  try {
    features = JSON.parse(row.addon.features) as string[];
  } catch {
    features = [];
  }

  return {
    id: row.id,
    addonId: row.addonId,
    slug: row.addon.slug,
    name: row.addon.name,
    group: row.addon.group,
    groupLabel: ADDON_GROUP_LABELS[row.addon.group as keyof typeof ADDON_GROUP_LABELS] ?? row.addon.group,
    description: row.addon.description,
    features,
    marketingTitle: row.marketingTitle ?? row.addon.name,
    marketingSubtitle: row.marketingSubtitle,
    longDescription: row.longDescription ?? row.addon.description,
    badge: row.badge,
    displayPriceCents: row.displayPriceCents,
    trialDays: row.trialDays,
    ctaLabel: row.ctaLabel,
    landingFeatured: row.landingFeatured,
    sortOrder: row.sortOrder,
    isPublished: row.isPublished,
    tenantPriceCents: row.addon.tenantPriceCents,
    minTenantSeats: row.addon.minTenantSeats,
    isPaid: row.addon.isPaid,
    addonKind: row.addon.addonKind,
    vertical: row.addon.vertical,
    releasePhase: row.addon.releasePhase,
    comingSoon: row.addon.comingSoon,
    isActive: row.addon.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const marketingInclude = {
  addon: {
    select: {
      slug: true,
      name: true,
      group: true,
      description: true,
      features: true,
      priceCents: true,
      tenantPriceCents: true,
      minTenantSeats: true,
      isPaid: true,
      addonKind: true,
      vertical: true,
      releasePhase: true,
      comingSoon: true,
      isActive: true,
    },
  },
} as const;

export async function listPublishedAddonMarketing() {
  const rows = await prisma.addonMarketing.findMany({
    where: { isPublished: true, addon: { isActive: true } },
    include: marketingInclude,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serializeMarketing);
}

export async function listAllAddonMarketing() {
  const rows = await prisma.addonMarketing.findMany({
    include: marketingInclude,
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serializeMarketing);
}

export type AddonSubscriber = {
  tenantName: string;
  tenantSlug: string;
  userEmail?: string;
  userName?: string | null;
  scope: "trial" | "user" | "tenant";
  status: "trial" | "active";
  subscriptionDate: string;
  expiryDate: string | null;
  seats?: number;
  priceCents?: number;
};

export type AdminAddonRecord = {
  id: string;
  slug: string;
  name: string;
  group: string;
  groupLabel: string;
  vertical: AddonVertical;
  verticalLabel: string;
  description: string;
  features: string[];
  priceCents: number;
  tenantPriceCents: number;
  minTenantSeats: number;
  isPaid: boolean;
  addonKind: string;
  sortOrder: number;
  isActive: boolean;
  releasePhase: 1 | 2 | 3;
  comingSoon: boolean;
  deletedAt: string | null;
  marketingId: string | null;
  hasMarketing: boolean;
  marketing: ReturnType<typeof serializeMarketing> | null;
  subscribers: AddonSubscriber[];
  subscriberCount: number;
};

function serializeAdminAddon(
  addon: {
    id: string;
    slug: string;
    name: string;
    group: string;
    description: string;
    features: string;
    priceCents: number;
    tenantPriceCents: number;
    minTenantSeats: number;
    isPaid: boolean;
    addonKind: string;
    vertical: string;
    releasePhase: number;
    comingSoon: boolean;
    sortOrder: number;
    isActive: boolean;
    deletedAt: Date | null;
    marketing: {
      id: string;
      addonId: string;
      marketingTitle: string | null;
      marketingSubtitle: string | null;
      longDescription: string | null;
      badge: string | null;
      displayPriceCents: number;
      trialDays: number;
      ctaLabel: string;
      landingFeatured: boolean;
      sortOrder: number;
      isPublished: boolean;
      updatedAt: Date;
    } | null;
  },
  subscribersByAddonId: Map<string, AddonSubscriber[]>,
): AdminAddonRecord {
  const catalog = getCatalogEntry(addon.slug);
  const vertical = (addon.vertical as AddonVertical) ?? catalog?.vertical ?? "platform";
  let features: string[] = [];
  try {
    features = JSON.parse(addon.features) as string[];
  } catch {
    features = [];
  }

  const marketing = addon.marketing
    ? serializeMarketing({
        ...addon.marketing,
        addon: {
          slug: addon.slug,
          name: addon.name,
          group: addon.group,
          description: addon.description,
          features: addon.features,
          priceCents: addon.priceCents,
          tenantPriceCents: addon.tenantPriceCents,
          minTenantSeats: addon.minTenantSeats,
          isPaid: addon.isPaid,
          addonKind: addon.addonKind,
          vertical: addon.vertical,
          releasePhase: addon.releasePhase,
          comingSoon: addon.comingSoon,
          isActive: addon.isActive,
        },
      })
    : null;

  const subscribers = subscribersByAddonId.get(addon.id) ?? [];

  return {
    id: addon.id,
    slug: addon.slug,
    name: addon.name,
    group: addon.group,
    groupLabel: ADDON_GROUP_LABELS[addon.group as AddonGroup] ?? addon.group,
    vertical,
    verticalLabel: ADDON_VERTICAL_LABELS[vertical],
    description: addon.description,
    features,
    priceCents: addon.priceCents,
    tenantPriceCents: addon.tenantPriceCents,
    minTenantSeats: addon.minTenantSeats,
    isPaid: addon.isPaid,
    addonKind: addon.addonKind,
    sortOrder: addon.sortOrder,
    isActive: addon.isActive,
    releasePhase: (addon.releasePhase as 1 | 2 | 3) ?? catalog?.releasePhase ?? 1,
    comingSoon: addon.comingSoon || catalog?.comingSoon || false,
    deletedAt: addon.deletedAt?.toISOString() ?? null,
    marketingId: addon.marketing?.id ?? null,
    hasMarketing: Boolean(addon.marketing),
    marketing,
    subscribers,
    subscriberCount: subscribers.length,
  };
}

async function loadAddonSubscribers(): Promise<Map<string, AddonSubscriber[]>> {
  const [trials, subscriptions, userSubscriptions] = await Promise.all([
    prisma.tenantAddonTrial.findMany({
      where: { status: "active", endsAt: { gt: new Date() } },
      include: { tenant: { select: { name: true, slug: true } } },
    }),
    prisma.tenantAddonSubscription.findMany({
      where: { status: "active" },
      include: { tenant: { select: { name: true, slug: true } } },
    }),
    prisma.userAddonSubscription.findMany({
      where: { status: "active" },
      include: {
        tenant: { select: { name: true, slug: true } },
        user: { select: { email: true, displayName: true } },
      },
    }),
  ]);

  const map = new Map<string, AddonSubscriber[]>();

  for (const sub of subscriptions) {
    const list = map.get(sub.addonId) ?? [];
    list.push({
      tenantName: sub.tenant.name,
      tenantSlug: sub.tenant.slug,
      scope: "tenant",
      status: "active",
      subscriptionDate: sub.createdAt.toISOString(),
      expiryDate: sub.currentPeriodEnd?.toISOString() ?? null,
      seats: sub.seats,
      priceCents: sub.priceCentsPerSeat,
    });
    map.set(sub.addonId, list);
  }

  for (const sub of userSubscriptions) {
    const list = map.get(sub.addonId) ?? [];
    list.push({
      tenantName: sub.tenant.name,
      tenantSlug: sub.tenant.slug,
      userEmail: sub.user.email,
      userName: sub.user.displayName,
      scope: "user",
      status: "active",
      subscriptionDate: sub.createdAt.toISOString(),
      expiryDate: sub.currentPeriodEnd?.toISOString() ?? null,
      priceCents: sub.priceCents,
    });
    map.set(sub.addonId, list);
  }

  for (const trial of trials) {
    const existing = map.get(trial.addonId) ?? [];
    if (existing.some((s) => s.tenantSlug === trial.tenant.slug)) continue;
    existing.push({
      tenantName: trial.tenant.name,
      tenantSlug: trial.tenant.slug,
      scope: "trial",
      status: "trial",
      subscriptionDate: trial.startedAt.toISOString(),
      expiryDate: trial.endsAt.toISOString(),
    });
    map.set(trial.addonId, existing);
  }

  return map;
}

/** Full catalog for super-admin: every Addon row with optional marketing overlay. */
export async function listAllAddonsForAdmin(): Promise<AdminAddonRecord[]> {
  const [rows, subscribersByAddonId] = await Promise.all([
    prisma.addon.findMany({
      orderBy: { sortOrder: "asc" },
      include: { marketing: true },
    }),
    loadAddonSubscribers(),
  ]);
  return rows.map((row) => serializeAdminAddon(row, subscribersByAddonId));
}

export async function updateAddonRecord(
  id: string,
  input: {
    slug?: string;
    name?: string;
    group?: string;
    vertical?: AddonVertical;
    addonKind?: string;
    description?: string;
    features?: string[];
    priceCents?: number;
    tenantPriceCents?: number;
    minTenantSeats?: number;
    isPaid?: boolean;
    releasePhase?: 1 | 2 | 3;
    comingSoon?: boolean;
    isActive?: boolean;
    sortOrder?: number;
  },
): Promise<AdminAddonRecord> {
  const row = await prisma.addon.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.group !== undefined ? { group: input.group } : {}),
      ...(input.vertical !== undefined ? { vertical: input.vertical } : {}),
      ...(input.addonKind !== undefined ? { addonKind: input.addonKind } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.features !== undefined ? { features: JSON.stringify(input.features) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
      ...(input.tenantPriceCents !== undefined ? { tenantPriceCents: input.tenantPriceCents } : {}),
      ...(input.minTenantSeats !== undefined ? { minTenantSeats: input.minTenantSeats } : {}),
      ...(input.isPaid !== undefined ? { isPaid: input.isPaid } : {}),
      ...(input.releasePhase !== undefined ? { releasePhase: input.releasePhase } : {}),
      ...(input.comingSoon !== undefined ? { comingSoon: input.comingSoon } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive === true ? { deletedAt: null } : {}),
    },
    include: { marketing: true },
  });
  const subscribersByAddonId = await loadAddonSubscribers();
  return serializeAdminAddon(row, subscribersByAddonId);
}

export async function createAddonRecord(input: {
  slug: string;
  name: string;
  group: string;
  vertical: AddonVertical;
  addonKind?: string;
  description: string;
  features: string[];
  priceCents?: number;
  tenantPriceCents?: number;
  minTenantSeats?: number;
  isPaid?: boolean;
  releasePhase?: 1 | 2 | 3;
  comingSoon?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<AdminAddonRecord> {
  const entryLike = {
    slug: input.slug,
    vertical: input.vertical,
    priceCents: input.priceCents ?? 0,
  };
  const row = await prisma.addon.create({
    data: {
      slug: input.slug,
      name: input.name,
      group: input.group,
      vertical: input.vertical,
      addonKind: input.addonKind ?? resolveAddonKind(entryLike),
      description: input.description,
      features: JSON.stringify(input.features),
      priceCents: input.priceCents ?? resolveAddonUserPriceCents(entryLike),
      tenantPriceCents: input.tenantPriceCents ?? resolveAddonTenantSeatPriceCents(entryLike),
      minTenantSeats: input.minTenantSeats ?? resolveAddonMinTenantSeats(entryLike),
      isPaid: input.isPaid ?? resolveAddonIsPaid(entryLike),
      releasePhase: input.releasePhase ?? 1,
      comingSoon: input.comingSoon ?? false,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    include: { marketing: true },
  });
  const subscribersByAddonId = await loadAddonSubscribers();
  return serializeAdminAddon(row, subscribersByAddonId);
}

export async function softDeleteAddonRecord(id: string): Promise<void> {
  await prisma.addon.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
}

export async function syncAddonCatalogAdmin(): Promise<{ addonCount: number; marketingCount: number }> {
  const { seedAddonCatalog } = await import("./addon.service.js");
  await seedAddonCatalog();
  await seedAddonMarketing();
  const [addonCount, marketingCount] = await Promise.all([
    prisma.addon.count(),
    prisma.addonMarketing.count(),
  ]);
  return { addonCount, marketingCount };
}

async function resolveAddonId(input: AddonMarketingInput): Promise<string> {
  if (input.addonId) return input.addonId;
  if (!input.addonSlug) throw new Error("addonId or addonSlug required");
  const addon = await prisma.addon.findFirst({ where: { slug: input.addonSlug } });
  if (!addon) throw new Error(`Addon not found: ${input.addonSlug}`);
  return addon.id;
}

export async function createAddonMarketing(input: AddonMarketingInput) {
  const addonId = await resolveAddonId(input);
  const row = await prisma.addonMarketing.create({
    data: {
      addonId,
      marketingTitle: input.marketingTitle ?? null,
      marketingSubtitle: input.marketingSubtitle ?? null,
      longDescription: input.longDescription ?? null,
      badge: input.badge ?? null,
      displayPriceCents: input.displayPriceCents ?? 0,
      trialDays: input.trialDays ?? 7,
      ctaLabel: input.ctaLabel ?? "Start free trial",
      landingFeatured: input.landingFeatured ?? false,
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
    },
    include: marketingInclude,
  });
  return serializeMarketing(row);
}

export async function updateAddonMarketing(id: string, input: Partial<AddonMarketingInput>) {
  const row = await prisma.addonMarketing.update({
    where: { id },
    data: {
      ...(input.marketingTitle !== undefined ? { marketingTitle: input.marketingTitle } : {}),
      ...(input.marketingSubtitle !== undefined ? { marketingSubtitle: input.marketingSubtitle } : {}),
      ...(input.longDescription !== undefined ? { longDescription: input.longDescription } : {}),
      ...(input.badge !== undefined ? { badge: input.badge } : {}),
      ...(input.displayPriceCents !== undefined ? { displayPriceCents: input.displayPriceCents } : {}),
      ...(input.trialDays !== undefined ? { trialDays: input.trialDays } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
      ...(input.landingFeatured !== undefined ? { landingFeatured: input.landingFeatured } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
    include: marketingInclude,
  });
  return serializeMarketing(row);
}

export async function deleteAddonMarketing(id: string): Promise<void> {
  await prisma.addonMarketing.delete({ where: { id } });
}

function marketingDefaults(entry: (typeof ADDON_CATALOG)[number]) {
  const isPaid = resolveAddonIsPaid(entry);
  const priceCents = resolveAddonUserPriceCents(entry);
  const badge = entry.comingSoon ? "Coming soon" : isPaid ? "Paid addon" : "Included";
  const featured = entry.releasePhase <= 2 && !entry.comingSoon;
  return {
    marketingTitle: entry.name,
    marketingSubtitle: ADDON_GROUP_LABELS[entry.group],
    longDescription: entry.description,
    badge,
    displayPriceCents: priceCents,
    trialDays: 0,
    ctaLabel: entry.comingSoon ? "Notify me" : isPaid ? "Start subscription" : "View addon",
    landingFeatured: featured,
    sortOrder: entry.sortOrder,
    isPublished: true,
  };
}

/** Creates marketing rows for catalog add-ons that are missing one (does not overwrite admin edits). */
export async function ensureAddonMarketing(): Promise<void> {
  const addons = await prisma.addon.findMany();
  const bySlug = new Map(addons.map((a) => [a.slug, a]));

  for (const entry of ADDON_CATALOG) {
    const addon = bySlug.get(entry.slug);
    if (!addon) continue;

    const existing = await prisma.addonMarketing.findUnique({ where: { addonId: addon.id } });
    if (existing) continue;

    await prisma.addonMarketing.create({
      data: {
        addonId: addon.id,
        ...marketingDefaults(entry),
      },
    });
  }
}

/** Full upsert from catalog — used by db seed and explicit admin sync. */
export async function seedAddonMarketing(): Promise<void> {
  const addons = await prisma.addon.findMany();
  const bySlug = new Map(addons.map((a) => [a.slug, a]));

  for (const entry of ADDON_CATALOG) {
    const addon = bySlug.get(entry.slug);
    if (!addon) continue;

    const defaults = marketingDefaults(entry);

    await prisma.addonMarketing.upsert({
      where: { addonId: addon.id },
      create: {
        addonId: addon.id,
        ...defaults,
      },
      update: defaults,
    });
  }
}
