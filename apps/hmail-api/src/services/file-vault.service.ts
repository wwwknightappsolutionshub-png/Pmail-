import { randomBytes } from "node:crypto";
import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { readStoredFile, saveStoredFile, VAULT_MIME } from "./file-storage.service.js";

const NAMESPACE = "vault";
export const FILE_VAULT_ADDON_SLUG = "file-vault-functionality";
export const STANDARD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

function vaultMaxBytes(): number {
  return getEnv().FILE_VAULT_MAX_BYTES;
}

function vaultLinkTtlDays(): number {
  return getEnv().FILE_VAULT_LINK_TTL_DAYS;
}

export function createVaultDownloadToken(): string {
  return randomBytes(24).toString("hex");
}

export function buildVaultDownloadUrl(token: string, apiPublicBase: string): string {
  const base = apiPublicBase.replace(/\/$/, "");
  return `${base}/api/public/vault/${token}`;
}

function defaultExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + vaultLinkTtlDays());
  return expires;
}

function serializeVaultFile(row: {
  id: string;
  originalName: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadCount: number;
  expiresAt: Date;
  lastDownloadAt: Date | null;
  createdAt: Date;
  downloadToken: string;
}) {
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadCount: row.downloadCount,
    expiresAt: row.expiresAt.toISOString(),
    lastDownloadAt: row.lastDownloadAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    downloadToken: row.downloadToken,
  };
}

export async function uploadMailVaultFile(
  tenantId: string,
  userId: string,
  input: { fileName: string; mimeType: string; dataBase64: string },
) {
  const stored = await saveStoredFile({
    namespace: NAMESPACE,
    tenantId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    dataBase64: input.dataBase64,
    maxBytes: vaultMaxBytes(),
    allowedMime: VAULT_MIME,
  });

  const row = await prisma.mailVaultFile.create({
    data: {
      tenantId,
      userId,
      originalName: input.fileName.trim(),
      storagePath: stored.storagePath,
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      downloadToken: createVaultDownloadToken(),
      expiresAt: defaultExpiresAt(),
    },
  });

  return serializeVaultFile(row);
}

export async function listMailVaultFiles(userId: string) {
  const rows = await prisma.mailVaultFile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serializeVaultFile);
}

export async function deleteMailVaultFile(userId: string, id: string): Promise<boolean> {
  const row = await prisma.mailVaultFile.findFirst({ where: { id, userId } });
  if (!row) {
    return false;
  }
  await prisma.mailVaultFile.delete({ where: { id: row.id } });
  return true;
}

export async function getVaultFilesForSend(userId: string, ids: string[]) {
  if (ids.length === 0) {
    return [];
  }
  const uniqueIds = [...new Set(ids)];
  const rows = await prisma.mailVaultFile.findMany({
    where: { userId, id: { in: uniqueIds } },
  });
  if (rows.length !== uniqueIds.length) {
    throw new Error("One or more vault files were not found");
  }
  const now = new Date();
  for (const row of rows) {
    if (row.expiresAt <= now) {
      throw new Error(`Vault file "${row.originalName}" has expired`);
    }
  }
  return rows;
}

export function appendVaultLinksToMessage(input: {
  html?: string;
  text?: string;
  links: Array<{ originalName: string; url: string; fileSizeBytes: number }>;
}): { html?: string; text?: string } {
  if (input.links.length === 0) {
    return { html: input.html, text: input.text };
  }

  const textLines = input.links.map(
    (link) => `${link.originalName} (${formatFileSize(link.fileSizeBytes)}): ${link.url}`,
  );
  const htmlItems = input.links.map(
    (link) =>
      `<li><a href="${link.url}">${escapeHtml(link.originalName)}</a> (${formatFileSize(link.fileSizeBytes)})</li>`,
  );

  const textBlock = `\n\n---\nSecure file download${input.links.length === 1 ? "" : "s"}:\n${textLines.join("\n")}`;
  const htmlBlock = `<hr><p><strong>Secure file download${input.links.length === 1 ? "" : "s"}:</strong></p><ul>${htmlItems.join("")}</ul>`;

  return {
    text: input.text ? `${input.text}${textBlock}` : textLines.join("\n"),
    html: input.html ? `${input.html}${htmlBlock}` : `<p>Secure file download:</p><ul>${htmlItems.join("")}</ul>`,
  };
}

export async function recordVaultDownload(token: string): Promise<{
  buffer: Buffer;
  originalName: string;
  mimeType: string;
} | null> {
  const row = await prisma.mailVaultFile.findUnique({ where: { downloadToken: token } });
  if (!row) {
    return null;
  }
  if (row.expiresAt <= new Date()) {
    return null;
  }

  const now = new Date();
  await prisma.mailVaultFile.update({
    where: { id: row.id },
    data: {
      downloadCount: row.downloadCount + 1,
      lastDownloadAt: now,
    },
  });

  const buffer = await readStoredFile(NAMESPACE, row.tenantId, row.storagePath);
  return {
    buffer,
    originalName: row.originalName,
    mimeType: row.mimeType,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
