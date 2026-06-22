import type { GrowthWizardProfile } from "./wizard-profile.js";
import { wizardWebsiteUrl } from "./wizard-profile.js";
import { normalizeWebsiteInput } from "./wizard-schema.js";

export type WebsiteSnapshot = {
  url: string;
  fetched: boolean;
  fetchError?: string;
  statusCode?: number;
  title?: string;
  metaDescription?: string;
  h1Headings: string[];
  detectedBlogLinks: string[];
  hasContactSignals: boolean;
  hasOfferSignals: boolean;
  wordCountEstimate: number;
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512_000;

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaContent(html: string, name: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    "i",
  );
  const match = html.match(pattern);
  const raw = match?.[1] ?? match?.[2];
  return raw ? decodeBasicEntities(raw) : undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeBasicEntities(stripTags(match[1])) : undefined;
}

function extractH1Headings(html: string): string[] {
  const headings: string[] = [];
  const pattern = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const text = decodeBasicEntities(stripTags(match[1] ?? ""));
    if (text) headings.push(text.slice(0, 200));
  }
  return headings.slice(0, 5);
}

function extractBlogLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const pattern = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = match[1]?.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    const lower = href.toLowerCase();
    if (!/(blog|news|articles|insights|resources)/.test(lower)) continue;
    try {
      links.add(new URL(href, baseUrl).pathname.slice(0, 120));
    } catch {
      links.add(lower.slice(0, 120));
    }
  }
  return [...links].slice(0, 8);
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (host.startsWith("[fd") || host.startsWith("[fe80:")) return true;
  return false;
}

export function isWebsiteUrlFetchable(rawUrl: string): boolean {
  const normalized = normalizeWebsiteInput(rawUrl);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return !isBlockedHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export async function fetchWebsiteSnapshot(rawUrl: string): Promise<WebsiteSnapshot> {
  const url = normalizeWebsiteInput(rawUrl);
  const empty: WebsiteSnapshot = {
    url,
    fetched: false,
    h1Headings: [],
    detectedBlogLinks: [],
    hasContactSignals: false,
    hasOfferSignals: false,
    wordCountEstimate: 0,
  };

  if (!url) return empty;
  if (!isWebsiteUrlFetchable(url)) {
    return { ...empty, fetchError: "Website URL is not publicly fetchable (local or private network)" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ProhostGrowthBot/1.0 (+https://prohost.io/growth)" },
    });
    clearTimeout(timer);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return {
        ...empty,
        statusCode: res.status,
        fetchError: "URL did not return HTML content",
      };
    }

    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, MAX_HTML_BYTES));
    const plain = decodeBasicEntities(stripTags(html));
    const lowerHtml = html.toLowerCase();

    return {
      url,
      fetched: true,
      statusCode: res.status,
      title: extractTitle(html),
      metaDescription: extractMetaContent(html, "description") ?? extractMetaContent(html, "og:description"),
      h1Headings: extractH1Headings(html),
      detectedBlogLinks: extractBlogLinks(html, url),
      hasContactSignals: /contact|book now|get a quote|call us|schedule/i.test(lowerHtml),
      hasOfferSignals: /free consultation|special offer|discount|guarantee|promo/i.test(lowerHtml),
      wordCountEstimate: plain.split(/\s+/).filter(Boolean).length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch website";
    return { ...empty, fetchError: message };
  }
}

export async function resolveWebsiteSnapshotForProfile(
  profile: GrowthWizardProfile,
): Promise<WebsiteSnapshot | null> {
  const url = wizardWebsiteUrl(profile);
  if (!url) return null;

  if (!isWebsiteUrlFetchable(url)) {
    return {
      url: normalizeWebsiteInput(url),
      fetched: false,
      fetchError: "Website URL is not publicly fetchable (local or private network)",
      h1Headings: [],
      detectedBlogLinks: [],
      hasContactSignals: false,
      hasOfferSignals: false,
      wordCountEstimate: 0,
    };
  }

  return fetchWebsiteSnapshot(url);
}
