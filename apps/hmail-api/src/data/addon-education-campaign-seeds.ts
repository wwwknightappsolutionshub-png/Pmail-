import type { EmailTemplateSeed } from "./email-template-seeds.js";
import { PMAIL_ADDONS_URL } from "./email-cta-urls.js";
import { emailBtn, emailFeature, emailMuted, PMAIL_WRAPPER } from "./email-brand-shell.js";
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

const PMAil_SIGNATURE = `PMail+ by Prohost Cloud · Branded business email workspace`;

const EDU_WRAPPER = (body: string, headline: string, subhead?: string) =>
  PMAIL_WRAPPER(body, {
    brandName: "PMail+",
    headline,
    subhead,
    footExtraHtml: `{{signatureHtml}}<br/><a href="${PMAIL_ADDONS_URL}" style="color:#0d9488;font-weight:600">Unsubscribe from PMail+ education emails</a>`,
  });

type PanelEduCopy = {
  subject: string;
  headline: string;
  subhead: string;
  introHtml: string;
  introText: string;
  featureBlocks: Array<{ title: string; body: string }>;
  useCase: string;
  benefitsText: string[];
  ctaLabel: string;
  closingHtml: string;
};

/** SEO-rich, product-accurate copy for each panel education step. */
const PANEL_EDU_COPY: Record<(typeof PANEL_EDUCATION_ADDON_SLUGS)[number], PanelEduCopy> = {
  "open-tracking": {
    subject: "Email open tracking & link analytics inside {{productName}}",
    headline: "Know when your email is opened — and which links get clicked",
    subhead: "Built-in email open tracking and click analytics for {{productName}} business mail",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Open Tracking</strong> turns every outbound message in {{productName}} into measurable outreach. See when recipients open your mail, which tracked links they click, and when engagement happens — without leaving your branded inbox.</p>
<p>Whether you send proposals, invoices, client updates, or follow-ups, open and click data helps you time the next conversation while you are still top of mind.</p>`,
    introText: `Hi {{fullName}},

Open Tracking in {{productName}} shows when recipients open your sent mail and which tracked links they click — so you can follow up with better timing from the same branded inbox.`,
    featureBlocks: [
      {
        title: "Tracking pixel on send",
        body: "Optional open tracking attaches when you send, so engagement is recorded against the real message in your Sent folder.",
      },
      {
        title: "Link click wrapping",
        body: "Outbound links can be wrapped for click redirects with timestamps — useful for proposals, booking pages, and document links.",
      },
      {
        title: "Open & click timeline",
        body: "Review open counts, click counts, and timestamps from your sent-mail tracking view inside {{productName}}.",
      },
      {
        title: "Same mailbox workflow",
        body: "No separate analytics tool: tracking lives next to compose, send, and follow-up in your PMail+ workspace.",
      },
    ],
    useCase:
      "You send a client proposal from {{productName}}. Within the hour, Open Tracking shows two opens and a click on the pricing section — the right moment to call while interest is fresh.",
    benefitsText: [
      "Email open tracking with send-time pixel",
      "Tracked link clicks with redirect and timestamps",
      "Sent-mail dashboard for opens and clicks",
      "Follow-up timing based on real engagement",
    ],
    ctaLabel: "Explore Open Tracking",
    closingHtml: `<p>Activate Open Tracking from the {{productName}} add-on marketplace and start measuring outbound mail performance from the inbox you already use.</p>`,
  },
  "file-vault-functionality": {
    subject: "Secure large file sharing from {{productName}} — File Vault",
    headline: "Send large files securely — without breaking attachment limits",
    subhead: "Tokenized download links and a personal file vault inside your business email workspace",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>File Vault</strong> solves the everyday limit of email attachments. Upload large files to your {{productName}} vault, then send tokenized secure download links from compose — instead of bouncing oversized PDFs, ZIP packages, or media packs.</p>
<p>Track expiry and download activity from the vault panel so sensitive handoffs stay controlled and auditable.</p>`,
    introText: `Hi {{fullName}},

File Vault in {{productName}} lets you upload large files (up to 100 MB), send secure tokenized download links from compose, and manage expiry plus download counts from your vault panel.`,
    featureBlocks: [
      {
        title: "Uploads up to 100 MB",
        body: "Move design packs, contracts, scans, and archives through secure links when SMTP attachment limits would fail.",
      },
      {
        title: "Tokenized download links",
        body: "Recipients download through protected links you insert into the email — not fragile raw attachments.",
      },
      {
        title: "Vault panel controls",
        body: "See expiry windows and download counts so you know whether a file was retrieved.",
      },
      {
        title: "Compose handoff",
        body: "Start from the message you are writing and attach a vault link without switching products.",
      },
    ],
    useCase:
      "A 45 MB design package exceeds normal attachment limits. You upload it once to File Vault, drop the secure link into your reply, and confirm the client downloaded it before the next meeting.",
    benefitsText: [
      "Large file uploads up to 100 MB",
      "Secure tokenized download links in mail",
      "Vault expiry and download-count tracking",
      "Large-file handoff directly from compose",
    ],
    ctaLabel: "Explore File Vault",
    closingHtml: `<p>Use File Vault whenever attachments are too large, too sensitive, or too important to lose in a bounced send.</p>`,
  },
  "inbox-cleanup-functionality": {
    subject: "Inbox cleanup & one-click unsubscribe in {{productName}}",
    headline: "Clean a noisy inbox by sender — and unsubscribe in one click",
    subhead: "Bulk archive, delete, and List-Unsubscribe tools for professional email hygiene",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Inbox Cleanup &amp; Unsubscribe</strong> helps you reclaim focus in {{productName}}. See which senders dominate your inbox, bulk archive or delete by sender, and use List-Unsubscribe detection for marketing mail — with an audit trail of unsubscribe actions.</p>
<p>It is built for operators who want a quieter mailbox without abandoning their branded domain.</p>`,
    introText: `Hi {{fullName}},

Inbox Cleanup & Unsubscribe in {{productName}} gives you a sender volume dashboard, bulk delete/archive/mark-read by sender, List-Unsubscribe detection, and one-click unsubscribe with an audit log.`,
    featureBlocks: [
      {
        title: "Sender volume dashboard",
        body: "Identify the accounts generating the most inbox noise before you mass-clean.",
      },
      {
        title: "Bulk actions by sender",
        body: "Delete, archive, or mark-read entire sender stacks in one pass.",
      },
      {
        title: "List-Unsubscribe detection",
        body: "Surface unsubscribe options on marketing messages so you can leave lists cleanly.",
      },
      {
        title: "Audit-logged unsubscribes",
        body: "Keep a record of unsubscribe actions for accountability and repeat cleanup.",
      },
    ],
    useCase:
      "Friday afternoon: you bulk-archive newsletters from one noisy sender and unsubscribe from three lists you never open — without leaving {{productName}}.",
    benefitsText: [
      "Sender volume dashboard for inbox cleanup",
      "Bulk delete, archive, or mark-read by sender",
      "List-Unsubscribe detection on messages",
      "One-click unsubscribe with audit log",
    ],
    ctaLabel: "Explore Inbox Cleanup",
    closingHtml: `<p>A cleaner inbox means faster replies to clients — activate Inbox Cleanup when marketing noise starts crowding priority threads.</p>`,
  },
  "attachment-categorize-functionality": {
    subject: "Auto-categorize email attachments in {{productName}}",
    headline: "Find invoices, receipts, and contracts in your mailbox automatically",
    subhead: "Attachment auto-categorization for accounting, tax, and client document workflows",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Attachment Auto-Categorize</strong> scans mailbox attachments by MIME type and filename, then groups them into business categories such as invoices, receipts, tax forms, and contracts.</p>
<p>Use the category dashboard to review classifications, override when needed, and export categorized files into File Vault for compose handoff.</p>`,
    introText: `Hi {{fullName}},

Attachment Auto-Categorize in {{productName}} classifies inbox attachments (invoices, receipts, tax forms, contracts), gives you a category dashboard with overrides, and can export categorized files to your vault for compose.`,
    featureBlocks: [
      {
        title: "MIME & filename scanning",
        body: "Automatically classify attachments across your mailbox traffic.",
      },
      {
        title: "Business categories",
        body: "Surface invoices, receipts, tax forms, and contracts without manual folder hunting.",
      },
      {
        title: "Category dashboard",
        body: "Review classifications and apply manual overrides when a file is miscategorized.",
      },
      {
        title: "Vault export for compose",
        body: "Move categorized files into File Vault when you need a secure outbound handoff.",
      },
    ],
    useCase:
      "Tax season: Attachment Auto-Categorize surfaces every invoice and receipt PDF in your inbox so you can export them to the vault and clear the month-end pile in minutes.",
    benefitsText: [
      "Scan inbox attachments by MIME type and filename",
      "Categories for invoices, receipts, tax forms, and contracts",
      "Category dashboard with manual overrides",
      "Export categorized files to vault for compose",
    ],
    ctaLabel: "Explore Attachment Auto-Categorize",
    closingHtml: `<p>Ideal for accountants, operators, and client-service teams who bury important PDFs inside ordinary mail threads.</p>`,
  },
  "esign-from-email-functionality": {
    subject: "E-sign PDFs from your {{productName}} inbox",
    headline: "Send contracts for e-signature without leaving your email thread",
    subhead: "Dropbox Sign integration for mailbox attachments and secure signing links",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>E-Sign from Email</strong> lets you send PDF and Word attachments for electronic signature via Dropbox Sign directly from {{productName}}. Start from the message that already has the document, refresh signing status, and hand the signer a secure tokenized link.</p>
<p>Keep the conversation, the document, and the signature status in one mail workspace instead of bouncing between tools.</p>`,
    introText: `Hi {{fullName}},

E-Sign from Email in {{productName}} sends mailbox PDFs/Word files for e-signature via Dropbox Sign, refreshes signing status, and shares secure tokenized download links with compose handoff for the signer.`,
    featureBlocks: [
      {
        title: "Sign from mailbox attachments",
        body: "Launch e-signature from the PDF or Word file already sitting in the thread — or upload when needed.",
      },
      {
        title: "Dropbox Sign status refresh",
        body: "Track whether a document is awaiting signature, completed, or needs follow-up.",
      },
      {
        title: "Tokenized document links",
        body: "Share secure download links instead of re-attaching unsigned drafts.",
      },
      {
        title: "Compose handoff",
        body: "Send the signer a clear next step from the same {{productName}} compose flow.",
      },
    ],
    useCase:
      "A client emails a contract PDF. You send it for e-signature from the thread, watch status update in {{productName}}, and follow up only if the signer stalls.",
    benefitsText: [
      "Send mailbox attachments or uploads for e-signature",
      "Dropbox Sign integration with status refresh",
      "Secure tokenized document download links",
      "Compose handoff with signing link for the signer",
    ],
    ctaLabel: "Explore E-Sign from Email",
    closingHtml: `<p>Law, real estate, accounting, and services teams use the same inbox pattern — document arrives, signature goes out, status stays visible.</p>`,
  },
  "email-sla-tracker-functionality": {
    subject: "Email SLA tracking & breach alerts in {{productName}}",
    headline: "Never miss a client response deadline in your inbox",
    subhead: "Inbound thread SLA timers, at-risk alerts, and response-time reporting",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Email SLA Tracker</strong> measures inbound thread response times from the first client message received. Get at-risk and breach alerts before clients wait too long, scan the inbox to sync open threads, and export CSV reports when you need an operations record.</p>
<p>It is built for support desks, practices, and agencies that treat reply speed as part of service quality.</p>`,
    introText: `Hi {{fullName}},

Email SLA Tracker in {{productName}} starts timers on inbound threads, alerts you before breaches, syncs open deadlines from the inbox, and supports compose reply handoff plus secure CSV report export.`,
    featureBlocks: [
      {
        title: "Inbound SLA timers",
        body: "Track response deadlines from the first message in a client thread.",
      },
      {
        title: "At-risk & breach alerts",
        body: "Acknowledge alerts so the team sees which conversations need attention now.",
      },
      {
        title: "Inbox sync for open threads",
        body: "Scan the mailbox to keep open threads and deadlines aligned with reality.",
      },
      {
        title: "Reply handoff & CSV export",
        body: "Jump into compose for the at-risk thread and export secure reports for ops reviews.",
      },
    ],
    useCase:
      "A support lead sets a 4-hour SLA on inbound client threads. {{productName}} flags the one thread at risk before it breaches so the reply goes out on time.",
    benefitsText: [
      "Inbound thread SLA timers from first message received",
      "At-risk and breach alerts with acknowledgement",
      "Scan inbox to sync open threads and deadlines",
      "Compose reply handoff and secure CSV report export",
    ],
    ctaLabel: "Explore Email SLA Tracker",
    closingHtml: `<p>Pair SLA Tracker with industry workspaces when your practice needs both response discipline and vertical case tools in the same mailbox.</p>`,
  },
  "mail2pdf-functionality": {
    subject: "Export email threads to PDF from {{productName}}",
    headline: "Turn email conversations into audit-ready PDF records",
    subhead: "Mail 2 PDF trail export from the mailbox detail view",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Mail 2 PDF</strong> converts selected email trails into PDF exports directly from the mailbox detail view in {{productName}}. Keep negotiation threads, client instructions, and decision trails as portable records with audit-ready attachment naming.</p>
<p>Useful for compliance files, matter notes, and anytime a conversation must leave the mailbox but stay intact.</p>`,
    introText: `Hi {{fullName}},

Mail 2 PDF in {{productName}} exports selected email trails to PDF from the mailbox detail view with audit-ready attachment naming — ideal for records, reviews, and archiving.`,
    featureBlocks: [
      {
        title: "Email trail PDF export",
        body: "Capture multi-message conversations as a single portable document.",
      },
      {
        title: "Mailbox detail action",
        body: "Export from the message view you already use — no external converter.",
      },
      {
        title: "Audit-ready naming",
        body: "Generated PDFs use clear attachment naming suited to records and handoffs.",
      },
      {
        title: "Archive with confidence",
        body: "Export first, then archive the folder knowing the trail is preserved.",
      },
    ],
    useCase:
      "You export a six-message negotiation thread to a single PDF for your records in {{productName}}, then archive the mailbox folder without losing the decision history.",
    benefitsText: [
      "Email trail PDF export",
      "Mailbox detail action",
      "Audit-ready attachment naming",
      "Portable records for compliance and client files",
    ],
    ctaLabel: "Explore Mail 2 PDF",
    closingHtml: `<p>When stakeholders ask “what was agreed in email?”, Mail 2 PDF gives you a clean answer you can file or share.</p>`,
  },
  "auto-reply-functionality": {
    subject: "Professional auto-reply for unread inbox mail in {{productName}}",
    headline: "Acknowledge every inquiry — even when you are offline",
    subhead: "Automated inbox replies with industry templates and custom editors",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p><strong>Auto Reply</strong> sends professional acknowledgments to unread inbox mail in {{productName}}. Start from industry templates or write your own, keep clients informed about hours and next steps, and stay focused on higher-value work without leaving inquiries unanswered.</p>
<p>New users receive complimentary Auto Reply access so you can test the workflow in production mail.</p>`,
    introText: `Hi {{fullName}},

Auto Reply in {{productName}} sends automatic acknowledgments to unread inbox mail, includes an industry template library and custom editor, and offers 14-day complimentary access for new users.`,
    featureBlocks: [
      {
        title: "Automatic unread replies",
        body: "Acknowledge inbound mail promptly when you cannot respond personally yet.",
      },
      {
        title: "Industry template library",
        body: "Start from templates shaped for common professional-service scenarios.",
      },
      {
        title: "Custom template editor",
        body: "Edit subject and body so replies match your brand voice and booking links.",
      },
      {
        title: "Complimentary trial window",
        body: "New users can activate Auto Reply with a 14-day complimentary period.",
      },
    ],
    useCase:
      "While you are on site visits, Auto Reply acknowledges every new inquiry with your hours and a link to book a call — so leads do not go cold in {{productName}}.",
    benefitsText: [
      "Automatic replies to unread inbox mail",
      "Industry template library",
      "Custom template editor",
      "14-day complimentary access for new users",
    ],
    ctaLabel: "Explore Auto Reply",
    closingHtml: `<p>Keep response quality high when your calendar is full — Auto Reply covers the gap without sounding generic.</p>`,
  },
};

