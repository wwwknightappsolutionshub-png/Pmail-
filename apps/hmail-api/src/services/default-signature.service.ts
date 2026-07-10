import { getEnv } from "../config/env.js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";

export const PMail_DEFAULT_SIGNATURE_TAGLINE =
  "Do More With PMail+ | Unify Your Multiple Email Accounts";

const SIGNATURE_MARKER = 'data-pmail-signature="branded"';
export const PMail_SIGNATURE_MARKER = SIGNATURE_MARKER;
export const PMail_SIGNATURE_LOGO_CID = "pmail-signature-logo@pmail";
export const PMail_SIGNATURE_EXPLORE_ATTR = 'data-pmail-explore="1"';

const BRANDED_SIGNATURE_BLOCK_RE =
  /(<div[^>]*data-pmail-signature="branded"[^>]*>[\s\S]*?<\/table>\s*<\/div>)/i;

const PRODUCTION_WEB_ORIGIN_FALLBACK = "https://mail.prohost.cloud";
const PRODUCTION_EXPLORE_URL = `${PRODUCTION_WEB_ORIGIN_FALLBACK}/welcome/prohost/`;
/** Served by the API so compose preview does not depend on the web static host. */
const DEFAULT_SIGNATURE_LOGO_PATH = "/api/public/pmail-signature-logo.png";

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

/** Prefer a public web origin — never localhost when a production URL is configured. */
export function pickPublicWebOrigin(candidates: string[]): string {
  const cleaned = candidates.map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
  const publicCandidate = cleaned.find((origin) => !isLocalDevOrigin(origin));
  if (publicCandidate) return publicCandidate;
  if (cleaned[0]) return cleaned[0];
  return getEnv().NODE_ENV === "production" ? PRODUCTION_WEB_ORIGIN_FALLBACK : "http://localhost:5173";
}

function resolvePmailWebOrigin(): string {
  const env = getEnv();
  const corsOrigins = env.CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean);
  // PMail web (hmail-web) is listed in CORS_ORIGIN — not the Hostnet marketing site.
  return pickPublicWebOrigin([...corsOrigins, env.HOSTNET_WEB_URL]);
}

function absolutizePublicAssetUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/api/")) {
    const env = getEnv();
    const apiBase = (env.PUBLIC_API_URL ?? "").replace(/\/$/, "");
    if (apiBase) return `${apiBase}${trimmed}`;
  }
  return `${resolvePmailWebOrigin()}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function userHasCustomSignature(settings: {
  activeSignatureId: string | null;
  signatures: Array<{ id: string; body: string }>;
}): boolean {
  if (!settings.signatures.length) return false;
  const activeId = settings.activeSignatureId ?? settings.signatures[0]?.id ?? null;
  if (!activeId) return false;
  const active = settings.signatures.find((signature) => signature.id === activeId);
  return Boolean(active?.body?.trim());
}

export function resolveActiveSignatureBody(settings: {
  activeSignatureId: string | null;
  signatures: Array<{ id: string; body: string }>;
}): string | null {
  const activeId = settings.activeSignatureId ?? settings.signatures[0]?.id ?? null;
  if (!activeId) return null;
  const active = settings.signatures.find((signature) => signature.id === activeId);
  const body = active?.body?.trim();
  return body || null;
}

export function resolveDefaultBrandedSignatureExploreUrl(): string {
  const env = getEnv();
  if (env.NODE_ENV === "production") {
    return PRODUCTION_EXPLORE_URL;
  }
  return `${resolvePmailWebOrigin()}/welcome/prohost`;
}

export function resolveDefaultBrandedSignatureLogoUrl(): string {
  return absolutizePublicAssetUrl(DEFAULT_SIGNATURE_LOGO_PATH);
}

export async function resolveBrandedLogoUrl(_tenantId: string): Promise<string> {
  const { getPmailPlatformConfig } = await import("./pmail-platform-config.service.js");
  const config = await getPmailPlatformConfig();
  if (config.defaultSignatureLogoUrl?.trim()) {
    return absolutizePublicAssetUrl(config.defaultSignatureLogoUrl.trim());
  }
  return resolveDefaultBrandedSignatureLogoUrl();
}

export function buildDefaultBrandedSignatureHtml(input: { logoUrl: string; exploreUrl: string }): string {
  const safeLogo = escapeHtml(input.logoUrl);
  const safeExplore = escapeHtml(input.exploreUrl);
  const tagline = escapeHtml(PMail_DEFAULT_SIGNATURE_TAGLINE);
  return `<div ${SIGNATURE_MARKER} contenteditable="false" style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-family:Segoe UI,system-ui,sans-serif;font-size:13px;color:#334155;line-height:1.5">
