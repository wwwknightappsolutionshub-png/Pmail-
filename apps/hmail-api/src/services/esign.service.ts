import { randomBytes, randomUUID } from "node:crypto";
import { getEnv } from "../config/env.js";
import { ESIGN_DOCUMENT_MIME, type EsignRequestStatus } from "../lib/esign-mime.js";
import { prisma } from "../lib/prisma.js";
import {
  downloadAttachment,
  type MailCredentials,
} from "./imap.service.js";
import { readStoredFile, saveStoredFile } from "./file-storage.service.js";
import {
  dropboxSignTestModeEnabled,
  fetchDropboxSignStatus,
  isDropboxSignConfigured,
  sendDropboxSignRequest,
} from "./dropbox-sign.client.js";

export const ESIGN_FROM_EMAIL_ADDON_SLUG = "esign-from-email-functionality";
const STORAGE_NAMESPACE = "esign";
const PROVIDER = "dropbox_sign";

function maxBytes(): number {
  return getEnv().ESIGN_MAX_BYTES;
}

function linkTtlDays(): number {
  return getEnv().ESIGN_LINK_TTL_DAYS;
}

function shouldSkipProviderSend(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return !isDropboxSignConfigured();
}

export function createEsignDownloadToken(): string {
  return randomBytes(24).toString("hex");
}

export function buildEsignDownloadUrl(token: string, apiPublicBase: string): string {
  const base = apiPublicBase.replace(/\/$/, "");
  return `${base}/api/public/esign/${token}`;
}

function defaultExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + linkTtlDays());
  return expires;
}

function serializeRequest(row: {
  id: string;
  provider: string;
  providerRequestId: string | null;
  status: string;
  documentName: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadToken: string;
  downloadCount: number;
  expiresAt: Date;
  lastDownloadAt: Date | null;
  signerEmail: string;
  signerName: string;
  subject: string;
  message: string;
  signingUrl: string | null;
  sourceFolder: string | null;
  sourceMessageUid: number | null;
  sourcePartId: string | null;
  messageSubjectSnapshot: string | null;
  completedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}, apiPublicBase?: string) {
  const documentDownloadUrl = apiPublicBase ? buildEsignDownloadUrl(row.downloadToken, apiPublicBase) : null;
  return {
    id: row.id,
    provider: row.provider,
    providerRequestId: row.providerRequestId,
    status: row.status,
    documentName: row.documentName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    downloadCount: row.downloadCount,
    expiresAt: row.expiresAt.toISOString(),
    lastDownloadAt: row.lastDownloadAt?.toISOString() ?? null,
    documentDownloadUrl,
    signerEmail: row.signerEmail,
    signerName: row.signerName,
    subject: row.subject,
    message: row.message,
    signingUrl: row.signingUrl,
    sourceFolder: row.sourceFolder,
    sourceMessageUid: row.sourceMessageUid,
    sourcePartId: row.sourcePartId,
    messageSubjectSnapshot: row.messageSubjectSnapshot,
    completedAt: row.completedAt?.toISOString() ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function storeDocument(input: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
}) {
  return saveStoredFile({
    namespace: STORAGE_NAMESPACE,
    tenantId: input.tenantId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    dataBase64: input.dataBase64,
    maxBytes: maxBytes(),
    allowedMime: ESIGN_DOCUMENT_MIME,
  });
}

async function dispatchToProvider(input: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  title: string;
  subject: string;
  message: string;
  signerEmail: string;
  signerName: string;
}) {
  if (shouldSkipProviderSend()) {
    return {
      signatureRequestId: `test-${randomUUID()}`,
      signingUrl: null as string | null,
      status: "awaiting_signature" as EsignRequestStatus,
      testMode: true,
    };
  }

  const result = await sendDropboxSignRequest({
    fileBuffer: input.fileBuffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
    title: input.title,
    subject: input.subject,
    message: input.message,
    signerEmail: input.signerEmail,
    signerName: input.signerName,
  });

  return { ...result, testMode: dropboxSignTestModeEnabled() };
}

export async function listEsignRequests(userId: string, apiPublicBase?: string) {
  const rows = await prisma.mailEsignRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => serializeRequest(row, apiPublicBase));
}

export async function getEsignRequest(userId: string, id: string, apiPublicBase?: string) {
  const row = await prisma.mailEsignRequest.findFirst({ where: { id, userId } });
  return row ? serializeRequest(row, apiPublicBase) : null;
}

export function buildEsignComposeHandoff(request: {
  signerEmail: string;
  signerName: string;
  subject: string;
  message: string;
  documentName: string;
  signingUrl: string | null;
  documentDownloadUrl: string | null;
}) {
  const lines: string[] = [];
  if (request.message.trim()) {
    lines.push(request.message.trim());
    lines.push("");
  }
  lines.push(`Please review and sign "${request.documentName}".`);
  if (request.signingUrl) {
    lines.push(`Sign online: ${request.signingUrl}`);
  }
  if (request.documentDownloadUrl) {
    lines.push(`Document copy: ${request.documentDownloadUrl}`);
  }

  const htmlParts: string[] = [];
  if (request.message.trim()) {
    htmlParts.push(`<p>${escapeHtml(request.message.trim()).replace(/\n/g, "<br>")}</p>`);
  }
  htmlParts.push(`<p>Please review and sign <strong>${escapeHtml(request.documentName)}</strong>.</p>`);
  if (request.signingUrl) {
    htmlParts.push(`<p><a href="${escapeHtml(request.signingUrl)}">Sign online</a></p>`);
  }
  if (request.documentDownloadUrl) {
    htmlParts.push(`<p><a href="${escapeHtml(request.documentDownloadUrl)}">Download document copy</a></p>`);
  }

  return {
    to: request.signerEmail,
    subject: request.subject,
    text: lines.join("\n"),
    html: htmlParts.join(""),
  };
}