type VerticalEduCopy = {
  subject: string;
  headline: string;
  subhead: string;
  introHtml: string;
  introText: string;
  highlightTitles: string[];
};

const VERTICAL_EDU_COPY: Record<"generic" | (typeof VERTICAL_KEYS)[number], VerticalEduCopy> = {
  generic: {
    subject: "Industry email workspaces inside {{productName}} — law, property, accounting & more",
    headline: "Purpose-built tools for your industry — same branded mailbox",
    subhead: "Legal, real estate, accounting, recruitment, B2B services, and healthcare add-ons for {{productName}}",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>{{productName}} is more than a webmail client. Optional <strong>industry workspace add-ons</strong> extend the same branded inbox with practice tools for law and immigration, real estate, accounting, recruitment, B2B services, and healthcare.</p>
<p>Activate only the vertical you need — mail, files, and client workflows stay in one Prohost Cloud workspace.</p>`,
    introText: `Hi {{fullName}},

{{productName}} includes optional industry workspace add-ons for law & immigration, real estate, accounting, recruitment, B2B services, and healthcare — all connected to the same branded mailbox.`,
    highlightTitles: [
      "Law firms & legal practices (incl. immigration / RCIC)",
      "Real estate agencies",
      "Accounting & bookkeeping firms",
      "Recruitment & staffing agencies",
      "B2B professional services",
      "Healthcare & medical practices",
    ],
  },
  legal: {
    subject: "Legal & immigration email workspace tools in {{productName}}",
    headline: "IRCC-aware mail tools for law firms and RCIC practices",
    subhead: "Case-linked mail, deadline guard, immigration desk, and AI drafting inside {{productName}}",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Your {{productName}} mailbox can run a <strong>legal and immigration workspace</strong>: IRCC mail intelligence, case-linked threads, deadline protection, matter registry, client portal, program checklists, and AI helpers for summaries, client updates, and document requests.</p>
<p>Keep client correspondence, filing deadlines, and matter context on the same branded domain you already use for email.</p>`,
    introText: `Hi {{fullName}},

{{productName}} legal & immigration tools include IRCC Mail Intelligence, Case-Linked Mail, Deadline Guard, Immigration Desk, Client Portal, Program Checklists, and AI drafting aids — on the same branded mailbox.`,
    highlightTitles: [
      "IRCC Mail Intelligence",
      "Case-Linked Mail",
      "Deadline Guard",
      "Immigration Desk / Matter Registry",
    ],
  },
  "real-estate": {
    subject: "Real estate email workspace — listings, showings & deals in {{productName}}",
    headline: "Run listings, showings, and deal rooms from your agent inbox",
    subhead: "Real estate agency tools connected to your {{productName}} branded mailbox",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>{{productName}} real estate add-ons bring a <strong>Listing Board</strong>, <strong>Showing Scheduler</strong>, agent <strong>Quick Replies</strong>, and a <strong>Deal Room</strong> into the same inbox where buyer and seller conversations already live.</p>
<p>Coordinate property interest without exporting every thread to a separate CRM for the basics.</p>`,
    introText: `Hi {{fullName}},

{{productName}} real estate tools include Listing Board, Showing Scheduler, Quick Replies, and Deal Room — built for agencies working from a branded mailbox.`,
    highlightTitles: ["Listing Board", "Showing Scheduler", "Quick Replies", "Deal Room"],
  },
  accounting: {
    subject: "Accounting email workspace — docs, filings & secure exchange in {{productName}}",
    headline: "Client documents, tax calendars, and secure exchange beside your inbox",
    subhead: "Bookkeeping and accounting firm tools for {{productName}} business email",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Accounting teams use {{productName}} to request and store client documents, track <strong>tax filing calendars</strong>, maintain a <strong>secure exchange ledger</strong>, and keep <strong>client entity</strong> records next to mailbox traffic.</p>
<p>Reduce the gap between “email said send the T4s” and “the file is actually ready.”</p>`,
    introText: `Hi {{fullName}},

{{productName}} accounting tools include Document Request Vault, Tax Filing Calendar, Secure Exchange Ledger, and Client Entity Ledger — beside the firm mailbox.`,
    highlightTitles: [
      "Document Request Vault",
      "Tax Filing Calendar",
      "Secure Exchange Ledger",
      "Client Entity Ledger",
    ],
  },
  recruitment: {
    subject: "Recruitment email workspace — pipeline, interviews & outreach in {{productName}}",
    headline: "Staffing workflows attached to candidate and client mail",
    subhead: "Role Pipeline, Interview Desk, Bulk Outreach, and Talent Search for {{productName}}",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Recruitment agencies live in email. {{productName}} staffing tools add a <strong>Role Pipeline</strong>, <strong>Interview Desk</strong>, <strong>Bulk Outreach</strong>, and <strong>Talent Search</strong> beside the same branded mailbox you use with candidates and hiring managers.</p>
<p>Keep shortlists and conversations in one workspace instead of losing context across disconnected tools.</p>`,
    introText: `Hi {{fullName}},

{{productName}} recruitment tools include Role Pipeline, Interview Desk, Bulk Outreach, and Talent Search — connected to your agency’s branded mailbox.`,
    highlightTitles: ["Role Pipeline", "Interview Desk", "Bulk Outreach", "Talent Search"],
  },
  "b2b-services": {
    subject: "B2B services email workspace — clients, projects & proposals in {{productName}}",
    headline: "Client delivery tools for professional service firms",
    subhead: "Client Workspaces, Project Tracker, Proposal Desk, and SLA Monitor in {{productName}}",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>B2B service firms use {{productName}} to keep proposals and delivery follow-ups in one branded inbox — then unlock <strong>Client Workspaces</strong>, <strong>Project Tracker</strong>, <strong>Proposal Desk</strong>, and <strong>SLA Monitor</strong> when the practice needs structure beyond plain email.</p>`,
    introText: `Hi {{fullName}},

{{productName}} B2B professional services tools include Client Workspaces, Project Tracker, Proposal Desk, and SLA Monitor — on the same branded mailbox.`,
    highlightTitles: ["Client Workspaces", "Project Tracker", "Proposal Desk", "SLA Monitor"],
  },
  healthcare: {
    subject: "Healthcare practice email workspace tools in {{productName}}",
    headline: "Clinic communications tools beside your medical practice inbox",
    subhead: "Patient Registry, Appointment Desk, Referral Tracker, and HIPAA Audit for {{productName}}",
    introHtml: `
<p>Hi <strong>{{fullName}}</strong>,</p>
<p>Healthcare teams need reliable branded mail plus practice-aware workflows. {{productName}} healthcare tools include a <strong>Patient Registry</strong>, <strong>Appointment Desk</strong>, <strong>Referral Tracker</strong>, and <strong>HIPAA Audit</strong> support — connected to the same clinic mailbox.</p>`,
    introText: `Hi {{fullName}},

{{productName}} healthcare tools include Patient Registry, Appointment Desk, Referral Tracker, and HIPAA Audit — beside your practice’s branded mailbox.`,
    highlightTitles: ["Patient Registry", "Appointment Desk", "Referral Tracker", "HIPAA Audit"],
  },
};

