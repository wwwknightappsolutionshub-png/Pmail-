import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = dirname(fileURLToPath(import.meta.url));
const GROWTH_UPLOAD_ROOT = join(apiRoot, "..", "..", "uploads", "growth");

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
};

const MAX_BYTES = 10 * 1024 * 1024;

function tenantDir(tenantId: string): string {
  const safe = tenantId.replace(/[^a-zA-Z0-9-]/g, "");
  return join(GROWTH_UPLOAD_ROOT, safe);
}

export async function ensureGrowthUploadDir(tenantId: string): Promise<void> {
  await mkdir(tenantDir(tenantId), { recursive: true });
}

function safeFilename(originalName: string, mimeType: string): string {
  const extFromMime = ALLOWED_MIME[mimeType];
  const extFromName = extname(originalName).toLowerCase();
  const ext = extFromMime ?? (extFromName && extFromName.length <= 5 ? extFromName : ".bin");
  return `${randomUUID()}${ext}`;
}

export function resolveGrowthAssetFile(tenantId: string, filename: string): string | null {
  const base = normalize(filename).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) return null;
  const dir = resolve(tenantDir(tenantId));
  const full = resolve(dir, base);
  if (!full.startsWith(dir)) return null;
  return full;
}

export async function saveGrowthAsset(input: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
}): Promise<{ url: string; fileName: string }> {
  if (!ALLOWED_MIME[input.mimeType]) {
    throw new Error("Unsupported file type for growth assets.");
  }

  const buffer = Buffer.from(input.dataBase64, "base64");
  if (buffer.length === 0) throw new Error("Empty file");
  if (buffer.length > MAX_BYTES) throw new Error("File must be 10 MB or smaller");

  await ensureGrowthUploadDir(input.tenantId);
  const storedName = safeFilename(input.fileName, input.mimeType);
  const target = join(tenantDir(input.tenantId), storedName);
  await writeFile(target, buffer);

  return {
    fileName: storedName,
    url: `/api/growth/assets/${input.tenantId}/${storedName}`,
  };
}

export const GROWTH_UPLOAD_ROOT_EXPORT = GROWTH_UPLOAD_ROOT;
