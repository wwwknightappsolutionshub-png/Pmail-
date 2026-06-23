export const ATTACHMENT_CATEGORIES = [
  "invoice",
  "receipt",
  "contract",
  "tax_form",
  "identity",
  "spreadsheet",
  "presentation",
  "document",
  "image",
  "archive",
  "media",
  "other",
] as const;

export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number];

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  invoice: "Invoices",
  receipt: "Receipts",
  contract: "Contracts",
  tax_form: "Tax forms",
  identity: "Identity documents",
  spreadsheet: "Spreadsheets",
  presentation: "Presentations",
  document: "Documents",
  image: "Images",
  archive: "Archives",
  media: "Audio & video",
  other: "Other",
};

export function classifyAttachment(filename: string, mimeType: string): AttachmentCategory {
  const name = filename.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (/\binvoice\b|\binv[-_]|billing|statement/.test(name)) return "invoice";
  if (/\breceipt\b|payment.?confirm|paid.?in/.test(name)) return "receipt";
  if (/\bcontract\b|\bagreement\b|\bnda\b|\bmsa\b|\bsow\b/.test(name)) return "contract";
  if (/\bw-?2\b|\b1099\b|\btax\b|\bt4\b|notice.?of.?assessment|filing/.test(name)) return "tax_form";
  if (/passport|driver.?s.?lic|identity|id.?card|\bssn\b/.test(name)) return "identity";

  if (
    mime.includes("spreadsheet") ||
    mime.includes("csv") ||
    mime.includes("excel") ||
    /\.(xlsx?|csv|ods)$/i.test(name)
  ) {
    return "spreadsheet";
  }
  if (mime.includes("presentation") || mime.includes("powerpoint") || /\.(pptx?|key)$/i.test(name)) {
    return "presentation";
  }
  if (mime.startsWith("image/")) return "image";
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("archive") ||
    /\.(zip|rar|7z|tar|gz)$/i.test(name)
  ) {
    return "archive";
  }
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "media";
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("text/plain") ||
    mime.includes("rtf") ||
    /\.(pdf|docx?|txt|rtf)$/i.test(name)
  ) {
    return "document";
  }

  return "other";
}

export function isAttachmentCategory(value: string): value is AttachmentCategory {
  return (ATTACHMENT_CATEGORIES as readonly string[]).includes(value);
}
