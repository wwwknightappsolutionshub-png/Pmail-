import type { EmailTemplateSeed } from "./email-template-seeds.js";
import { ADDON_CATALOG, getCatalogEntry } from "./addon-catalog.js";
import { ADDON_VERTICAL_LABELS, ADDON_VERTICAL_ORDER, type AddonVertical } from "./addon-verticals.js";

export const PANEL_EDUCATION_ADDON_SLUGS = [
  "open-tracking",
  "file-vault-functionality",
  "inbox-cleanup-functionality",
  "attachment-categorize-functionality",
  "esign-from-email-functionality",
  "email-sla-tracker-functionality",
  "mail2pdf-functionality",
  "auto-reply-functionality",
] as const;

const VERTICAL_KEYS = ADDON_VERTICAL_ORDER.filter((v) => v !== "platform") as Exclude<
  AddonVertical,
  "platform"
>[];

const PMAil_SIGNATURE = `PMail+ by Prohost Cloud · Your branded mail workspace`;

const EDU_WRAPPER = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f0fdfa;color:#0f172a}
.wrap{max-width:560px;margin:0 auto;padding:32px 16px}
.card{background:#fff;border-radius:12px;border:1px solid #99f6e4;overflow:hidden;box-shadow:0 4px 24px rgba(13,148,136,.12)}
.head{background:linear-gradient(135deg,#0d9488,#14b8a6);padding:28px 24px;color:#fff}
.head h1{margin:0;font-size:1.35rem;font-weight:700}
.body{padding:24px;line-height:1.6;font-size:15px}
.btn{display:inline-block;margin-top:16px;padding:12px 24px;background:#0d9488;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600}
.muted{color:#64748b;font-size:13px}
.foot{padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}
ul{padding-left:1.2rem}
</style></head>
<body><div class="wrap"><div class="card">
<div class="head"><h1>PMail+</h1></div>
<div class="body">${body}</div>
<div class="foot">{{signatureHtml}}<br/><a href="{{optOutUrl}}">Unsubscribe from PMail+ education emails</a></div>
</div></div></body></html>`;

const PANEL_USE_CASES: Record<string, string> = {
  "open-tracking":
    "You send a proposal from PMail+ and see within the hour that your client opened it twice — perfect moment to follow up while you are top of mind.",
  "file-vault-functionality":
    "A 45 MB design package is too large for normal attachment limits. Upload once to File Vault and drop a secure link into your reply.",
  "inbox-cleanup-functionality":
    "Friday afternoon: bulk-archive newsletters from one noisy sender and unsubscribe from three lists you never read — without leaving your inbox.",
  "attachment-categorize-functionality":
    "Tax season: Attachment Categories surfaces every invoice and receipt PDF in your inbox so you can export them to your vault in minutes.",
  "esign-from-email-functionality":
    "A client emails a contract PDF. Send it for e-signature directly from the message thread and track status from PMail+.",
  "email-sla-tracker-functionality":
    "A support lead sets a 4-hour SLA on inbound client threads. PMail+ flags the one thread at risk before it breaches.",
  "mail2pdf-functionality":
    "Export a six-message negotiation thread to a single PDF for your records before archiving the mailbox folder.",
  "auto-reply-functionality":
    "While you are on site visits, Auto Reply acknowledges every new inquiry with your hours and a link to book a call.",
};

const PANEL_UPSELL_VERTICAL = new Set([
  "esign-from-email-functionality",
  "email-sla-tracker-functionality",
  "attachment-categorize-functionality",
]);

function panelTemplateForSlug(slug: string): EmailTemplateSeed {
  const entry = getCatalogEntry(slug);
  const name = entry?.name ?? slug;
  const description = entry?.description ?? "";
  const features = entry?.features ?? [];
  const upsellVertical = PANEL_UPSELL_VERTICAL.has(slug);
  const upsellLine = upsellVertical
    ? "<p>Teams in law, accounting, real estate, and other industries also unlock vertical workspaces built on the same inbox.</p>"
    : "<p>Combine this with other PMail+ workspace tools in the Platform bundle for a complete mail operations stack.</p>";

  return {
    slug: `addon-edu-panel-${slug}`,
    name: `PMail+ education — ${name}`,
    category: "pmail-education",
    subject: `Discover {{addonName}} in {{productName}}`,
    variables: [
      "fullName",
      "productName",
      "addonName",
      "addonDescription",
      "benefitsList",
      "useCase",
      "ctaUrl",
      "verticalCtaUrl",
      "signatureHtml",
      "optOutUrl",
    ],
    textBody: `Hi {{fullName}},

{{addonName}} in {{productName}} helps you work smarter from the same inbox you already use.

{{addonDescription}}

Benefits:
{{benefitsList}}

Example: {{useCase}}

Explore this tool: {{ctaUrl}}
Industry workspaces: {{verticalCtaUrl}}

{{signatureHtml}}
Unsubscribe: {{optOutUrl}}`,
    htmlBody: EDU_WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>{{addonName}}</strong> is part of your {{productName}} workspace — same login, same mailbox, more capability.</p>
<p>{{addonDescription}}</p>
<p><strong>Why teams use it</strong></p>
<p>{{benefitsList}}</p>
<p><strong>Real-world scenario</strong></p>
<p><em>{{useCase}}</em></p>
${upsellLine}
<p><a class="btn" href="{{ctaUrl}}">Explore {{addonName}}</a></p>
<p class="muted"><a href="{{verticalCtaUrl}}">Browse industry workspace add-ons</a></p>`),
  };
}

function verticalTemplateForKey(key: string, label: string): EmailTemplateSeed {
  const isGeneric = key === "generic";
  const products = isGeneric
    ? VERTICAL_KEYS.map((v) => ADDON_VERTICAL_LABELS[v])
    : ADDON_CATALOG.filter((e) => e.vertical === key && !e.comingSoon)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 4)
        .map((e) => e.name);
  const productList = products.map((n) => `<li>${n}</li>`).join("");
  const verticalDescription = isGeneric
    ? "{{productName}} includes optional industry workspace add-ons for law, real estate, accounting, recruitment, B2B services, and healthcare — all connected to the same branded mailbox you use today."
    : `Your mailbox runs on a custom domain — {{productName}} can extend your inbox with purpose-built tools for ${label.toLowerCase()}.`;

  return {
    slug: `addon-edu-vertical-${key}`,
    name: `PMail+ education — ${label}`,
    category: "pmail-education",
    subject: `Industry tools for {{verticalLabel}} — inside {{productName}}`,
    variables: [
      "fullName",
      "productName",
      "verticalLabel",
      "verticalDescription",
      "productListHtml",
      "ctaUrl",
      "signatureHtml",
      "optOutUrl",
    ],
    textBody: `Hi {{fullName}},

${isGeneric ? "{{verticalDescription}}" : verticalDescription}

Tools include:
${products.map((n) => `• ${n}`).join("\n")}

Explore: {{ctaUrl}}

{{signatureHtml}}
Unsubscribe: {{optOutUrl}}`,
    htmlBody: EDU_WRAPPER(`
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>${isGeneric ? "{{verticalDescription}}" : verticalDescription}</p>
<p><strong>What you can activate</strong></p>
<ul>${productList}</ul>
<p><a class="btn" href="{{ctaUrl}}">View {{verticalLabel}} workspace add-ons</a></p>`),
  };
}

export const ADDON_EDUCATION_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  ...PANEL_EDUCATION_ADDON_SLUGS.map(panelTemplateForSlug),
  verticalTemplateForKey(
    "generic",
    "Industry workspace add-ons",
  ),
  ...VERTICAL_KEYS.map((key) =>
    verticalTemplateForKey(key, ADDON_VERTICAL_LABELS[key]),
  ),
];

export const DEFAULT_PANEL_CAMPAIGN_STEPS = PANEL_EDUCATION_ADDON_SLUGS.map((slug, index) => ({
  campaignType: "panel",
  stepKey: slug,
  templateSlug: `addon-edu-panel-${slug}`,
  sortOrder: index,
}));

export const DEFAULT_VERTICAL_CAMPAIGN_STEPS = [
  { campaignType: "vertical", stepKey: "generic", templateSlug: "addon-edu-vertical-generic", sortOrder: 0 },
  ...VERTICAL_KEYS.map((key, index) => ({
    campaignType: "vertical",
    stepKey: key,
    templateSlug: `addon-edu-vertical-${key}`,
    sortOrder: index + 1,
  })),
];

export function getPanelUseCase(slug: string): string {
  return PANEL_USE_CASES[slug] ?? "Use this workspace tool directly from your PMail+ inbox.";
}

export function getPanelBenefitsList(slug: string): string {
  const entry = getCatalogEntry(slug);
  const features = entry?.features ?? [];
  return features.map((f) => `• ${f}`).join("\n");
}

export const PMAil_EDUCATION_SIGNATURE_HTML = `<strong>${PMAil_SIGNATURE}</strong>`;
