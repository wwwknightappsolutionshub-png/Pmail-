/** Prohost seeded templates wrap editable copy in `<div class="body">`. */
const PROHOST_BODY_RE = /(<div class="body">)([\s\S]*?)(<\/div>\s*<div class="foot")/i;

function isFullHtmlDocument(html: string): boolean {
  return /<!DOCTYPE|<html[\s>]/i.test(html);
}

export function isProhostWrappedEmail(html: string): boolean {
  return isFullHtmlDocument(html) && PROHOST_BODY_RE.test(html);
}

export function extractProhostEmailBody(html: string): string {
  const match = html.match(PROHOST_BODY_RE);
  if (match?.[2] != null) return match[2].trim();
  if (!isFullHtmlDocument(html)) return html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1]?.trim() ?? html;
}

export function mergeProhostEmailBody(html: string, bodyInner: string): string {
  if (isProhostWrappedEmail(html)) {
    return html.replace(PROHOST_BODY_RE, `$1${bodyInner}$3`);
  }
  if (isFullHtmlDocument(html) && /<body[^>]*>[\s\S]*?<\/body>/i.test(html)) {
    return html.replace(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i, `$1${bodyInner}$3`);
  }
  return bodyInner;
}

export function isUnsupportedFullEmailDocument(html: string): boolean {
  return isFullHtmlDocument(html) && !isProhostWrappedEmail(html);
}
