import type { AddonVertical } from "./addon-verticals.js";

export type AddonGroup =
  | "ircc_inbox"
  | "ai_tools"
  | "client_work"
  | "communications"
  | "compliance"
  | "industry_tools"
  | "growth";

export type AddonReleasePhase = 1 | 2 | 3;

export interface AddonCatalogEntry {
  slug: string;
  name: string;
  group: AddonGroup;
  vertical: AddonVertical;
  description: string;
  features: string[];
  sortOrder: number;
  priceCents: number;
  releasePhase: AddonReleasePhase;
  comingSoon?: boolean;
}

export type AddonKind = "vertical" | "platform" | "system";

/** Phase 1.1–1.6 — $15/mo Platform marketplace bundle (see PMail-ROADMAP.md) */
export const MARKETPLACE_PLATFORM_BUNDLE_SLUGS = [
  "open-tracking",
  "file-vault-functionality",
  "multi-inbox-functionality",
  "inbox-cleanup-functionality",
  "attachment-categorize-functionality",
  "esign-from-email-functionality",
  "job-hunter-functionality",
] as const;

export const MARKETPLACE_PLATFORM_BUNDLE_SLUG_SET = new Set<string>(MARKETPLACE_PLATFORM_BUNDLE_SLUGS);

/** Legacy + Phase 1 platform add-ons available à-la-carte (not all are in the $15 bundle) */
export const PLATFORM_SPECIFIC_PAID_ADDON_SLUGS = [
  "whatsapp-functionality",
  "mail2pdf-functionality",
  "full-calendar-functionality",
  "scheduled-send",
  "auto-reply-functionality",
  "job-hunter-functionality",
  "job-apply-assist-functionality",
  ...MARKETPLACE_PLATFORM_BUNDLE_SLUGS,
] as const;

export const PLATFORM_SPECIFIC_PAID_ADDON_SET = new Set<string>(PLATFORM_SPECIFIC_PAID_ADDON_SLUGS);

export const PLATFORM_WORKSPACE_BUNDLE_SLUGS = MARKETPLACE_PLATFORM_BUNDLE_SLUGS;

export const LEGAL_PHASE_1_SLUGS = [
  "immigration-desk",
  "immigration-templates",
  "program-checklists",
  "compliance-pack",
] as const;

export const MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS = 1500;
export const JOB_HUNTER_STANDALONE_USER_PRICE_CENTS = 1000;
export const JOB_HUNTER_ADDON_SLUG = "job-hunter-functionality";
export const MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS = 3000;
export const MARKETPLACE_VERTICAL_BUNDLE_TENANT_SEAT_PRICE_CENTS = 2000;
export const MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS = 5;

export function resolveAddonKind(entry: Pick<AddonCatalogEntry, "slug" | "vertical">): AddonKind {
  if (PLATFORM_SPECIFIC_PAID_ADDON_SET.has(entry.slug)) return "platform";
  if (entry.vertical === "platform") return "system";
  return "vertical";
}

export function resolveAddonUserPriceCents(entry: Pick<AddonCatalogEntry, "slug" | "vertical" | "priceCents">): number {
  const kind = resolveAddonKind(entry);
  if (entry.slug === JOB_HUNTER_ADDON_SLUG) return JOB_HUNTER_STANDALONE_USER_PRICE_CENTS;
  if (kind === "platform") return MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS;
  if (kind === "vertical") return 3000;
  return entry.priceCents;
}

export function resolveAddonTenantSeatPriceCents(entry: Pick<AddonCatalogEntry, "slug" | "vertical" | "priceCents">): number {
  const kind = resolveAddonKind(entry);
  if (entry.slug === JOB_HUNTER_ADDON_SLUG) return JOB_HUNTER_STANDALONE_USER_PRICE_CENTS;
  if (kind === "platform") return MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS;
  if (kind === "vertical") return 2000;
  return entry.priceCents;
}

