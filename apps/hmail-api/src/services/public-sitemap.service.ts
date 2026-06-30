import { listPublishedAddonMarketing } from "./addon-marketing.service.js";
import { listPublishedSections } from "./cms.service.js";
import { listPublicHostingPlans } from "./hosting-plans.service.js";
import { listPublishedPlatformArticles } from "./platform-marketing-article.service.js";

const USE_CASE_DEMO_IDS = [
  "legal",
  "real-estate",
  "accounting",
  "recruitment",
  "b2b-services",
  "healthcare",
] as const;

const STATIC_MARKETING_PATHS = [
  "/",
  "/use-case",
  "/hosting",
  "/addons",
  "/blog",
  ...USE_CASE_DEMO_IDS.map((id) => `/use-case/demo/${id}`),
] as const;

export function resolvePublicSiteOrigin(): string {
  const configured = process.env.PUBLIC_SITE_URL?.trim() || process.env.VITE_HOSTNET_WEB_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const cors = process.env.CORS_ORIGIN?.split(",")[0]?.trim();
  if (cors) return cors.replace(/\/$/, "");
  return "https://prohost.cloud";
}

export async function listPublicSitemapPaths(): Promise<string[]> {
  const [hostingPlans, addonMarketing, articles] = await Promise.all([
    listPublicHostingPlans(),
    listPublishedAddonMarketing(),
    listPublishedPlatformArticles(),
  ]);

  const paths = new Set<string>(STATIC_MARKETING_PATHS);
  for (const plan of hostingPlans) {
    paths.add(`/hosting/${plan.slug}`);
  }
  for (const addon of addonMarketing.filter((entry) => entry.landingFeatured)) {
    paths.add(`/addons/${addon.slug}`);
  }
  for (const article of articles) {
    paths.add(`/blog/${article.slug}`);
  }
  return [...paths].sort();
}

export async function buildPublicSitemapXml(origin = resolvePublicSiteOrigin()): Promise<string> {
  const base = origin.replace(/\/$/, "");
  const paths = await listPublicSitemapPaths();
  const now = new Date().toISOString().slice(0, 10);

  const urls = paths
    .map((path) => {
      const priority = path === "/" ? "1.0" : path.startsWith("/use-case/demo/") ? "0.8" : "0.9";
      const changefreq = path === "/" ? "weekly" : "monthly";
      return `  <url>
    <loc>${base}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export async function getPublicHomeSeo() {
  const sections = await listPublishedSections();
  const hero = sections.find((section) => section.sectionKey === "hero");
  return {
    metaTitle: hero?.metaTitle ?? null,
    metaDescription: hero?.metaDescription ?? null,
    heroTitle: hero?.title ?? null,
    heroSubtitle: hero?.subtitle ?? null,
  };
}
