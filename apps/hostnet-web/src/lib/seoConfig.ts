import { BESPOKE_MAIL_USE_CASES } from "../data/bespokeMailUseCases";
import { buildCanonicalUrl, getMarketingSiteOrigin, type PageSeoConfig } from "./seo";

const BRAND = "Prohost Cloud";
const PMAIL = "PMail+";

const DEFAULT_KEYWORDS =
  "enterprise hosting, white-label hosting, reseller hosting panel, VPS hosting, branded business email, PMail+, Prohost Cloud, multi-tenant hosting, Canadian hosting platform";

function parseSocialProfiles(): string[] {
  const raw = import.meta.env.VITE_SOCIAL_PROFILE_URLS as string | undefined;
  if (!raw?.trim()) return [];
  return raw.split(",").map((url) => url.trim()).filter(Boolean);
}

function organizationJsonLd(origin: string) {
  const sameAs = parseSocialProfiles();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND,
    url: origin,
    logo: buildCanonicalUrl(origin, "/og-image.png"),
    description:
      "Enterprise hosting, branded mail (PMail+), control panels, and VPS infrastructure for modern teams and resellers.",
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

function webSiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    url: origin,
    description: "Enterprise infrastructure for modern teams — hosting, PMail+ branded mail, and VPS.",
    publisher: { "@type": "Organization", name: BRAND },
  };
}

function softwareJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PMAIL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
    description:
      "Branded cloud mail workspace with open tracking, file vault, industry vertical tools, and workspace add-ons.",
    url: import.meta.env.VITE_HMAIL_URL?.replace(/\/login\/?$/, "") || "https://mail.prohost.cloud",
    provider: { "@type": "Organization", name: BRAND, url: origin },
  };
}

const DEMO_SEO: Record<
  string,
  { title: string; description: string; keywords: string }
> = {
  legal: {
    title: `Law Firm Email Software Demo | Bespoke Mail for Legal | ${BRAND}`,
    description:
      "See how PMail+ Bespoke Mail helps law firms manage client matters, court deadlines, and confidential documents from one branded inbox.",
    keywords:
      "law firm email software, legal practice mail, matter management email, client portal mail, legal webmail Canada",
  },
  "real-estate": {
    title: `Real Estate Agent Email Platform Demo | ${BRAND}`,
    description:
      "Interactive demo: listing workflows, buyer follow-ups, and mobile-friendly mail for real estate agencies on PMail+.",
    keywords:
      "real estate agent email, property CRM email, listing workflow mail, realtor webmail, real estate mail platform",
  },
  accounting: {
    title: `Accounting Firm Email & Document Exchange Demo | ${BRAND}`,
    description:
      "Explore Bespoke Mail for accounting and bookkeeping firms — tax-season document requests, filing reminders, and secure client mail.",
    keywords:
      "accounting firm email, bookkeeping client mail, tax document exchange, CPA webmail, accounting practice software",
  },
  recruitment: {
    title: `Recruiter Email Platform Demo | Staffing Agency Mail | ${BRAND}`,
    description:
      "See recruitment and staffing workflows in PMail+: candidate pipelines, interview scheduling, and high-volume recruiter mail.",
    keywords:
      "recruiter email platform, staffing agency mail, candidate pipeline email, recruitment CRM mail, talent acquisition inbox",
  },
  "b2b-services": {
    title: `B2B Professional Services Email Workspace Demo | ${BRAND}`,
    description:
      "Consultancies, agencies, and MSPs: multi-client project mail, SLA monitoring, and proposal workflows in one workspace.",
    keywords:
      "B2B email workspace, consultancy client mail, MSP email platform, professional services webmail, SLA email monitoring",
  },
  healthcare: {
    title: `Healthcare Practice Email Demo | HIPAA-Aware Mail | ${BRAND}`,
    description:
      "Patient inquiries, referrals, and care coordination email for medical practices — organized, auditable, HIPAA-aware workflows.",
    keywords:
      "healthcare practice email, medical office webmail, patient referral mail, clinical coordination inbox, HIPAA-aware email",
  },
};

const NOINDEX: PageSeoConfig = {
  title: `${BRAND}`,
  description: "Sign in or manage your Prohost Cloud workspace.",
  robots: "noindex, nofollow",
};

const DEFAULT_OG = "/og-image.png";

function breadcrumbJsonLd(origin: string, items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(origin, item.path),
    })),
  };
}

