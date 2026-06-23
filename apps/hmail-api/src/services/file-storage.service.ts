import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "../config/env.js";

const apiRoot = dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOAD_ROOT = join(apiRoot, "..", "..", "uploads");

export const SECURE_DOCUMENT_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/csv": ".csv",
};

export const VAULT_MIME: Record<string, string> = {
  ...SECURE_DOCUMENT_MIME,
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3",
};

function uploadRoot(): string {
  const custom = getEnv().FILE_VAULT_UPLOAD_ROOT?.trim();
  return custom || DEFAULT_UPLOAD_ROOT;
}

function tenantDir(namespace: string, tenantId: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeNamespace = namespace.replace(/[^a-zA-Z0-9-_]/g, "");
  return join(uploadRoot(), safeNamespace, safeTenant);
}

export async function ensureStorageDir(namespace: string, tenantId: string): Promise<void> {
  await mkdir(tenantDir(namespace, tenantId), { recursive: true });
}

function safeFilename(originalName: string, mimeType: string, allowedMime: Record<string, string>): string {
  const extFromMime = allowedMime[mimeType];
  const extFromName = extname(originalName).toLowerCase();
  const ext = extFromMime ?? (extFromName && extFromName.length <= 6 ? extFromName : ".bin");
  return `${randomUUID()}${ext}`;
}

export function resolveStoredFilePath(
  namespace: string,
  tenantId: string,
  storagePath: string,
): string | null {
  const base = normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!base || base.includes("..") || base.includes("/") || base.includes("\\")) {
    return null;
  }
  const dir = resolve(tenantDir(namespace, tenantId));
  const full = resolve(dir, base);
  if (!full.startsWith(dir)) {
    return null;
  }
  return full;
}

export async function saveStoredFile(input: {
  namespace: string;
  tenantId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  maxBytes: number;
  allowedMime: Record<string, string>;
}): Promise<{ storagePath: string; fileSizeBytes: number; mimeType: string }> {
  if (!input.allowedMime[input.mimeType]) {
    throw new Error("Unsupported file type.");
  }

  const buffer = Buffer.from(input.dataBase64, "base64");
  if (buffer.length === 0) {
    throw new Error("Empty file");
  }
  if (buffer.length > input.maxBytes) {
    throw new Error(`File must be ${Math.floor(input.maxBytes / (1024 * 1024))} MB or smaller`);
  }

  await ensureStorageDir(input.namespace, input.tenantId);
  const storedName = safeFilename(input.fileName, input.mimeType, input.allowedMime);
  const target = join(tenantDir(input.namespace, input.tenantId), storedName);
  await writeFile(target, buffer);

  return {
    storagePath: storedName,
    fileSizeBytes: buffer.length,
    mimeType: input.mimeType,
  };
}

export async function readStoredFile(
  namespace: string,
  tenantId: string,
  storagePath: string,
): Promise<Buffer> {
  const full = resolveStoredFilePath(namespace, tenantId, storagePath);
  if (!full) {
    throw new Error("Invalid document path");
  }
  return readFile(full);
}