export async function createEsignRequestFromUpload(input: {
  tenantId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  signerEmail: string;
  signerName: string;
  subject: string;
  message: string;
  apiPublicBase?: string;
}) {
  const stored = await storeDocument(input);
  const fileBuffer = Buffer.from(input.dataBase64, "base64");
  const provider = await dispatchToProvider({
    fileBuffer,
    fileName: input.fileName,
    mimeType: stored.mimeType,
    title: input.fileName,
    subject: input.subject,
    message: input.message,
    signerEmail: input.signerEmail,
    signerName: input.signerName,
  });

  const row = await prisma.mailEsignRequest.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      provider: PROVIDER,
      providerRequestId: provider.signatureRequestId,
      status: provider.status,
      documentName: input.fileName.trim(),
      mimeType: stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      storagePath: stored.storagePath,
      downloadToken: createEsignDownloadToken(),
      expiresAt: defaultExpiresAt(),
      signerEmail: input.signerEmail.trim().toLowerCase(),
      signerName: input.signerName.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      signingUrl: provider.signingUrl,
      lastSyncedAt: new Date(),
      completedAt: provider.status === "signed" ? new Date() : null,
    },
  });

  return serializeRequest(row, input.apiPublicBase);
}

export async function createEsignRequestFromAttachment(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  folder: string;
  messageUid: number;
  partId: string;
  signerEmail: string;
  signerName: string;
  subject: string;
  message: string;
  messageSubjectSnapshot?: string;
  apiPublicBase?: string;
}) {
  if (process.env.NODE_ENV !== "test" && input.credentials.mailConfig.imapHost === "local.pmail.test") {
    throw new Error("Mailbox unavailable in this environment");
  }

  const attachment = await downloadAttachment(
    input.credentials,
    input.folder,
    input.messageUid,
    input.partId,
  );
  if (!attachment) {
    throw new Error("Attachment not found");
  }
  if (!ESIGN_DOCUMENT_MIME[attachment.contentType]) {
    throw new Error("Only PDF and Word documents can be sent for e-sign");
  }

  const dataBase64 = attachment.content.toString("base64");
  const stored = await storeDocument({
    tenantId: input.tenantId,
    fileName: attachment.filename,
    mimeType: attachment.contentType,
    dataBase64,
  });

  const provider = await dispatchToProvider({
    fileBuffer: attachment.content,
    fileName: attachment.filename,
    mimeType: attachment.contentType,
    title: attachment.filename,
    subject: input.subject,
    message: input.message,
    signerEmail: input.signerEmail,
    signerName: input.signerName,
  });

  const row = await prisma.mailEsignRequest.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      provider: PROVIDER,
      providerRequestId: provider.signatureRequestId,
      status: provider.status,
      documentName: attachment.filename,
      mimeType: attachment.contentType,
      fileSizeBytes: stored.fileSizeBytes,
      storagePath: stored.storagePath,
      downloadToken: createEsignDownloadToken(),
      expiresAt: defaultExpiresAt(),
      signerEmail: input.signerEmail.trim().toLowerCase(),
      signerName: input.signerName.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      signingUrl: provider.signingUrl,
      sourceFolder: input.folder,
      sourceMessageUid: input.messageUid,
      sourcePartId: input.partId,
      messageSubjectSnapshot: input.messageSubjectSnapshot?.trim() || null,
      lastSyncedAt: new Date(),
      completedAt: provider.status === "signed" ? new Date() : null,
    },
  });

  return serializeRequest(row, input.apiPublicBase);
}

export async function refreshEsignRequestStatus(userId: string, id: string, apiPublicBase?: string) {
  const row = await prisma.mailEsignRequest.findFirst({ where: { id, userId } });
  if (!row) return null;

  if (!row.providerRequestId || shouldSkipProviderSend() || row.providerRequestId.startsWith("test-")) {
    return serializeRequest(row, apiPublicBase);
  }

  const status = await fetchDropboxSignStatus(row.providerRequestId);
  const updated = await prisma.mailEsignRequest.update({
    where: { id: row.id },
    data: {
      status: status.status,
      signingUrl: status.signingUrl ?? row.signingUrl,
      lastSyncedAt: new Date(),
      completedAt: status.isComplete ? row.completedAt ?? new Date() : null,
    },
  });

  return serializeRequest(updated, apiPublicBase);
}

export async function recordEsignDownload(token: string): Promise<{
  buffer: Buffer;
  documentName: string;
  mimeType: string;
} | null> {
  const row = await prisma.mailEsignRequest.findUnique({ where: { downloadToken: token } });
  if (!row) {
    return null;
  }
  if (row.expiresAt <= new Date()) {
    return null;
  }

  const now = new Date();
  await prisma.mailEsignRequest.update({
    where: { id: row.id },
    data: {
      downloadCount: row.downloadCount + 1,
      lastDownloadAt: now,
    },
  });

  const buffer = await readStoredFile(STORAGE_NAMESPACE, row.tenantId, row.storagePath);
  return {
    buffer,
    documentName: row.documentName,
    mimeType: row.mimeType,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
