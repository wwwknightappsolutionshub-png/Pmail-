import { prisma } from "../lib/prisma.js";
import {
  ensureStorageDir,
  readStoredFile,
  saveStoredFile,
  SECURE_DOCUMENT_MIME,
} from "./file-storage.service.js";
import { exportCvDocumentPdf } from "./job-hunter-cv.service.js";

export const USER_DOCUMENT_NAMESPACE = "user-documents";
export const JOB_HUNTER_CV_DOCUMENT_SOURCE = "job_hunter_cv";
export const JOB_HUNTER_SCANNER_DOCUMENT_SOURCE = "job_hunter_scanner";

const CV_PDF_NAMESPACE = "job-hunter-cv";

export type UserDocumentSource =
  | typeof JOB_HUNTER_CV_DOCUMENT_SOURCE
  | typeof JOB_HUNTER_SCANNER_DOCUMENT_SOURCE;

function serializeUserDocument(row: {
  id: string;
  filename: string;
  mimeType: string;
  source: string;
  isPinned: boolean;
  jobHunterCvDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    source: row.source,
    isPinned: row.isPinned,
    isCareerCv: row.source === JOB_HUNTER_CV_DOCUMENT_SOURCE || row.source === JOB_HUNTER_SCANNER_DOCUMENT_SOURCE,
    jobHunterCvDocumentId: row.jobHunterCvDocumentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sanitizeFilename(title: string, ext: string): string {
  const base = title.trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  return `${base || "document"}${ext}`;
}

async function storeDocumentFile(
  tenantId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ storagePath: string; fileSizeBytes: number }> {
  await ensureStorageDir(USER_DOCUMENT_NAMESPACE, tenantId);
  const stored = await saveStoredFile({
    namespace: USER_DOCUMENT_NAMESPACE,
    tenantId,
    fileName: filename,
    mimeType,
    dataBase64: buffer.toString("base64"),
    maxBytes: 10 * 1024 * 1024,
    allowedMime: SECURE_DOCUMENT_MIME,
  });
  return { storagePath: stored.storagePath, fileSizeBytes: stored.fileSizeBytes };
}

export async function listUserDocuments(userId: string) {
  const rows = await prisma.userDocument.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(serializeUserDocument);
}

export async function listAttachableCareerDocuments(userId: string) {
  const rows = await prisma.userDocument.findMany({
    where: {
      userId,
      source: { in: [JOB_HUNTER_CV_DOCUMENT_SOURCE, JOB_HUNTER_SCANNER_DOCUMENT_SOURCE] },
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(serializeUserDocument);
}

export async function setUserDocumentPinned(userId: string, id: string, isPinned: boolean) {
  const existing = await prisma.userDocument.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.userDocument.update({
    where: { id },
    data: { isPinned },
  });
  return serializeUserDocument(row);
}

export async function getUserDocumentDownload(userId: string, tenantId: string, id: string) {
  const row = await prisma.userDocument.findFirst({ where: { id, userId } });
  if (!row) return null;

  const buffer = await readStoredFile(USER_DOCUMENT_NAMESPACE, tenantId, row.storagePath);
  return {
    buffer,
    filename: row.filename,
    mimeType: row.mimeType,
  };
}

export async function getUserDocumentsForSend(userId: string, tenantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const uniqueIds = [...new Set(ids)];
  const rows = await prisma.userDocument.findMany({
    where: { userId, id: { in: uniqueIds } },
  });
  if (rows.length !== uniqueIds.length) {
    throw new Error("One or more documents were not found");
  }

  const attachments: Array<{ filename: string; content: string; contentType?: string }> = [];
  for (const row of rows) {
    const buffer = await readStoredFile(USER_DOCUMENT_NAMESPACE, tenantId, row.storagePath);
    attachments.push({
      filename: row.filename,
      content: buffer.toString("base64"),
      contentType: row.mimeType,
    });
  }
  return attachments;
}

export async function publishCvDocumentToUserDocuments(
  userId: string,
  tenantId: string,
  cvDocumentId: string,
  options?: { isPinned?: boolean },
) {
  const cv = await prisma.jobHunterCvDocument.findFirst({ where: { id: cvDocumentId, userId } });
  if (!cv) {
    throw new Error("CV document not found");
  }

  let buffer: Buffer;
  let filename: string;

  if (cv.pdfStoragePath) {
    buffer = await readStoredFile(CV_PDF_NAMESPACE, tenantId, cv.pdfStoragePath);
    filename = sanitizeFilename(cv.title, ".pdf");
  } else {
    const exported = await exportCvDocumentPdf(userId, tenantId, cvDocumentId);
    if (!exported) {
      throw new Error("CV document not found");
    }
    buffer = exported.buffer;
    filename = exported.filename;
  }

  const stored = await storeDocumentFile(tenantId, filename, "application/pdf", buffer);
  const isPinned = options?.isPinned ?? true;

  const existing = await prisma.userDocument.findFirst({
    where: { userId, jobHunterCvDocumentId: cvDocumentId },
  });

  if (existing) {
    const row = await prisma.userDocument.update({
      where: { id: existing.id },
      data: {
        filename,
        mimeType: "application/pdf",
        storagePath: stored.storagePath,
        source: JOB_HUNTER_CV_DOCUMENT_SOURCE,
        isPinned,
      },
    });
    return serializeUserDocument(row);
  }

  const row = await prisma.userDocument.create({
    data: {
      userId,
      filename,
      mimeType: "application/pdf",
      storagePath: stored.storagePath,
      source: JOB_HUNTER_CV_DOCUMENT_SOURCE,
      isPinned,
      jobHunterCvDocumentId: cvDocumentId,
    },
  });
  return serializeUserDocument(row);
}

export async function publishScannerFileToUserDocuments(
  userId: string,
  tenantId: string,
  input: { fileName: string; mimeType: string; dataBase64: string },
  options?: { isPinned?: boolean },
) {
  if (!SECURE_DOCUMENT_MIME[input.mimeType]) {
    throw new Error("Unsupported file type for Documents");
  }

  const buffer = Buffer.from(input.dataBase64, "base64");
  if (buffer.length === 0) {
    throw new Error("Empty file");
  }

  const ext = SECURE_DOCUMENT_MIME[input.mimeType] ?? "";
  const filename = input.fileName.trim() || sanitizeFilename("scanned-cv", ext);
  const stored = await storeDocumentFile(tenantId, filename, input.mimeType, buffer);

  const row = await prisma.userDocument.create({
    data: {
      userId,
      filename,
      mimeType: input.mimeType,
      storagePath: stored.storagePath,
      source: JOB_HUNTER_SCANNER_DOCUMENT_SOURCE,
      isPinned: options?.isPinned ?? true,
    },
  });
  return serializeUserDocument(row);
}

export async function publishJobHunterDocument(input: {
  userId: string;
  tenantId: string;
  cvDocumentId?: string;
  fileName?: string;
  mimeType?: string;
  dataBase64?: string;
  source?: UserDocumentSource;
  isPinned?: boolean;
}) {
  if (input.cvDocumentId) {
    return publishCvDocumentToUserDocuments(input.userId, input.tenantId, input.cvDocumentId, {
      isPinned: input.isPinned,
    });
  }

  if (!input.fileName || !input.mimeType || !input.dataBase64) {
    throw new Error("fileName, mimeType, and dataBase64 are required when cvDocumentId is omitted");
  }

  return publishScannerFileToUserDocuments(
    input.userId,
    input.tenantId,
    {
      fileName: input.fileName,
      mimeType: input.mimeType,
      dataBase64: input.dataBase64,
    },
    { isPinned: input.isPinned },
  );
}
