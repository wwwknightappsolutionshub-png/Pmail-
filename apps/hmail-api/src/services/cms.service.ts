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
  metaTitle?: string | null;
  metaDescription?: string | null;
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
    metaTitle: section.metaTitle,
    metaDescription: section.metaDescription,
    sortOrder: section.sortOrder,
    isPublished: section.isPublished,
    updatedAt: section.updatedAt.toISOString(),
  };
}

/** Public sections — admin edits are served as stored (no copy override). */
function normalizePublicSection(section: SiteSection) {
  return serializeSection(section);
}

export async function listPublishedSections() {
  const sections = await prisma.siteSection.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
  return sections.map(normalizePublicSection);
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
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
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
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined ? { metaDescription: input.metaDescription } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
    },
  });
  return serializeSection(section);
}

export async function deleteSection(id: string): Promise<void> {
  await prisma.siteSection.delete({ where: { id } });
}

export async function reorderSections(order: { id: string; sortOrder: number }[]) {
  await prisma.$transaction(
    order.map(({ id, sortOrder }) =>
      prisma.siteSection.update({
        where: { id },
        data: { sortOrder },
      }),
    ),
  );
  const sections = await prisma.siteSection.findMany({ orderBy: { sortOrder: "asc" } });
  return sections.map(serializeSection);
}

