export type PageSeoConfig = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: string;
  ogImagePath?: string;
  locale?: string;
  hreflang?: Array<{ locale: string; path: string }>;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const JSON_LD_ID = "page-seo-jsonld";

function upsertMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function getMarketingSiteOrigin(): string {
  const configured = import.meta.env.VITE_HOSTNET_WEB_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://prohost.cloud";
}

export function buildCanonicalUrl(origin: string, path: string): string {
  const base = origin.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function applyPageSeo(config: PageSeoConfig, origin = getMarketingSiteOrigin()) {
  const path = config.canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = buildCanonicalUrl(origin, path);
  const imagePath = config.ogImagePath ?? "/og-image.png";
  const imageUrl = buildCanonicalUrl(origin, imagePath);

  document.title = config.title;
  upsertMeta("description", config.description);
  if (config.keywords) upsertMeta("keywords", config.keywords);
  upsertMeta("robots", config.robots ?? "index,follow");
  upsertLink("canonical", url);

  upsertMeta("og:title", config.title, "property");
  upsertMeta("og:description", config.description, "property");
  upsertMeta("og:url", url, "property");
  upsertMeta("og:type", config.ogType ?? "website", "property");
  upsertMeta("og:site_name", "Prohost Cloud", "property");
  upsertMeta("og:image", imageUrl, "property");
  upsertMeta("og:locale", config.locale ?? "en_CA", "property");

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
  if (config.hreflang?.length) {
    for (const alt of config.hreflang) {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = alt.locale;
      link.href = buildCanonicalUrl(origin, alt.path);
      document.head.appendChild(link);
    }
    const defaultAlt = document.createElement("link");
    defaultAlt.rel = "alternate";
    defaultAlt.hreflang = "x-default";
    defaultAlt.href = url;
    document.head.appendChild(defaultAlt);
  }

  upsertMeta("twitter:card", "summary_large_image");
  upsertMeta("twitter:title", config.title);
  upsertMeta("twitter:description", config.description);
  upsertMeta("twitter:image", imageUrl);

  document.getElementById(JSON_LD_ID)?.remove();
  if (config.jsonLd) {
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(config.jsonLd);
    document.head.appendChild(script);
  }
}