export function resolveAddonMinTenantSeats(entry: Pick<AddonCatalogEntry, "slug" | "vertical">): number {
  return resolveAddonKind(entry) === "system" ? 1 : 5;
}

export function resolveAddonIsPaid(entry: Pick<AddonCatalogEntry, "slug" | "vertical" | "priceCents">): boolean {
  return resolveAddonKind(entry) !== "system";
}

export const ADDON_GROUP_LABELS: Record<AddonGroup, string> = {
  ircc_inbox: "IRCC Inbox",
  ai_tools: "AI Tools",
  client_work: "Client Work",
  communications: "Communications",
  compliance: "Compliance",
  industry_tools: "Industry tools",
  growth: "Prohost Growth",
};

/** Phase 1 — foundation + communications + compliance */
export const PHASE_1_SLUGS = [
  "immigration-templates",
  "scheduled-send",
  "immigration-desk",
  "program-checklists",
  "compliance-pack",
  "bespoke-workspace",
  "open-tracking",
] as const;

/** Phase 2 — IRCC inbox + client portal */
export const PHASE_2_SLUGS = [
  "ircc-mail-intel",
  "case-linked-mail",
  "deadline-guard",
  "client-portal",
] as const;

/** Real estate Phase 1 — listing board, showings, quick replies, deal room */
export const REAL_ESTATE_PHASE_1_SLUGS = [
  "re-listing-board",
  "re-showing-scheduler",
  "re-quick-replies",
  "re-deal-room",
] as const;

/** Accounting Phase 1 — document intake, filing calendar, secure exchange, client entities */
export const ACCOUNTING_PHASE_1_SLUGS = [
  "ac-document-intake",
  "ac-filing-calendar",
  "ac-secure-exchange",
  "ac-client-entities",
] as const;

/** Recruitment Phase 1 — role pipeline, interview desk, bulk outreach, talent search */
export const RECRUITMENT_PHASE_1_SLUGS = [
  "rc-role-pipeline",
  "rc-interview-desk",
  "rc-bulk-outreach",
  "rc-talent-search",
] as const;

/** B2B services Phase 1 — client workspaces, project tracker, proposal desk, SLA monitor */
export const B2B_PHASE_1_SLUGS = [
  "b2b-client-workspaces",
  "b2b-project-tracker",
  "b2b-proposal-desk",
  "b2b-sla-monitor",
] as const;

/** Healthcare Phase 1 — patient registry, appointment desk, referral tracker, HIPAA audit */
export const HEALTHCARE_PHASE_1_SLUGS = [
  "hc-patient-registry",
  "hc-appointment-desk",
  "hc-referral-tracker",
  "hc-hipaa-audit",
] as const;

export function getVerticalBundleSlugs(vertical: AddonVertical): readonly string[] {
  switch (vertical) {
    case "legal":
      return LEGAL_PHASE_1_SLUGS;
    case "accounting":
      return ACCOUNTING_PHASE_1_SLUGS;
    case "real-estate":
      return REAL_ESTATE_PHASE_1_SLUGS;
    case "recruitment":
      return RECRUITMENT_PHASE_1_SLUGS;
    case "b2b-services":
      return B2B_PHASE_1_SLUGS;
    case "healthcare":
      return HEALTHCARE_PHASE_1_SLUGS;
    default:
      return [];
  }
}

export function getVerticalBundleAnchorSlug(vertical: AddonVertical): string {
  const slugs = getVerticalBundleSlugs(vertical);
  if (slugs.length === 0) throw new Error(`No marketplace vertical bundle for ${vertical}`);
  return slugs[0];
}

export function getPlatformBundleAnchorSlug(): string {
  return PLATFORM_WORKSPACE_BUNDLE_SLUGS[0];
}

/** Phase 3 — AI tools (coming soon) */
export const PHASE_3_SLUGS = [
  "ai-ircc-summarizer",
  "ai-client-update-writer",
  "ai-doc-request-writer",
  "ai-multilingual-comms",
  "ai-matter-extractor",
  "ai-inbox-copilot",
] as const;

