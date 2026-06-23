import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const svg = readFileSync(resolve(publicDir, "favicon.svg"));

const targets = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "pwa-192.png", size: 192 },
  { file: "pwa-512.png", size: 512 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size, { fit: "contain", background: "#0f2744" }).png().toFile(resolve(publicDir, file));
  console.log(`Wrote ${file} (${size}x${size})`);
}
