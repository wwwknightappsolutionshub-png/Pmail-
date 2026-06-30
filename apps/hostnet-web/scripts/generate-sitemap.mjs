#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const distDir = resolve(appRoot, "dist");
config({ path: resolve(appRoot, "../../.env") });

const apiBase = (process.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const origin =
  process.env.VITE_HOSTNET_WEB_URL?.replace(/\/$/, "") ||
  process.env.PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://prohost.cloud";

const fallbackPaths = [
  "/",
  "/use-case",
  "/hosting",
  "/addons",
  "/use-case/demo/legal",
  "/use-case/demo/real-estate",
  "/use-case/demo/accounting",
  "/use-case/demo/recruitment",
  "/use-case/demo/b2b-services",
  "/use-case/demo/healthcare",
];

function buildXml(paths) {
  const now = new Date().toISOString().slice(0, 10);
  const urls = paths
    .map((path) => {
      const priority = path === "/" ? "1.0" : path.startsWith("/use-case/demo/") ? "0.8" : "0.9";
      return `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq>
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

let xml = buildXml(fallbackPaths);
try {
  const res = await fetch(`${apiBase}/api/public/sitemap.xml`, { signal: AbortSignal.timeout(8000) });
  if (res.ok) {
    const body = await res.text();
    if (body.includes("<urlset")) xml = body;
  }
} catch (err) {
  console.warn("[generate-sitemap] API unavailable, using fallback paths:", err instanceof Error ? err.message : err);
}

await mkdir(distDir, { recursive: true });
await writeFile(resolve(distDir, "sitemap.xml"), xml, "utf8");
await writeFile(resolve(appRoot, "public/sitemap.xml"), xml, "utf8");
console.log(`Wrote sitemap.xml for ${origin}`);
