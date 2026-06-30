#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { chromium } from "playwright";
import sirv from "sirv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const distDir = resolve(appRoot, "dist");
config({ path: resolve(appRoot, "../../.env") });

const apiBase = (process.env.VITE_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

let routes = [
  "/",
  "/use-case",
  "/hosting",
  "/addons",
  "/blog",
  "/use-case/demo/legal",
  "/use-case/demo/real-estate",
  "/use-case/demo/accounting",
  "/use-case/demo/recruitment",
  "/use-case/demo/b2b-services",
  "/use-case/demo/healthcare",
];

try {
  const res = await fetch(`${apiBase}/api/public/sitemap-paths`, { signal: AbortSignal.timeout(8000) });
  if (res.ok) {
    const data = await res.json();
    if (Array.isArray(data.paths) && data.paths.length > 0) routes = data.paths;
  }
} catch (err) {
  console.warn("[prerender] Using default route list:", err instanceof Error ? err.message : err);
}

const serve = sirv(distDir, { dev: false, single: "index.html" });
const port = 4179;

const server = createServer((req, res) => {
  serve(req, res);
});

await new Promise((resolvePromise) => server.listen(port, "127.0.0.1", resolvePromise));

try {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const route of routes) {
    const url = `http://127.0.0.1:${port}${route}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(400);
    const html = await page.content();
    const outPath =
      route === "/"
        ? resolve(distDir, "index.html")
        : resolve(distDir, `${route.replace(/^\//, "")}/index.html`);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
    console.log(`Prerendered ${route}`);
  }

  await browser.close();
} catch (err) {
  console.warn("[prerender] Skipped — install Chromium with: npx playwright install chromium");
  console.warn(err instanceof Error ? err.message : err);
} finally {
  server.close();
}
