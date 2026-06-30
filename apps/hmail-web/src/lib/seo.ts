export type PageSeoConfig = {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: string;
  ogImagePath?: string;
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

export function getPmailSiteOrigin(): string {
  const configured = import.meta.env.VITE_HMAIL_URL?.replace(/\/login\/?$/, "").replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://mail.prohost.cloud";
}

export function buildCanonicalUrl(origin: string, path: string): string {
  const base = origin.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function applyPageSeo(config: PageSeoConfig, origin = getPmailSiteOrigin()) {
  const path = config.canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = buildCanonicalUrl(origin, path);
  const imagePath = config.ogImagePath ?? "/pwa-512.png";
  const imageUrl = buildCanonicalUrl(origin, imagePath);

  document.title = config.title;
  upsertMeta("description", config.description);
  if (config.keywords) upsertMeta("keywords", config.keywords);
  upsertMeta("robots", config.robots ?? "noindex,nofollow");
  upsertLink("canonical", url);

  upsertMeta("og:title", config.title, "property");
  upsertMeta("og:description", config.description, "property");
  upsertMeta("og:url", url, "property");
  upsertMeta("og:type", config.ogType ?? "website", "property");
  upsertMeta("og:site_name", "PMail+", "property");
  upsertMeta("og:image", imageUrl, "property");
  upsertMeta("og:locale", "en_CA", "property");

  upsertMeta("twitter:card", "summary");
  upsertMeta("twitter:title", config.title);
  upsertMeta("twitter:description", config.description);

  document.getElementById(JSON_LD_ID)?.remove();
  if (config.jsonLd) {
    const script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(config.jsonLd);
    document.head.appendChild(script);
  }
}