function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveMarketingSeo(
  pathname: string,
  params?: { useCaseId?: string; planSlug?: string; addonSlug?: string },
): PageSeoConfig {
  const origin = getMarketingSiteOrigin();
  const useCaseId = params?.useCaseId;

  if (pathname === "/") {
    return {
      title: `${BRAND} — Enterprise Hosting, PMail+ Branded Mail & VPS`,
      description:
        "Prohost Cloud unifies enterprise web hosting, white-label control panels, PMail+ branded business email, and VPS infrastructure — without enterprise friction.",
      keywords: DEFAULT_KEYWORDS,
      canonicalPath: "/",
      ogImagePath: DEFAULT_OG,
      jsonLd: [organizationJsonLd(origin), webSiteJsonLd(origin), softwareJsonLd(origin)],
    };
  }

  if (pathname === "/hosting") {
    return {
      title: `Web Hosting Plans | SSD Hosting & Branded Mail | ${BRAND}`,
      description:
        "Compare Prohost Cloud hosting plans with SSD storage, mail accounts, databases, and panel access for agencies, resellers, and growing teams.",
      keywords: "web hosting plans, SSD hosting Canada, reseller hosting, business hosting with email, Prohost Cloud hosting",
      canonicalPath: "/hosting",
      ogImagePath: DEFAULT_OG,
    };
  }

  const hostingMatch = pathname.match(/^\/hosting\/([^/]+)$/);
  if (hostingMatch) {
    const slug = params?.planSlug ?? hostingMatch[1];
    const label = slugToLabel(slug);
    return {
      title: `${label} Hosting Plan | ${BRAND}`,
      description: `Explore the ${label} hosting plan on Prohost Cloud — SSD storage, mail accounts, databases, and scalable infrastructure.`,
      keywords: `${label.toLowerCase()} hosting plan, business web hosting, Prohost Cloud ${slug} plan`,
      canonicalPath: `/hosting/${slug}`,
      ogImagePath: DEFAULT_OG,
      jsonLd: breadcrumbJsonLd(origin, [
        { name: "Home", path: "/" },
        { name: "Hosting", path: "/hosting" },
        { name: label, path: `/hosting/${slug}` },
      ]),
    };
  }

  if (pathname === "/addons") {
    return {
      title: `PMail+ Add-ons Marketplace | Workspace & Industry Tools | ${BRAND}`,
      description:
        "Browse PMail+ workspace add-ons: open tracking, file vault, Job Hunter, e-sign, SLA tools, and industry vertical workspaces.",
      keywords: "PMail+ add-ons, mail workspace tools, email open tracking, file vault mail, industry mail software",
      canonicalPath: "/addons",
      ogImagePath: DEFAULT_OG,
    };
  }

  const addonMatch = pathname.match(/^\/addons\/([^/]+)$/);
  if (addonMatch) {
    const slug = params?.addonSlug ?? addonMatch[1];
    const label = slugToLabel(slug.replace(/-functionality$/, "").replace(/-/g, " "));
    return {
      title: `${label} for PMail+ | Workspace Add-on | ${BRAND}`,
      description: `Learn how ${label} extends your PMail+ inbox with workspace tools, trials, and industry-ready workflows on Prohost Cloud.`,
      keywords: `PMail+ ${slug}, mail workspace add-on, ${label} email tool`,
      canonicalPath: `/addons/${slug}`,
      ogImagePath: DEFAULT_OG,
      jsonLd: breadcrumbJsonLd(origin, [
        { name: "Home", path: "/" },
        { name: "Add-ons", path: "/addons" },
        { name: label, path: `/addons/${slug}` },
      ]),
    };
  }

  if (pathname === "/use-case") {
    return {
      title: `Bespoke Mail for Email-First Industries | ${PMAIL} Use Cases | ${BRAND}`,
      description:
        "Industry-tailored PMail+ workspaces for law, real estate, accounting, recruitment, B2B services, and healthcare — built for teams that live in email.",
      keywords:
        "bespoke mail client, industry email workspace, professional webmail, vertical mail software, PMail+ industries, email-first business software",
      canonicalPath: "/use-case",
      ogImagePath: DEFAULT_OG,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Bespoke Mail industry use cases",
        description: "Email-first industry workspaces powered by PMail+ and Prohost Cloud.",
        url: buildCanonicalUrl(origin, "/use-case"),
        isPartOf: { "@type": "WebSite", name: BRAND, url: origin },
      },
    };
  }

  const demoMatch = pathname.match(/^\/use-case\/demo\/([^/]+)$/);
  if (demoMatch) {
    const id = useCaseId ?? demoMatch[1];
    const preset = DEMO_SEO[id];
    const useCase = BESPOKE_MAIL_USE_CASES.find((entry) => entry.id === id);
    if (preset && useCase) {
      return {
        title: preset.title,
        description: preset.description,
        keywords: preset.keywords,
        canonicalPath: `/use-case/demo/${id}`,
        ogImagePath: DEFAULT_OG,
        ogType: "website",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: useCase.industry,
            description: useCase.summary,
            url: buildCanonicalUrl(origin, `/use-case/demo/${id}`),
            about: { "@type": "SoftwareApplication", name: PMAIL },
          },
          breadcrumbJsonLd(origin, [
            { name: "Home", path: "/" },
            { name: "Use cases", path: "/use-case" },
            { name: useCase.industry, path: `/use-case/demo/${id}` },
          ]),
        ],
      };
    }
    return {
      ...NOINDEX,
      title: `Demo not found | ${BRAND}`,
      description: "This industry demo is not available.",
      canonicalPath: pathname,
    };
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/panel") ||
    pathname.startsWith("/growth") ||
    pathname.startsWith("/checkout")
  ) {
    return { ...NOINDEX, canonicalPath: pathname };
  }

  return {
    ...NOINDEX,
    title: `${BRAND}`,
    canonicalPath: pathname,
  };
}

export const MARKETING_SITEMAP_PATHS = [
  "/",
  "/use-case",
  "/hosting",
  "/addons",
  ...BESPOKE_MAIL_USE_CASES.map((useCase) => `/use-case/demo/${useCase.id}`),
] as const;
