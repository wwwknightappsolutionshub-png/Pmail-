import {
  readStoredFile,
  saveStoredFile,
  resolveStoredFilePath,
  ensureStorageDir,
  SECURE_DOCUMENT_MIME,
} from "./file-storage.service.js";

const NAMESPACE = "accounting";
const MAX_BYTES = 25 * 1024 * 1024;

export async function ensureAcUploadDir(tenantId: string): Promise<void> {
  await ensureStorageDir(NAMESPACE, tenantId);
}

export function resolveAcDocumentFile(tenantId: string, storagePath: string): string | null {
  return resolveStoredFilePath(NAMESPACE, tenantId, storagePath);
}

export async function saveAcDocument(input: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
}): Promise<{ storagePath: string; fileSizeBytes: number; mimeType: string }> {
  try {
    return await saveStoredFile({
      namespace: NAMESPACE,
      tenantId: input.tenantId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      dataBase64: input.dataBase64,
      maxBytes: MAX_BYTES,
      allowedMime: SECURE_DOCUMENT_MIME,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unsupported file type.") {
      throw new Error("Unsupported file type for secure exchange.");
    }
    throw err;
  }
}

export async function readAcDocument(tenantId: string, storagePath: string): Promise<Buffer> {
  return readStoredFile(NAMESPACE, tenantId, storagePath);
}
