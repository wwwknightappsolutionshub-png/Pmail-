import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";

export const PMail_DEFAULT_SIGNATURE_TAGLINE =
  "Do More With PMail+ | Unify Your Multiple Email Accounts | Join Free";

const SIGNATURE_MARKER = 'data-pmail-signature="branded"';

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

export async function resolveBrandedLogoUrl(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { branding: { select: { logoUrl: true } } },
  });
  const logo = tenant?.branding?.logoUrl?.trim();
  if (logo && /^https?:\/\//i.test(logo)) {
    return logo;
  }
  return `${resolvePmailWebOrigin()}/favicon.svg`;
}

export function buildDefaultBrandedSignatureHtml(input: { logoUrl: string; joinUrl: string }): string {
  const safeLogo = escapeHtml(input.logoUrl);
  const safeJoin = escapeHtml(input.joinUrl);
  const tagline = escapeHtml(PMail_DEFAULT_SIGNATURE_TAGLINE);
  return `<div ${SIGNATURE_MARKER} style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-family:Segoe UI,system-ui,sans-serif;font-size:13px;color:#334155;line-height:1.5">
<table cellpadding="0" cellspacing="0" role="presentation"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${safeLogo}" alt="PMail+" width="44" height="44" style="display:block;border-radius:10px" /></td>
<td style="vertical-align:middle"><strong style="color:#0d4f6c">PMail+</strong><br/><span>${tagline}</span><br/><a href="${safeJoin}" style="color:#0d9488;font-weight:600;text-decoration:none">Join Free</a></td>
</tr></table></div>`;
}

export function buildDefaultBrandedSignatureText(joinUrl: string): string {
  return `\n\n--\n${PMail_DEFAULT_SIGNATURE_TAGLINE}\n${joinUrl}`;
}

export async function getDefaultBrandedSignatureForTenant(tenantId: string) {
  const joinUrl = `${resolveWebOrigin()}/welcome`;
  const logoUrl = await resolveBrandedLogoUrl(tenantId);
  return {
    html: buildDefaultBrandedSignatureHtml({ logoUrl, joinUrl }),
    text: buildDefaultBrandedSignatureText(joinUrl),
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
