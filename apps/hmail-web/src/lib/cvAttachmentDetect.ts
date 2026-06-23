const CV_FILENAME_PATTERNS = [
  /\bcv\b/i,
  /(?:^|[\s._-])cv(?:[\s._-]|$)/i,
  /curriculum[\s_-]?vitae/i,
  /resume/i,
  /r[eé]sum[eé]/i,
  /(?:^|[\s._-])profile(?:[\s._-]|$)/i,
];

const CV_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/rtf",
  "text/plain",
]);

const CV_EXTENSIONS = /\.(pdf|docx?|rtf|txt)$/i;

function hasCvFilename(name: string): boolean {
  return CV_FILENAME_PATTERNS.some((pattern) => pattern.test(name)) && CV_EXTENSIONS.test(name);
}

export function isCvLikeAttachment(file: File): boolean {
  const mime = (file.type ?? "").trim().toLowerCase();
  const name = file.name.trim();

  if (hasCvFilename(name)) {
    if (!mime || CV_MIME_TYPES.has(mime)) return true;
  }

  return false;
}
