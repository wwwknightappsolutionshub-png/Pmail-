import { plainTextToEditorHtml } from "../components/admin/WysiwygHtmlEditor";

/** Strip scripts/events; allow basic marketing formatting tags. */
export function sanitizeMarketingHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function htmlToDisplayHtml(content: string | null | undefined): string {
  if (!content?.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(content)) return sanitizeMarketingHtml(content);
  return sanitizeMarketingHtml(plainTextToEditorHtml(content));
}

export function stripHtmlToText(html: string): string {
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}