export const ADDON_CATALOG: AddonCatalogEntry[] = [
  // ── Legal / immigration (merged with Bespoke Mail for law firms) ──
  {
    slug: "ircc-mail-intel",
    name: "IRCC Mail Intelligence",
    group: "ircc_inbox",
    vertical: "legal",
    description: "Auto-classify IRCC correspondence and surface priority action items.",
    features: ["Detect AOR, biometrics, PFL, refusal", "Priority inbox widget", "Auto-tag IRCC senders"],
    sortOrder: 10,
    priceCents: 0,
    releasePhase: 2,
  },
  {
    slug: "case-linked-mail",
    name: "Case-Linked Mail",
    group: "ircc_inbox",
    vertical: "legal",
    description: "Link email threads to client matters and search by UCI or name.",
    features: ["Matter-linked threads", "UCI search", "Client file view"],
    sortOrder: 20,
    priceCents: 0,
    releasePhase: 2,
  },
  {
    slug: "deadline-guard",
    name: "Deadline Guard",
    group: "ircc_inbox",
    vertical: "legal",
    description: "Track IRCC, court, and filing deadlines with expiry alerts.",
    features: ["Deadline extraction", "Court & IRCC dates", "Overdue dashboard"],
    sortOrder: 30,
    priceCents: 0,
    releasePhase: 2,
  },
  {
    slug: "ai-ircc-summarizer",
    name: "AI IRCC Summarizer",
    group: "ai_tools",
    vertical: "legal",
    description: "Summarize IRCC letters in plain English with extracted actions.",
    features: ["One-click summary", "Deadline extraction", "UCI detection"],
    sortOrder: 40,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "ai-client-update-writer",
    name: "AI Client Update Writer",
    group: "ai_tools",
    vertical: "legal",
    description: "Draft client-friendly status emails from IRCC correspondence.",
    features: ["Client-safe tone", "Insert into compose", "Lawyer review required"],
    sortOrder: 50,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "ai-doc-request-writer",
    name: "AI Document Request Writer",
    group: "ai_tools",
    vertical: "legal",
    description: "Generate document request emails by immigration program type.",
    features: ["Program templates", "Checklist emails", "Merge fields"],
    sortOrder: 60,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "ai-multilingual-comms",
    name: "AI Multilingual Comms",
    group: "ai_tools",
    vertical: "legal",
    description: "Translate outbound client emails into common client languages.",
    features: ["French, Spanish, Hindi", "Compose integration", "Review before send"],
    sortOrder: 70,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "ai-matter-extractor",
    name: "AI Matter Extractor",
    group: "ai_tools",
    vertical: "legal",
    description: "Extract UCI, names, and program hints from email threads.",
    features: ["CRM pre-fill", "Thread scanning", "Confidence hints"],
    sortOrder: 80,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "ai-inbox-copilot",
    name: "AI Inbox Priority Copilot",
    group: "ai_tools",
    vertical: "legal",
    description: "Daily brief of emails that need action today.",
    features: ["Morning brief", "Priority ranking", "Action reasons"],
    sortOrder: 90,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "immigration-desk",
    name: "Immigration Desk / Matter Registry",
    group: "client_work",
    vertical: "legal",
    description: "Client and matter CRM for immigration counsel and general legal practice.",
    features: ["UCI & matter tracking", "Program pipeline", "Matter status"],
    sortOrder: 100,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "client-portal",
    name: "Client Portal",
    group: "client_work",
    vertical: "legal",
    description: "Secure document uploads and requests per matter.",
    features: ["Branded portal", "Upload vault", "PIPEDA-friendly"],
    sortOrder: 110,
    priceCents: 0,
    releasePhase: 2,
  },
  {
    slug: "program-checklists",
    name: "Program Checklists",
    group: "client_work",
    vertical: "legal",
    description: "IMM forms and supporting document checklists per program.",
    features: ["IMM form lists", "Expiry flags", "Collection status"],
    sortOrder: 120,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "immigration-templates",
    name: "Legal & Immigration Template Pack",
    group: "communications",
    vertical: "legal",
    description: "Canada-specific and general legal email templates with merge fields.",
    features: ["Client updates", "Document requests", "Consent follow-ups"],
    sortOrder: 130,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "compliance-pack",
    name: "Compliance & Audit Pack",
    group: "compliance",
    vertical: "legal",
    description: "Audit trail and consent tracking for regulated legal practice.",
    features: ["Activity log", "7-year retention export", "IMM5476 metadata"],
    sortOrder: 150,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── Real estate ──
  {
    slug: "re-listing-board",
    name: "Listing Board",
    group: "industry_tools",
    vertical: "real-estate",
    description: "Active property listing tracking linked to buyer and seller threads.",
    features: ["MLS-linked records", "Status pipeline", "Agent assignment"],
    sortOrder: 210,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "re-showing-scheduler",
    name: "Showing Scheduler",
    group: "industry_tools",
    vertical: "real-estate",
    description: "Calendar-linked tour scheduling from email inquiries.",
    features: ["Showing requests", "Calendar sync", "Buyer reminders"],
    sortOrder: 220,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "re-quick-replies",
    name: "Quick Replies",
    group: "industry_tools",
    vertical: "real-estate",
    description: "Showing and offer response templates for high-volume agents.",
    features: ["Showing confirmations", "Offer templates", "MLS refresh notices"],
    sortOrder: 230,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "re-deal-room",
    name: "Deal Room",
    group: "industry_tools",
    vertical: "real-estate",
    description: "Shared team visibility on active deals and offer threads.",
    features: ["Deal pipeline", "Offer attachments", "Team notes"],
    sortOrder: 240,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── Accounting ──
  {
    slug: "ac-document-intake",
    name: "Document Request Vault",
    group: "industry_tools",
    vertical: "accounting",
    description: "Categorized client source-document requests with fiscal periods, reminders, and vault statuses.",
    features: ["Document categories", "Vault review statuses", "Fiscal period reminders"],
    sortOrder: 310,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "ac-filing-calendar",
    name: "Tax Filing Calendar",
    group: "industry_tools",
    vertical: "accounting",
    description: "Track filing types, tax periods, due dates, reminders, and filed/extended status by entity.",
    features: ["Filing type calendar", "Tax period tracking", "Reminder and filed statuses"],
    sortOrder: 320,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "ac-secure-exchange",
    name: "Secure Exchange Ledger",
    group: "industry_tools",
    vertical: "accounting",
    description: "Audit every client document exchange, review action, and secure portal event.",
    features: ["Exchange audit trail", "Request-linked records", "Document review actions"],
    sortOrder: 330,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "ac-client-entities",
    name: "Client Entity Ledger",
    group: "industry_tools",
    vertical: "accounting",
    description: "Entity hierarchy, tax identifiers, fiscal year-ends, and engagement metadata for accounting firms.",
    features: ["Parent-child entities", "Tax identifiers", "Engagement and filing roll-up"],
    sortOrder: 340,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── Recruitment ──
  {
    slug: "rc-role-pipeline",
    name: "Role Pipeline",
    group: "industry_tools",
    vertical: "recruitment",
    description: "Open requisition tracking from intake to placement.",
    features: ["Req stages", "Client linkage", "Fill rate metrics"],
    sortOrder: 410,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "rc-interview-desk",
    name: "Interview Desk",
    group: "industry_tools",
    vertical: "recruitment",
    description: "Scheduled panel and phone screen coordination.",
    features: ["Interview slots", "Scorecard links", "Candidate threads"],
    sortOrder: 420,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "rc-bulk-outreach",
    name: "Bulk Outreach",
    group: "industry_tools",
    vertical: "recruitment",
    description: "Queued candidate campaign sends with tracking.",
    features: ["Campaign queue", "Open tracking", "Reply routing"],
    sortOrder: 430,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "rc-talent-search",
    name: "Talent Search",
    group: "industry_tools",
    vertical: "recruitment",
    description: "Cross-role and client thread search for recruiters.",
    features: ["Unified search", "Tag filters", "Saved searches"],
    sortOrder: 440,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── B2B services ──
  {
    slug: "b2b-client-workspaces",
    name: "Client Workspaces",
    group: "industry_tools",
    vertical: "b2b-services",
    description: "Isolated branded mail domains per client account.",
    features: ["Per-client branding", "Domain routing", "Account isolation"],
    sortOrder: 510,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "b2b-project-tracker",
    name: "Project Tracker",
    group: "industry_tools",
    vertical: "b2b-services",
    description: "Milestone and phase status across client projects.",
    features: ["Milestone board", "Deliverable links", "Status alerts"],
    sortOrder: 520,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "b2b-proposal-desk",
    name: "Proposal Desk",
    group: "industry_tools",
    vertical: "b2b-services",
    description: "Versioned SOW revisions and proposal threads.",
    features: ["SOW versions", "Approval trail", "Attachment history"],
    sortOrder: 530,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "b2b-sla-monitor",
    name: "SLA Monitor",
    group: "industry_tools",
    vertical: "b2b-services",
    description: "Escalation and countdown alerts on client SLAs.",
    features: ["SLA timers", "Escalation rules", "Ops dashboard"],
    sortOrder: 540,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── Healthcare ──
  {
    slug: "hc-patient-registry",
    name: "Patient Registry",
    group: "industry_tools",
    vertical: "healthcare",
    description: "Active chart tracking with referral and auth linkage.",
    features: ["Chart records", "Referral status", "Care pipeline"],
    sortOrder: 610,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "hc-appointment-desk",
    name: "Appointment Desk",
    group: "industry_tools",
    vertical: "healthcare",
    description: "Daily schedule and no-show alerts from patient mail.",
    features: ["Daily schedule", "No-show alerts", "Callback queue"],
    sortOrder: 620,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "hc-referral-tracker",
    name: "Referral Tracker",
    group: "industry_tools",
    vertical: "healthcare",
    description: "Inbound and outbound referral status across threads.",
    features: ["Referral pipeline", "Specialist linkage", "Status updates"],
    sortOrder: 630,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "hc-hipaa-audit",
    name: "HIPAA Audit",
    group: "industry_tools",
    vertical: "healthcare",
    description: "Access log and minimum-necessary role controls.",
    features: ["Access audit", "Role scoping", "Export log"],
    sortOrder: 640,
    priceCents: 0,
    releasePhase: 1,
  },
  // ── Platform-wide ──
  {
    slug: "scheduled-send",
    name: "Scheduled Send",
    group: "communications",
    vertical: "platform",
    description: "Queue messages to send at a later date and time.",
    features: ["Schedule compose", "Send later queue", "Timezone aware"],
    sortOrder: 900,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "bespoke-workspace",
    name: "Bespoke Workspace",
    group: "client_work",
    vertical: "platform",
    description: "Industry CRM pipeline, reminders, and operational tool panels.",
    features: ["CRM pipeline stages", "Follow-up reminders", "Industry tool backends"],
    sortOrder: 910,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "open-tracking",
    name: "Open Tracking",
    group: "communications",
    vertical: "platform",
    description: "Know when recipients open sent mail and click tracked links.",
    features: [
      "Tracking pixel on send",
      "Link click wrapping and redirect",
      "Open and click counts with timestamps",
      "Sent mail tracking dashboard",
    ],
    sortOrder: 920,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "whatsapp-functionality",
    name: "WhatsApp Functionality",
    group: "communications",
    vertical: "platform",
    description: "Send workspace chat and compose messages to WhatsApp-enabled phone numbers.",
    features: ["WhatsApp workspace chat", "Phone contact sync", "Compose-to-WhatsApp handoff"],
    sortOrder: 930,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "mail2pdf-functionality",
    name: "Mail 2 PDF",
    group: "communications",
    vertical: "platform",
    description: "Convert selected email trails into PDF exports from the mailbox detail view.",
    features: ["Email trail PDF export", "Mailbox detail action", "Audit-ready attachment naming"],
    sortOrder: 940,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "full-calendar-functionality",
    name: "Full Calendar Functionality",
    group: "communications",
    vertical: "platform",
    description: "Unlock full month/week calendar controls and quick event creation.",
    features: ["Month and week views", "Quick add event", "Workspace scheduling controls"],
    sortOrder: 945,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "auto-reply-functionality",
    name: "Auto Reply",
    group: "communications",
    vertical: "platform",
    description: "Automated inbox acknowledgments with industry templates and a 14-day complimentary activation.",
    features: [
      "Automatic replies to unread inbox mail",
      "Industry template library",
      "Custom template editor",
      "14-day complimentary access for new users",
    ],
    sortOrder: 946,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "file-vault-functionality",
    name: "File Vault",
    group: "communications",
    vertical: "platform",
    description: "Send large attachments via secure download links and manage a personal file vault.",
    features: [
      "Upload files up to 100 MB",
      "Tokenized secure download links in mail",
      "Vault panel with expiry and download counts",
      "Large file handoff from compose",
    ],
    sortOrder: 947,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "multi-inbox-functionality",
    name: "Multiple Inboxes",
    group: "communications",
    vertical: "platform",
    description: "Connect additional mailboxes and switch between them in PMail+.",
    features: [
      "Connect up to 5 mail accounts",
      "Inbox switcher in the mail workspace",
      "Per-account IMAP/SMTP credentials",
      "Send and read from the active mailbox",
    ],
    sortOrder: 948,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "inbox-cleanup-functionality",
    name: "Inbox Cleanup & Unsubscribe",
    group: "communications",
    vertical: "platform",
    description: "Bulk inbox cleanup by sender and one-click List-Unsubscribe from marketing mail.",
    features: [
      "Sender volume dashboard for inbox cleanup",
      "Bulk delete, archive, or mark-read by sender",
      "List-Unsubscribe detection on messages",
      "One-click unsubscribe with audit log",
    ],
    sortOrder: 949,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "attachment-categorize-functionality",
    name: "Attachment Auto-Categorize",
    group: "communications",
    vertical: "platform",
    description: "Automatically classify mailbox attachments and organize them for cleanup and compose handoff.",
    features: [
      "Scan inbox attachments by MIME type and filename",
      "Business categories: invoices, receipts, tax forms, contracts",
      "Category dashboard with manual overrides",
      "Export categorized files to vault for compose",
    ],
    sortOrder: 950,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "esign-from-email-functionality",
    name: "E-Sign from Email",
    group: "communications",
    vertical: "platform",
    description: "Send PDF and Word attachments for e-signature via Dropbox Sign directly from your inbox.",
    features: [
      "Send mailbox attachments or uploads for e-signature",
      "Dropbox Sign integration with status refresh",
      "Secure tokenized document download links",
      "Compose handoff with signing link for the signer",
    ],
    sortOrder: 951,
    priceCents: 1500,
    releasePhase: 1,
  },
  {
    slug: "email-sla-tracker-functionality",
    name: "Email SLA Tracker",
    group: "communications",
    vertical: "platform",
    description: "Track inbound thread response times and get breach alerts before clients wait too long.",
    features: [
      "Inbound thread SLA timers from first message received",
      "At-risk and breach alerts with acknowledgement",
      "Scan inbox to sync open threads and deadlines",
      "Compose reply handoff and secure CSV report export",
    ],
    sortOrder: 960,
    priceCents: 1500,
    releasePhase: 2,
  },
  {
    slug: "job-hunter-functionality",
    name: "Job Hunter",
    group: "communications",
    vertical: "platform",
    description:
      "Privacy-first career workspace — CV Hub, scanner, apply assist hooks, and mail-based career intelligence with Tier B consent.",
    features: [
      "30-day full-access trial — starts when Career unlocks or from Marketplace",
      "CV Hub, builder, scanner, application tracking, and interview prep",
      "Tier B consent with per-inbox scan controls",
      "Included in the Platform workspace bundle · also available standalone",
    ],
    sortOrder: 965,
    priceCents: 1000,
    releasePhase: 1,
    comingSoon: false,
  },
  {
    slug: "job-apply-assist-functionality",
    name: "Apply Assist",
    group: "communications",
    vertical: "platform",
    description:
      "Prefill job applications from your Career dashboard — you review and confirm every send. Credits per completed assist.",
    features: [
      "Email-apply prefill with full mail preview before you send",
      "Attach a Career CV from Documents on confirm",
      "$5 per 100 credits — 1 credit per completed assist",
      "LinkedIn/Indeed assist-only checklists — no unattended submission",
    ],
    sortOrder: 966,
    priceCents: 500,
    releasePhase: 1,
    comingSoon: false,
  },
  {
    slug: "prohost-growth",
    name: "Prohost Growth",
    group: "growth",
    vertical: "platform",
    description: "AI Marketing OS — wizard, content studio, CRM pipeline, chatbot, analytics, and automations.",
    features: [
      "6-step onboarding wizard",
      "Day-one content bundle",
      "Lead capture & pipeline CRM",
      "Qualification chatbot",
      "Analytics command center",
      "Nurture automations",
    ],
    sortOrder: 950,
    priceCents: 4900,
    releasePhase: 1,
  },
  {
    slug: "prohost-growth-pro",
    name: "Prohost Growth Pro",
    group: "growth",
    vertical: "platform",
    description: "Pro tier — analytics, higher lead limits, more automations and published pages.",
    features: ["Everything in Starter", "Analytics command center", "500 leads/month", "Optimization loop"],
    sortOrder: 951,
    priceCents: 14900,
    releasePhase: 1,
  },
  {
    slug: "prohost-growth-agency",
    name: "Prohost Growth Agency",
    group: "growth",
    vertical: "platform",
    description: "Agency tier — team workspaces, high volume leads, and maximum publish capacity.",
    features: ["Everything in Pro", "5,000 leads/month", "100 published pages", "Priority limits"],
    sortOrder: 952,
    priceCents: 39900,
    releasePhase: 1,
  },
];

export function getCatalogEntry(slug: string): AddonCatalogEntry | undefined {
  return ADDON_CATALOG.find((a) => a.slug === slug);
}

export const TRIAL_DAYS = 7;

/** First-time user welcome trial for panel workspace tools (days). */
export const PANEL_WORKSPACE_WELCOME_TRIAL_DAYS = 7;

/**
 * All Panel workspace add-ons included in the automatic 7-day welcome trial (excludes Job Hunter —
 * career tools unlock separately via inbox signals or marketplace).
 */
export const PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS = [
  "bespoke-workspace",
  ...MARKETPLACE_PLATFORM_BUNDLE_SLUGS.filter((slug) => slug !== JOB_HUNTER_ADDON_SLUG),
  "whatsapp-functionality",
  "mail2pdf-functionality",
  "full-calendar-functionality",
  "scheduled-send",
  "auto-reply-functionality",
  "email-sla-tracker-functionality",
] as const;

export const PANEL_WORKSPACE_WELCOME_TRIAL_SLUG_SET = new Set<string>(PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS);

/** Job Hunter marketplace + career unlock trial length (days). */
export const JOB_HUNTER_TRIAL_DAYS = 30;
