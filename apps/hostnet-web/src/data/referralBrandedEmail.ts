export type ReferralBrandedEmailInput = {
  referralUrl: string;
  senderName: string;
  senderEmail: string;
  signatureFooter: string;
  productName?: string;
};

export function buildPmailReferralHtml(input: ReferralBrandedEmailInput): string {
  const productName = input.productName?.trim() || "PMail+";
  const signature = input.signatureFooter.trim() || input.senderName;
  const safeUrl = input.referralUrl.replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#ecfeff;color:#0f172a}
.wrap{max-width:620px;margin:0 auto;padding:24px 16px}
.card{background:#fff;border-radius:18px;border:1px solid #99f6e4;overflow:hidden;box-shadow:0 12px 40px rgba(13,148,136,.14)}
.brand-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;background:linear-gradient(135deg,#042f3f,#0d9488);color:#fff}
.brand-logo{font-size:1.35rem;font-weight:800;letter-spacing:-0.02em}
.brand-tag{font-size:.78rem;opacity:.88;text-transform:uppercase;letter-spacing:.12em}
.head{padding:24px 24px 8px;color:#0f172a}
.head h1{margin:0 0 8px;font-size:1.5rem;font-weight:700;line-height:1.25}
.head p{margin:0;color:#475569;font-size:.96rem;line-height:1.55}
.body{padding:8px 24px 24px;line-height:1.65;font-size:15px;color:#334155}
.feature{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0}
.feature strong{display:block;margin-bottom:4px;color:#0f172a}
.btn{display:inline-block;margin-top:18px;padding:12px 24px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:999px;font-weight:600}
.muted{color:#64748b;font-size:13px}
.foot-signature{padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:14px;color:#334155;white-space:pre-line}
.brand-foot{padding:16px 24px 20px;background:linear-gradient(135deg,#042f3f,#0d4f6c);color:#fff;text-align:center}
.brand-foot strong{display:block;font-size:1rem;font-weight:700;margin-bottom:4px}
.brand-foot p{margin:0;font-size:.82rem;opacity:.88}
</style></head>
<body><div class="wrap"><div class="card">
<div class="brand-top"><span class="brand-logo">${productName}</span><span class="brand-tag">Mail workspace</span></div>
<div class="head"><h1>Explore More Possibilities With Mails On ${productName} | Join Me</h1><p>A smarter mail workspace with tools that grow with your business</p></div>
<div class="body">
<p>Hi there,</p>
<p>I've switched my day-to-day mail to <strong>${productName}</strong> and thought you'd benefit from it too. It's more than inbox — it's a workspace where mail, scheduling, and business tools stay in one place.</p>
<div class="feature"><strong>Mail that feels modern</strong>Fast compose, organized folders, signatures, and a workspace built for real operators.</div>
<div class="feature"><strong>Platform tools ready when you need them</strong>Calendar, scheduled send, open tracking, WhatsApp handoff, and Mail2PDF exports.</div>
<div class="feature"><strong>Industry workspaces</strong>Legal, accounting, healthcare, recruitment, and more — unlock vertical tools only when your team is ready.</div>
<div class="feature"><strong>Upgrade on your terms</strong>Start with regular mail, explore the environment, and subscribe only to the bundles you want.</div>
<p><a class="btn" href="${safeUrl}">Explore ${productName}</a></p>
<p class="muted">Use the link above to sign in and explore the same mail experience I'm using.</p>
</div>
<div class="foot-signature">${escapeHtml(signature)}</div>
<div class="brand-foot"><strong>${productName}</strong><p>Modern mail workspace with calendar, industry tools, and upgrades on your terms.</p></div>
</div></div></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function referralHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
