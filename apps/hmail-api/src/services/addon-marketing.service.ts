import { ADDON_CATALOG, ADDON_GROUP_LABELS } from "../data/addon-catalog.js";
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

export async function seedAddonMarketing(): Promise<void> {
  const addons = await prisma.addon.findMany();
  const bySlug = new Map(addons.map((a) => [a.slug, a]));

  for (const entry of ADDON_CATALOG) {
    const addon = bySlug.get(entry.slug);
    if (!addon) continue;

    const badge = entry.comingSoon ? "Coming soon" : entry.priceCents === 0 ? "Free addon" : null;
    const featured = entry.releasePhase <= 2 && !entry.comingSoon;

    await prisma.addonMarketing.upsert({
      where: { addonId: addon.id },
      create: {
        addonId: addon.id,
        marketingTitle: entry.name,
        marketingSubtitle: ADDON_GROUP_LABELS[entry.group],
        longDescription: entry.description,
        badge,
        displayPriceCents: entry.priceCents,
        trialDays: entry.comingSoon ? 0 : 7,
        ctaLabel: entry.comingSoon ? "Notify me" : "Start free trial",
        landingFeatured: featured,
        sortOrder: entry.sortOrder,
        isPublished: true,
      },
      update: {
        marketingTitle: entry.name,
        marketingSubtitle: ADDON_GROUP_LABELS[entry.group],
        longDescription: entry.description,
        badge,
        displayPriceCents: entry.priceCents,
        trialDays: entry.comingSoon ? 0 : 7,
        ctaLabel: entry.comingSoon ? "Notify me" : "Start free trial",
        landingFeatured: featured,
        sortOrder: entry.sortOrder,
      },
    });
  }
}
