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

export function isCvLikeAttachment(input: {
  fileName?: string | null;
  mimeType?: string | null;
  textSnippet?: string | null;
}): boolean {
  const mime = (input.mimeType ?? "").trim().toLowerCase();
  const name = (input.fileName ?? "").trim();

  if (hasCvFilename(name)) {
    if (!mime || CV_MIME_TYPES.has(mime)) return true;
  }

  const snippet = (input.textSnippet ?? "").trim();
  if (snippet.length >= 80 && hasCvFilename(name)) {
    const lower = snippet.toLowerCase();
    const hits = [
      lower.includes("experience"),
      lower.includes("education"),
      lower.includes("skills"),
      lower.includes("employment"),
      lower.includes("curriculum vitae"),
      lower.includes("professional summary"),
    ].filter(Boolean).length;
    if (hits >= 2) return true;
  }

  return false;
}