function panelTemplateForSlug(slug: (typeof PANEL_EDUCATION_ADDON_SLUGS)[number]): EmailTemplateSeed {
  const entry = getCatalogEntry(slug);
  const name = entry?.name ?? slug;
  const copy = PANEL_EDU_COPY[slug];
  const featureHtml = copy.featureBlocks.map((f) => emailFeature(f.title, f.body)).join("\n");

  return {
    slug: `addon-edu-panel-${slug}`,
    name: `PMail+ education — ${name}`,
    category: "pmail-education",
    subject: copy.subject,
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
    textBody: `${copy.introText}

What you get:
${copy.benefitsText.map((b) => `• ${b}`).join("\n")}

Scenario: ${copy.useCase}

${copy.ctaLabel}: {{ctaUrl}}

{{signatureHtml}}
Unsubscribe: {{optOutUrl}}`,
    htmlBody: EDU_WRAPPER(
      `
${copy.introHtml}
${featureHtml}
<p><strong>Real-world scenario</strong></p>
<p><em>${copy.useCase}</em></p>
${copy.closingHtml}
<p>${emailBtn(PMAIL_ADDONS_URL, copy.ctaLabel)}</p>
${emailMuted(`<a href="${PMAIL_ADDONS_URL}" style="color:#0d9488;font-weight:600">Browse all {{productName}} workspace add-ons</a>`)}`,
      copy.headline,
      copy.subhead,
    ),
  };
}

