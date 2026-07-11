/**
 * Shared PMail+ / Prohost outbound email chrome.
 * Matches the refer-a-friend card (teal gradient header, pill CTA, feature cards).
 * Table + inline styles for Gmail / Outlook / mobile clients.
 */

export type BrandedEmailOptions = {
  bodyHtml: string;
  brandName?: string;
  brandTag?: string;
  headline?: string;
  subhead?: string;
  signatureHtml?: string;
  footBlurb?: string;
  /** Extra HTML under the signature / above the brand foot (e.g. education opt-out). */
  footExtraHtml?: string;
};

const FONT =
  "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif";

export function emailBtn(href: string, label: string): string {
  return `<a class="btn" href="${href}" style="display:inline-block;margin-top:18px;padding:14px 28px;background:#0d9488;color:#ffffff!important;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;line-height:1.2;text-align:center">${label}</a>`;
}

export function emailFeature(title: string, description: string): string {
  return `<div class="feature" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0"><strong style="display:block;margin-bottom:4px;color:#0f172a;font-size:15px">${title}</strong><span style="color:#475569;font-size:14px;line-height:1.55">${description}</span></div>`;
}

export function emailMuted(html: string): string {
  return `<p class="muted" style="margin:12px 0 0;color:#64748b;font-size:13px;line-height:1.5">${html}</p>`;
}

export function wrapBrandedEmail(options: BrandedEmailOptions): string {
  const brandName = options.brandName ?? "PMail+";
  const brandTag = options.brandTag ?? "Mail workspace";
  const footBlurb =
    options.footBlurb ??
    "Modern mail workspace with calendar, industry tools, and upgrades on your terms.";

  const headlineBlock = options.headline
    ? `<tr><td class="head" style="padding:24px 24px 8px;color:#0f172a">
<h1 class="head-title" style="margin:0 0 8px;font-size:1.5rem;font-weight:700;line-height:1.25;color:#0f172a;font-family:${FONT}">${options.headline}</h1>
${
  options.subhead
    ? `<p style="margin:0;color:#475569;font-size:.96rem;line-height:1.55;font-family:${FONT}">${options.subhead}</p>`
    : ""
}
</td></tr>`
    : "";

  const signatureBlock = options.signatureHtml
    ? `<tr><td class="foot-signature" style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:14px;color:#334155;white-space:pre-line;font-family:${FONT}">${options.signatureHtml}</td></tr>`
    : "";

  const footExtraBlock = options.footExtraHtml
    ? `<tr><td style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;font-family:${FONT}">${options.footExtraHtml}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light only"/>
<meta name="supported-color-schemes" content="light only"/>
<title>${brandName}</title>
<style>
body{margin:0!important;padding:0!important;background:#ecfeff!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a{color:#0d9488}
.btn{display:inline-block!important;margin-top:18px!important;padding:14px 28px!important;background:#0d9488!important;color:#ffffff!important;text-decoration:none!important;border-radius:999px!important;font-weight:700!important}
.feature{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0}
.muted{color:#64748b;font-size:13px}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;color:#0f172a}
.body p{margin:0 0 14px;line-height:1.65;font-size:15px;color:#334155}
.body ul{margin:0 0 14px;padding-left:1.2rem;color:#334155;font-size:15px;line-height:1.65}
.body li{margin:0 0 6px}
@media only screen and (max-width:620px){
  .outer-pad{padding:12px 8px!important}
  .card{border-radius:14px!important}
  .brand-pad{padding:14px 16px!important}
  .body-pad{padding:8px 16px 20px!important}
  .head-pad{padding:20px 16px 8px!important}
  .head-title{font-size:1.25rem!important}
  .brand-logo{font-size:1.15rem!important}
  .brand-tag{font-size:.7rem!important;letter-spacing:.08em!important}
  .btn{display:block!important;width:100%!important;box-sizing:border-box!important;text-align:center!important}
  .plans{display:block!important}
  .plan-cell{display:block!important;width:100%!important;padding:0 0 12px!important}
}
</style>
</head>
<body style="margin:0;padding:0;background:#ecfeff;font-family:${FONT};color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecfeff;width:100%">
<tr><td class="outer-pad" align="center" style="padding:24px 12px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:18px;border:1px solid #99f6e4;overflow:hidden;box-shadow:0 12px 40px rgba(13,148,136,.14)">
<tr><td class="brand-top brand-pad" style="padding:16px 24px;background:linear-gradient(135deg,#042f3f,#0d9488);color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" valign="middle" class="brand-logo" style="font-size:1.35rem;font-weight:800;letter-spacing:-0.02em;color:#ffffff;font-family:${FONT}">${brandName}</td>
<td align="right" valign="middle" class="brand-tag" style="font-size:.78rem;opacity:.88;text-transform:uppercase;letter-spacing:.12em;color:#ffffff;font-family:${FONT};white-space:nowrap">${brandTag}</td>
</tr></table>
</td></tr>
${headlineBlock}
<tr><td class="body body-pad" style="padding:8px 24px 24px;line-height:1.65;font-size:15px;color:#334155;font-family:${FONT}">
${options.bodyHtml}
</td></tr>
${signatureBlock}
${footExtraBlock}
<tr><td class="brand-foot" style="padding:16px 24px 20px;background:linear-gradient(135deg,#042f3f,#0d4f6c);color:#ffffff;text-align:center;font-family:${FONT}">
<strong style="display:block;font-size:1rem;font-weight:700;margin-bottom:4px;color:#ffffff">${brandName}</strong>
<p style="margin:0;font-size:.82rem;opacity:.88;color:#ffffff;line-height:1.45">${footBlurb}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Default shell for seeded transactional templates (Prohost / PMail). */
export function WRAPPER(
  bodyHtml: string,
  options?: Omit<BrandedEmailOptions, "bodyHtml">,
): string {
  return wrapBrandedEmail({
    brandName: options?.brandName ?? "Prohost Cloud",
    brandTag: options?.brandTag ?? "Cloud platform",
    footBlurb:
      options?.footBlurb ?? "Enterprise hosting, mail &amp; infrastructure from Prohost Cloud.",
    ...options,
    bodyHtml,
  });
}

/** PMail+-branded shell (productName may be a merge tag). */
export function PMAIL_WRAPPER(
  bodyHtml: string,
  options?: Omit<BrandedEmailOptions, "bodyHtml">,
): string {
  return wrapBrandedEmail({
    brandName: options?.brandName ?? "{{productName}}",
    brandTag: options?.brandTag ?? "Mail workspace",
    footBlurb:
      options?.footBlurb ??
      "Modern mail workspace with calendar, industry tools, and upgrades on your terms.",
    ...options,
    bodyHtml,
  });
}
