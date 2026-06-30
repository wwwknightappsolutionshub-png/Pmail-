#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const pmailSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050a12"/>
      <stop offset="100%" stop-color="#0f2744"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="80" y="250" fill="#f8fafc" font-family="Segoe UI, system-ui, sans-serif" font-size="72" font-weight="700">PMail+</text>
  <text x="80" y="330" fill="#5eead4" font-family="Segoe UI, system-ui, sans-serif" font-size="34">Secure branded business email workspace</text>
  <text x="80" y="420" fill="#94a3b8" font-family="Segoe UI, system-ui, sans-serif" font-size="24">Open tracking, file vault, industry tools — powered by Prohost Cloud</text>
</svg>`;

await mkdir(publicDir, { recursive: true });
await sharp(Buffer.from(pmailSvg)).png().toFile(resolve(publicDir, "og-pmail.png"));
console.log("Generated apps/hmail-web/public/og-pmail.png");