export const DEFAULT_SITE_SECTIONS: SiteSectionInput[] = [
  {
    sectionKey: "hero",
    title: "Enterprise infrastructure for modern teams",
    subtitle: "Without the enterprise friction.",
    body: "Prohost Cloud unifies web hosting, control panels, branded mail, and VPS infrastructure — built for agencies, SaaS organizations, and teams that need scale, isolation, and a single operational layer.",
    bulletPoints: ["99.9%|Uptime SLA", "24/7|Ops coverage", "Multi-tenant|Isolation"],
    ctaLabel: "Register for custom pricing",
    ctaUrl: "#register",
    sortOrder: 10,
  },
  {
    sectionKey: "enterprise",
    title: "Enterprise-grade hosting platform",
    subtitle: "Purpose-built for resellers, agencies, and growing product teams.",
    body: "Provision client accounts in minutes, enforce quotas automatically, and give every customer a polished panel experience — without stitching together five different vendors.",
    bulletPoints: [
      "White-label control panel|Your brand, your domain, your customer experience.",
      "Multi-tenant admin|Manage tenants, mail users, hosting accounts, and VPS from one dashboard.",
      "Usage & billing ready|Disk, bandwidth, and mailbox quotas with real-time metering.",
      "API-first operations|Automate provisioning and integrate with your internal tools.",
    ],
    ctaLabel: null,
    ctaUrl: null,
    sortOrder: 20,
  },
  {
    sectionKey: "solutions",
    title: "Built for how your organization operates",
    subtitle: "From your first production deploy to multi-region workloads.",
    body: "Whether you host client sites, run a SaaS product, or manage mission-critical apps, Prohost Cloud adapts to your operating model.",
    bulletPoints: [
      "Agencies & resellers|Onboard clients fast with isolated accounts and branded mail.",
      "SaaS & startups|Scale app traffic with NVMe storage and optional VPS expansion.",
      "E-commerce|SSL everywhere, reliable mail delivery, and database tooling in one panel.",
      "Regulated teams|Audit-friendly admin actions, session controls, and backup workflows.",
    ],
    sortOrder: 30,
  },
  {
    sectionKey: "platform",
    title: "One platform. Four integrated products.",
    subtitle: "Hosting panel, professional mail, cloud compute, and AI growth — integrated by design.",
    body: "Customers sign in once. Your team manages everything from a unified admin console.",
    bulletPoints: [
      "Prohost Cloud Panel|Files, databases, domains, SSL, and email quotas in a cPanel-style UI.",
      "PMail+|Branded webmail on your domain with workflow add-ons and contact management.",
      "VPS & compute|Provision cloud instances, track status, and attach workloads to tenants.",
      "Prohost Growth|AI marketing workspace — wizard, personas, content studio, and publish to your site.",
    ],
    sortOrder: 40,
  },
  {
    sectionKey: "growth_cta",
    title: "Marketing Department in a Box",
    subtitle: "Prohost Growth",
    body: "Complete a guided onboarding wizard and receive personas, positioning, SEO recommendations, homepage copy, blog posts, social content, and email sequences — then publish drafts to your panel site.",
    bulletPoints: [
      "6-step onboarding|Business, customers, competitors, offers, tone, and assets.",
      "Day-one content bundle|Strategy, copy, blogs, social, and nurture email in one studio.",
      "Publish to your site|Push homepage and blog HTML into public_html from the panel.",
    ],
    ctaLabel: "Start growth setup",
    ctaUrl: "/panel/login?return=/growth/onboarding",
    sortOrder: 42,
  },
  {
    sectionKey: "features",
    title: "Built like infrastructure, feels like software",
    subtitle: "Everything you expect from modern hosting — in one place.",
    body: "File manager, databases, domain controls, and email — unified under a single panel login.",
    bulletPoints: ["cPanel-style dashboard", "Usage graphs & quotas", "Multi-tenant admin for resellers"],
    sortOrder: 50,
  },
  {
    sectionKey: "trust",
    title: "Security and reliability you can stand behind",
    subtitle: "Operational practices designed for teams selling to their own customers.",
    body: "We build for production — not demo-day uptime charts.",
    bulletPoints: [
      "TLS on every edge",
      "Tenant-scoped data isolation",
      "Admin audit trail",
      "Automated backups",
      "24/7 platform monitoring",
      "Disaster-recovery ready architecture",
    ],
    sortOrder: 60,
  },
  {
    sectionKey: "hosting_intro",
    title: "Plans that scale with your traffic",
    subtitle: "From a single landing page to multi-site portfolios.",
    body: "Pick shared hosting today. Upgrade bandwidth and mailboxes as your projects grow — no migration headaches.",
    bulletPoints: ["Instant provisioning", "Daily backups", "24/7 panel access"],
    sortOrder: 90,
    isPublished: false,
  },
  {
    sectionKey: "hmail_addons",
    title: "Bespoke Mail Client",
    subtitle: null,
    body: "Custom mail panel with unique tools needed by your industry for better productivity and elevated experience.",
    bulletPoints: [],
    ctaLabel: "View use cases",
    ctaUrl: "/use-case",
    sortOrder: 70,
  },
  {
    sectionKey: "testimonials",
    title: "What our customers say",
    subtitle: "Testimonials",
    body: "Rated highly by teams running hosting, mail, and bespoke workflows on Prohost Cloud.",
    bulletPoints: [],
    sortOrder: 75,
  },
  {
    sectionKey: "contact",
    title: "Register for a tailored quote",
    subtitle: "Tell us about your tenants, traffic, and compliance needs.",
    body: "Every Prohost Cloud deployment is priced to your requirements — no public rate cards. Submit your details and our team will respond with custom options.",
    ctaLabel: "Register & get custom pricing",
    ctaUrl: "#register",
    sortOrder: 80,
  },
  {
    sectionKey: "cta_footer",
    title: "Ready to move beyond shared hosting?",
    subtitle: "Sign in to your panel or speak with our team about an enterprise rollout.",
    ctaLabel: "Open panel",
    ctaUrl: "/panel/login",
    sortOrder: 100,
    isPublished: false,
  },
];

export async function cleanupLegacySiteSections(): Promise<void> {
  const legacyKeys = ["register", "footer", "hmail_intro"];
  await prisma.siteSection.deleteMany({ where: { sectionKey: { in: legacyKeys } } });
}

export async function seedSiteSections(): Promise<void> {
  await cleanupLegacySiteSections();

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
        isPublished: section.isPublished ?? true,
      },
      update: {
        title: section.title,
        subtitle: section.subtitle ?? null,
        body: section.body ?? null,
        bulletPoints: section.bulletPoints ? JSON.stringify(section.bulletPoints) : null,
        ctaLabel: section.ctaLabel ?? null,
        ctaUrl: section.ctaUrl ?? null,
        sortOrder: section.sortOrder ?? 0,
        ...(section.isPublished !== undefined ? { isPublished: section.isPublished } : {}),
      },
    });
  }
}
