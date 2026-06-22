import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = dirname(fileURLToPath(import.meta.url));
export const MARKETING_UPLOAD_DIR = join(apiRoot, "..", "..", "uploads", "marketing");

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function ensureMarketingUploadDir(): Promise<void> {
  await mkdir(MARKETING_UPLOAD_DIR, { recursive: true });
}

function safeFilename(originalName: string, mimeType: string): string {
  const extFromMime = ALLOWED_MIME[mimeType];
  const extFromName = extname(originalName).toLowerCase();
  const ext = extFromMime ?? (extFromName && extFromName.length <= 5 ? extFromName : ".bin");
  return `${randomUUID()}${ext}`;
}

export function resolveMarketingAssetFile(filename: string): string | null {
  const base = normalize(filename).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) return null;
  const full = resolve(MARKETING_UPLOAD_DIR, base);
  if (!full.startsWith(resolve(MARKETING_UPLOAD_DIR))) return null;
  return full;
}

export async function saveMarketingAsset(input: {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}): Promise<{ url: string; fileName: string }> {
  if (!ALLOWED_MIME[input.mimeType]) {
    throw new Error("Unsupported image type. Use JPEG, PNG, WebP, GIF, or SVG.");
  }

  const buffer = Buffer.from(input.dataBase64, "base64");
  if (buffer.length === 0) throw new Error("Empty file");
  if (buffer.length > MAX_BYTES) throw new Error("Image must be 5 MB or smaller");

  await ensureMarketingUploadDir();
  const storedName = safeFilename(input.fileName, input.mimeType);
  const target = join(MARKETING_UPLOAD_DIR, storedName);
  await writeFile(target, buffer);

  return {
    fileName: storedName,
    url: `/api/public/marketing/assets/${storedName}`,
  };
}
