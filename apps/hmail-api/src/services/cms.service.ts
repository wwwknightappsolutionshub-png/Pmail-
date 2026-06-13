import type { SiteSection } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type SiteSectionInput = {
  sectionKey: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  bulletPoints?: string[] | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
};

function serializeSection(section: SiteSection) {
  let bullets: string[] = [];
  if (section.bulletPoints) {
    try {
      bullets = JSON.parse(section.bulletPoints) as string[];
    } catch {
      bullets = [];
    }
  }
  return {
    id: section.id,
    sectionKey: section.sectionKey,
    title: section.title,
    subtitle: section.subtitle,
    body: section.body,
    bulletPoints: bullets,
    imageUrl: section.imageUrl,
    ctaLabel: section.ctaLabel,
    ctaUrl: section.ctaUrl,
    sortOrder: section.sortOrder,
    isPublished: section.isPublished,
    updatedAt: section.updatedAt.toISOString(),
  };
}

export async function listPublishedSections() {
  const sections = await prisma.siteSection.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
  return sections.map(serializeSection);
}

export async function listAllSections() {
  const sections = await prisma.siteSection.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return sections.map(serializeSection);
}

export async function createSection(input: SiteSectionInput) {
  const section = await prisma.siteSection.create({
    data: {
      sectionKey: input.sectionKey,
      title: input.title,
      subtitle: input.subtitle ?? null,
      body: input.body ?? null,
      bulletPoints: input.bulletPoints ? JSON.stringify(input.bulletPoints) : null,
      imageUrl: input.imageUrl ?? null,
      ctaLabel: input.ctaLabel ?? null,
      ctaUrl: input.ctaUrl ?? null,
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
    },
  });
  return serializeSection(section);
}

export async function updateSection(id: string, input: Partial<SiteSectionInput>) {
  const section = await prisma.siteSection.update({
    where: { id },
    data: {
      ...(input.sectionKey !== undefined ? { sectionKey: input.sectionKey } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.bulletPoints !== undefined
        ? { bulletPoints: input.bulletPoints ? JSON.stringify(input.bulletPoints) : null }
        : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.ctaLabel !== undefined ? { ctaLabel: input.ctaLabel } : {}),
      ...(input.ctaUrl !== undefined ? { ctaUrl: input.ctaUrl } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
  });
  return serializeSection(section);
}

export async function deleteSection(id: string): Promise<void> {
  await prisma.siteSection.delete({ where: { id } });
}

export const DEFAULT_SITE_SECTIONS: SiteSectionInput[] = [
  {
    sectionKey: "hero",
    title: "Your sites. One control panel.",
    subtitle: "Deploy, scale, and manage web hosting without the enterprise price tag.",
    body: "HostNet is a multi-purpose hosting panel — SSD storage, one-click SSL, email, databases, and a cPanel-style dashboard built for builders, agencies, and growing teams.",
    bulletPoints: ["NVMe-backed storage", "Free SSL on every domain", "Real-time usage metrics"],
    ctaLabel: "Explore plans",
    ctaUrl: "#plans",
    sortOrder: 10,
  },
  {
    sectionKey: "hosting_intro",
    title: "Plans that scale with your traffic",
    subtitle: "From a single landing page to multi-site portfolios.",
    body: "Pick shared hosting today. Upgrade bandwidth and mailboxes as your projects grow — no migration headaches.",
    bulletPoints: ["Instant provisioning", "Daily backups", "24/7 panel access"],
    sortOrder: 20,
  },
  {
    sectionKey: "features",
    title: "Built like infrastructure, feels like software",
    subtitle: "Everything you expect from modern hosting — in one place.",
    body: "File manager, databases, domain controls, and email — unified under a single panel login.",
    bulletPoints: ["cPanel-style dashboard", "Usage graphs & quotas", "Multi-tenant admin for resellers"],
    sortOrder: 30,
  },
  {
    sectionKey: "hmail_addons",
    title: "Powered by hmail",
    subtitle: "Optional professional add-ons for teams using our branded webmail product.",
    body: "HostNet hosting pairs with hmail — upgrade your mailbox with workflow add-ons. Trials available from your mail panel.",
    bulletPoints: ["Branded webmail on your domain", "Marketplace add-ons", "7-day free trials"],
    ctaLabel: "See hmail add-ons",
    ctaUrl: "#hmail-addons",
    sortOrder: 40,
  },
  {
    sectionKey: "cta_footer",
    title: "Spin up your first site today",
    subtitle: "Choose a plan or sign in to your hosting panel.",
    ctaLabel: "Open panel",
    ctaUrl: "/panel/login",
    sortOrder: 50,
  },
];

export async function seedSiteSections(): Promise<void> {
  for (const section of DEFAULT_SITE_SECTIONS) {
    await prisma.siteSection.upsert({
      where: { sectionKey: section.sectionKey },
      create: {
        sectionKey: section.sectionKey,
        title: section.title,
        subtitle: section.subtitle ?? null,
        body: section.body ?? null,
        bulletPoints: section.bulletPoints ? JSON.stringify(section.bulletPoints) : null,
        ctaLabel: section.ctaLabel ?? null,
        ctaUrl: section.ctaUrl ?? null,
        sortOrder: section.sortOrder ?? 0,
        isPublished: true,
      },
      update: {
        title: section.title,
        subtitle: section.subtitle ?? null,
        body: section.body ?? null,
        bulletPoints: section.bulletPoints ? JSON.stringify(section.bulletPoints) : null,
        ctaLabel: section.ctaLabel ?? null,
        ctaUrl: section.ctaUrl ?? null,
        sortOrder: section.sortOrder ?? 0,
      },
    });
  }
}
