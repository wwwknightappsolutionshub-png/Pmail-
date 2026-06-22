import type { SiteSection } from "../types/site";

export function parseBulletCard(item: string): { title: string; description: string } {
  const [title, description] = item.split("|").map((part) => part.trim());
  return { title: title ?? item, description: description ?? "" };
}

export function parseMetricBullet(item: string): { value: string; label: string } | null {
  const [value, label] = item.split("|").map((part) => part.trim());
  if (!value || !label) return null;
  return { value, label };
}

export function sectionByKey(sections: SiteSection[], key: string): SiteSection | undefined {
  return sections.find((s) => s.sectionKey === key);
}

export function publishedSections(sections: SiteSection[]): SiteSection[] {
  return sections.filter((s) => s.isPublished);
}

export const LANDING_FALLBACKS = {
  heroMetrics: [
    { value: "99.9%", label: "Uptime SLA" },
    { value: "24/7", label: "Ops coverage" },
    { value: "Multi-tenant", label: "Isolation" },
  ],
  trustStrip: [
    "TLS everywhere",
    "Tenant isolation",
    "Audit trail",
    "Automated backups",
    "Usage metering",
    "Dedicated support",
  ],
  enterprise: [
    "White-label control panel|Your brand, your domain, your customer experience.",
    "Multi-tenant admin|Manage tenants, mail users, hosting accounts, and VPS from one dashboard.",
    "Usage & billing ready|Disk, bandwidth, and mailbox quotas with real-time metering.",
    "API-first operations|Automate provisioning and integrate with your internal tools.",
  ],
  solutions: [
    "Agencies & resellers|Onboard clients fast with isolated accounts and branded mail.",
    "SaaS & startups|Scale app traffic with NVMe storage and optional VPS expansion.",
    "E-commerce|SSL everywhere, reliable mail delivery, and database tooling in one panel.",
    "Regulated teams|Audit-friendly admin actions, session controls, and backup workflows.",
  ],
  platform: [
    "Prohost Cloud Panel|Files, databases, domains, SSL, and email quotas in a cPanel-style UI.",
    "PMail+|Branded webmail on your domain with professional workflow tools.",
    "VPS & compute|Provision cloud instances, track status, and attach workloads to tenants.",
    "Prohost Growth|AI marketing workspace — wizard, content studio, and publish to your site.",
  ],
  growthCta: {
    title: "Marketing Department in a Box",
    subtitle: "Prohost Growth",
    body: "Complete onboarding and get personas, copy, blogs, social posts, and email — then publish to your panel site.",
    ctaLabel: "Start growth setup",
    ctaUrl: "/panel/login?return=/growth/onboarding",
  },
  capabilities: ["cPanel-style dashboard", "Usage graphs & quotas", "Multi-tenant admin for resellers"],
  bespokeMail: {
    title: "Bespoke Mail Client",
    body: "Custom mail panel with unique tools needed by your industry for better productivity and elevated experience.",
    ctaLabel: "View use cases",
    ctaUrl: "/use-case",
  },
} as const;

export function heroMetricsFromSection(hero: SiteSection | undefined) {
  const fromBullets = (hero?.bulletPoints ?? [])
    .map(parseMetricBullet)
    .filter((m): m is { value: string; label: string } => m !== null);
  return fromBullets.length > 0 ? fromBullets : LANDING_FALLBACKS.heroMetrics;
}

export function bulletsOrFallback(section: SiteSection | undefined, fallback: string[]) {
  return section?.bulletPoints?.length ? section.bulletPoints : fallback;
}