function verticalTemplateForKey(
  key: "generic" | (typeof VERTICAL_KEYS)[number],
  label: string,
): EmailTemplateSeed {
  const copy = VERTICAL_EDU_COPY[key];
  const products =
    key === "generic"
      ? copy.highlightTitles
      : (() => {
          const fromCatalog = ADDON_CATALOG.filter((e) => e.vertical === key && !e.comingSoon)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .slice(0, 4)
            .map((e) => e.name);
          return fromCatalog.length > 0 ? fromCatalog : copy.highlightTitles;
        })();
  const productList = products.map((n) => `<li>${n}</li>`).join("");
  const ctaLabel =
    key === "generic" ? "Browse industry workspace add-ons" : `View ${label} workspace add-ons`;

  return {
    slug: `addon-edu-vertical-${key}`,
    name: `PMail+ education — ${label}`,
    category: "pmail-education",
    subject: copy.subject,
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
    textBody: `${copy.introText}

Featured tools:
${products.map((n) => `• ${n}`).join("\n")}

Explore: {{ctaUrl}}

{{signatureHtml}}
Unsubscribe: {{optOutUrl}}`,
    htmlBody: EDU_WRAPPER(
      `
${copy.introHtml}
<p><strong>Featured tools you can activate</strong></p>
<ul>${productList}</ul>
<p>${emailBtn(PMAIL_ADDONS_URL, ctaLabel)}</p>
${emailMuted("Same branded domain. Optional industry workspace when your practice is ready.")}`,
      copy.headline,
      copy.subhead,
    ),
  };
}