<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${safeLogo}" alt="PMail+" width="44" height="44" style="display:block;border-radius:10px" /></td>
<td style="vertical-align:middle"><strong style="color:#0d4f6c">PMail+</strong><br/><span>${tagline}</span><br/><table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:8px"><tr><td style="background:#0d9488;border-radius:8px"><a href="${safeExplore}" ${PMail_SIGNATURE_EXPLORE_ATTR} target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 14px;color:#ffffff;font-weight:600;text-decoration:none;border-radius:8px">Explore Now</a></td></tr></table></td>
</tr></table></div>`;
}

export function buildDefaultBrandedSignatureText(exploreUrl: string): string {
  return `\n\n--\n${PMail_DEFAULT_SIGNATURE_TAGLINE}\nExplore Now: ${exploreUrl}`;
}

export async function getDefaultBrandedSignatureForTenant(tenantId: string) {
  const { getPmailPlatformConfig } = await import("./pmail-platform-config.service.js");
  const platform = await getPmailPlatformConfig();
  const exploreUrl =
    platform.defaultSignatureExploreUrl?.trim() || resolveDefaultBrandedSignatureExploreUrl();
  const logoUrl = await resolveBrandedLogoUrl(tenantId);
  return {
    html: buildDefaultBrandedSignatureHtml({ logoUrl, exploreUrl }),
    text: buildDefaultBrandedSignatureText(exploreUrl),
  };
}

export type InlineSignatureLogoAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
  cid: string;
};

let cachedSignatureLogo: Buffer | null = null;

function resolveSignatureLogoPaths(): string[] {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const apiRoot = resolve(moduleDir, "..");
  return [
    resolve(apiRoot, "../assets/pmail-signature-logo.png"),
    resolve(apiRoot, "assets/pmail-signature-logo.png"),
    resolve(process.cwd(), "apps/hmail-api/assets/pmail-signature-logo.png"),
    resolve(process.cwd(), "assets/pmail-signature-logo.png"),
    resolve(process.cwd(), "apps/hmail-web/public/pmail-signature-logo.png"),
    resolve(process.cwd(), "apps/hmail-web/public/pwa-192.png"),
  ];
}

/** Absolute filesystem path for the bundled signature logo (public route + CID embed). */
export function resolveSignatureLogoFilePath(): string | null {
  for (const logoPath of resolveSignatureLogoPaths()) {
    if (existsSync(logoPath)) return logoPath;
  }
  return null;
}

function isDefaultBundledLogoUrl(logoUrl?: string): boolean {
  if (!logoUrl) return true;
  const lower = logoUrl.toLowerCase();
  return (
    lower.includes("/pmail-signature-logo") ||
    lower.includes("/pmail-app-icon") ||
    lower.includes("/pwa-192")
  );
}

async function loadSignatureLogoBuffer(logoUrl?: string): Promise<Buffer> {
  if (cachedSignatureLogo && !logoUrl) return cachedSignatureLogo;

  if (logoUrl && /^https?:\/\//i.test(logoUrl) && !isDefaultBundledLogoUrl(logoUrl)) {
    const response = await fetch(logoUrl);
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  for (const logoPath of resolveSignatureLogoPaths()) {
    if (!existsSync(logoPath)) continue;
    const buffer = await readFile(logoPath);
    if (!logoUrl) cachedSignatureLogo = buffer;
    return buffer;
  }

  throw new Error("PMail signature logo asset not found");
}

function refreshBrandedSignatureUrls(html: string): string {
  const exploreUrl = escapeHtml(PRODUCTION_EXPLORE_URL);
  const logoUrl = escapeHtml(absolutizePublicAssetUrl(DEFAULT_SIGNATURE_LOGO_PATH));

  let updated = html.replace(
    /href\s*=\s*["']https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/welcome\/prohost\/?["']/gi,
    `href="${exploreUrl}"`,
  );

  updated = updated.replace(
    /(<a\b[^>]*\shref\s*=\s*["'])([^"']*)(["'][^>]*>\s*Explore Now\s*<\/a>)/gi,
    (full, prefix, href, suffix) => {
      if (!isLocalDevOrigin(href) && href.includes("/welcome/prohost")) {
        return full;
      }
      return `${prefix}${exploreUrl}${suffix}`;
    },
  );

  updated = updated.replace(
    /(<div[^>]*data-pmail-signature="branded"[\s\S]*?<img[^>]*\ssrc=")([^"']*)(["'])/i,
    `$1${logoUrl}$3`,
  );

  return updated;
}

/** Fix localhost explore/logo URLs and restore marker when the compose editor strips attributes. */
export function normalizeOutboundBrandedSignature(html: string): string {
  const hasBrandedSignature =
    html.includes(PMail_DEFAULT_SIGNATURE_TAGLINE) ||
    html.includes(SIGNATURE_MARKER) ||
    html.includes(PMail_SIGNATURE_EXPLORE_ATTR);

  if (!hasBrandedSignature) {
    return html;
  }

  if (html.includes(SIGNATURE_MARKER)) {
    return refreshBrandedSignatureUrls(html);
  }

  const exploreUrl = resolveDefaultBrandedSignatureExploreUrl();
  const logoUrl = resolveDefaultBrandedSignatureLogoUrl();
  const stripped = html.replace(
    /<div[^>]*>[\s\S]*?Do More With PMail\+[\s\S]*?<\/table>\s*<\/div>/i,
    "",
  );
  const freshBlock = buildDefaultBrandedSignatureHtml({ logoUrl, exploreUrl });
  return `${stripped.trimEnd()}${freshBlock}`;
}

/** Replace remote logo URL with CID so signature images render in Gmail/Outlook. */
export async function embedBrandedSignatureLogoInline(html: string): Promise<{
  html: string;
  inlineAttachment: InlineSignatureLogoAttachment | null;
}> {
  const hasBrandedBlock =
    html.includes(SIGNATURE_MARKER) || html.includes(PMail_DEFAULT_SIGNATURE_TAGLINE);
  if (!hasBrandedBlock) {
    return { html, inlineAttachment: null };
  }

  let logoBuffer: Buffer;
  try {
    const logoMatch = html.match(
      /(<div[^>]*data-pmail-signature="branded"[\s\S]*?<img[^>]*\ssrc=")([^"]*)(")/i,
    );
    const logoSrc = logoMatch?.[2];
    logoBuffer = await loadSignatureLogoBuffer(logoSrc?.startsWith("http") ? logoSrc : undefined);
  } catch {
    return { html, inlineAttachment: null };
  }

  const cid = PMail_SIGNATURE_LOGO_CID;
  const replacementPatterns = [
    /(<div[^>]*data-pmail-signature="branded"[\s\S]*?<img[^>]*\ssrc=")([^"]*)(")/i,
    /(<img[^>]*\salt="PMail\+"[^>]*\ssrc=")([^"]*)(")/i,
    /(<img[^>]*\ssrc=")([^"]*(?:pmail-app-icon|pwa-192|pmail-signature)[^"]*)(")/i,
  ];

  let updated = html;
  let replaced = false;
  for (const pattern of replacementPatterns) {
    if (!pattern.test(updated)) continue;
    updated = updated.replace(pattern, `$1cid:${cid}$3`);
    replaced = true;
    break;
  }

  if (!replaced) {
    return { html, inlineAttachment: null };
  }

  return {
    html: updated,
    inlineAttachment: {
      filename: "pmail-signature-logo.png",
      content: logoBuffer,
      contentType: "image/png",
      cid,
    },
  };
}

export function splitBrandedSignatureBlocks(html: string): {
  prefix: string;
  signature: string | null;
  suffix: string;
} {
  const match = html.match(BRANDED_SIGNATURE_BLOCK_RE);
  if (!match || match.index === undefined) {
    return { prefix: html, signature: null, suffix: "" };
  }
  const signature = match[1];
  return {
    prefix: html.slice(0, match.index),
    signature,
    suffix: html.slice(match.index + signature.length),
  };
}

function bodyContainsSignatureMarker(html?: string, text?: string): boolean {
  if (html?.includes(SIGNATURE_MARKER)) return true;
  if (html?.includes(PMail_DEFAULT_SIGNATURE_TAGLINE)) return true;
  if (text?.includes(PMail_DEFAULT_SIGNATURE_TAGLINE)) return true;
  return false;
}

export async function appendOutboundSignature(input: {
  userId: string;
  tenantId: string;
  html?: string;
  text?: string;
}): Promise<{ html?: string; text?: string }> {
  if (bodyContainsSignatureMarker(input.html, input.text)) {
    const html = input.html ? normalizeOutboundBrandedSignature(input.html) : input.html;
    return { html, text: input.text };
  }

  const composeSettings = await getComposeSettingsByUserId(input.userId);
  const customBody = resolveActiveSignatureBody(composeSettings);

  if (customBody) {
    if (input.html?.includes(customBody) || input.text?.includes(customBody.replace(/<[^>]+>/g, ""))) {
      return { html: input.html, text: input.text };
    }
    return {
      html: input.html ? `${input.html}<br><br>${customBody}` : customBody,
      text: input.text ? `${input.text}\n\n${customBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")}` : customBody.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
    };
  }

  const branded = await getDefaultBrandedSignatureForTenant(input.tenantId);
  return {
    html: input.html ? `${input.html}${branded.html}` : branded.html,
    text: input.text ? `${input.text}${branded.text}` : branded.text.trim(),
  };
}
