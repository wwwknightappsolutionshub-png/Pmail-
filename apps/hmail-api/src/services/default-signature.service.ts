import { getEnv } from "../config/env.js";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";

export const PMail_DEFAULT_SIGNATURE_TAGLINE =
  "Do More With PMail+ | Unify Your Multiple Email Accounts";

const SIGNATURE_MARKER = 'data-pmail-signature="branded"';
export const PMail_SIGNATURE_MARKER = SIGNATURE_MARKER;
export const PMail_SIGNATURE_LOGO_CID = "pmail-signature-logo@pmail";

const BRANDED_SIGNATURE_BLOCK_RE = /(<div[^>]*data-pmail-signature="branded"[\s\S]*?<\/div>)/i;

function resolveWebOrigin(): string {
  return getEnv().HOSTNET_WEB_URL.replace(/\/$/, "");
}

function resolvePmailWebOrigin(): string {
  const env = getEnv();
  const firstCorsOrigin = env.CORS_ORIGIN.split(",")[0]?.trim();
  if (firstCorsOrigin) {
    return firstCorsOrigin.replace(/\/$/, "");
  }
  return resolveWebOrigin();
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
  return `${resolvePmailWebOrigin()}/welcome/prohost/`;
}

export function resolveDefaultBrandedSignatureLogoUrl(): string {
  return `${resolvePmailWebOrigin()}/pwa-192.png`;
}

export async function resolveBrandedLogoUrl(_tenantId: string): Promise<string> {
  return resolveDefaultBrandedSignatureLogoUrl();
}

export function buildDefaultBrandedSignatureHtml(input: { logoUrl: string; exploreUrl: string }): string {
  const safeLogo = escapeHtml(input.logoUrl);
  const safeExplore = escapeHtml(input.exploreUrl);
  const tagline = escapeHtml(PMail_DEFAULT_SIGNATURE_TAGLINE);
  return `<div ${SIGNATURE_MARKER} style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-family:Segoe UI,system-ui,sans-serif;font-size:13px;color:#334155;line-height:1.5">
<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${safeLogo}" alt="PMail+" width="44" height="44" style="display:block;border-radius:10px" /></td>
<td style="vertical-align:middle"><strong style="color:#0d4f6c">PMail+</strong><br/><span>${tagline}</span><br/><a href="${safeExplore}" style="display:inline-block;margin-top:8px;padding:8px 14px;background:#0d9488;color:#ffffff;font-weight:600;text-decoration:none;border-radius:8px">Explore Now</a></td>
</tr></table></div>`;
}

export function buildDefaultBrandedSignatureText(exploreUrl: string): string {
  return `\n\n--\n${PMail_DEFAULT_SIGNATURE_TAGLINE}\nExplore Now: ${exploreUrl}`;
}

export async function getDefaultBrandedSignatureForTenant(tenantId: string) {
  const exploreUrl = resolveDefaultBrandedSignatureExploreUrl();
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

async function loadSignatureLogoBuffer(): Promise<Buffer> {
  if (cachedSignatureLogo) return cachedSignatureLogo;
  const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const logoPath = resolve(apiRoot, "../assets/pmail-signature-logo.png");
  cachedSignatureLogo = await readFile(logoPath);
  return cachedSignatureLogo;
}

/** Replace remote logo URL with CID so signature images render in Gmail/Outlook. */
export async function embedBrandedSignatureLogoInline(html: string): Promise<{
  html: string;
  inlineAttachment: InlineSignatureLogoAttachment | null;
}> {
  if (!html.includes(SIGNATURE_MARKER)) {
    return { html, inlineAttachment: null };
  }

  const logoBuffer = await loadSignatureLogoBuffer();
  const cid = PMail_SIGNATURE_LOGO_CID;
  const updated = html.replace(
    /(<div[^>]*data-pmail-signature="branded"[\s\S]*?<img[^>]*\ssrc=")([^"]*)(")/i,
    `$1cid:${cid}$3`,
  );

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
    return { html: input.html, text: input.text };
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