export const ADDON_EDUCATION_TEMPLATE_SEEDS: EmailTemplateSeed[] = [
  ...PANEL_EDUCATION_ADDON_SLUGS.map(panelTemplateForSlug),
  verticalTemplateForKey("generic", "Industry workspace add-ons"),
  ...VERTICAL_KEYS.map((key) => verticalTemplateForKey(key, ADDON_VERTICAL_LABELS[key])),
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
  const copy = PANEL_EDU_COPY[slug as (typeof PANEL_EDUCATION_ADDON_SLUGS)[number]];
  if (copy) return copy.useCase.replace(/\{\{productName\}\}/g, "PMail+");
  const entry = getCatalogEntry(slug);
  return entry
    ? `${entry.name} runs inside your PMail+ branded mailbox so you can use it without switching products.`
    : "This PMail+ workspace tool runs directly from your branded inbox.";
}

export function getPanelBenefitsList(slug: string): string {
  const copy = PANEL_EDU_COPY[slug as (typeof PANEL_EDUCATION_ADDON_SLUGS)[number]];
  if (copy) return copy.benefitsText.map((f) => `• ${f}`).join("\n");
  const entry = getCatalogEntry(slug);
  const features = entry?.features ?? [];
  return features.map((f) => `• ${f}`).join("\n");
}

export function getVerticalEducationDescription(stepKey: string, verticalLabel: string): string {
  const copy = VERTICAL_EDU_COPY[stepKey as keyof typeof VERTICAL_EDU_COPY];
  if (copy) {
    return copy.introText
      .replace(/Hi \{\{fullName\}\},\n\n/g, "")
      .replace(/\{\{productName\}\}/g, "PMail+");
  }
  return `PMail+ extends your branded mailbox with purpose-built workspace tools for ${verticalLabel}.`;
}

export const PMAil_EDUCATION_SIGNATURE_HTML = `<strong>${PMAil_SIGNATURE}</strong>`;
