import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const CV_SCANNER_ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export function normalizeCvMimeType(mimeType: string, fileName: string): string {
  const trimmed = mimeType.trim().toLowerCase();
  if (trimmed && trimmed !== "application/octet-stream") return trimmed;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return trimmed || "application/octet-stream";
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text ?? "").trim();
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromCv(buffer: Buffer, mimeType: string): Promise<string> {
  const normalized = mimeType.toLowerCase();

  if (normalized === "application/pdf") {
    return extractPdfText(buffer);
  }

  if (
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  }

  return "";
}
