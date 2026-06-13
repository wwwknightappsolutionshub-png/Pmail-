export type AddonGroup = "ircc_inbox" | "ai_tools" | "client_work" | "communications" | "compliance";

export type AddonReleasePhase = 1 | 2 | 3;

export interface AddonCatalogEntry {
  slug: string;
  name: string;
  group: AddonGroup;
  description: string;
  features: string[];
  sortOrder: number;
  priceCents: number;
  releasePhase: AddonReleasePhase;
  comingSoon?: boolean;
}

export const ADDON_GROUP_LABELS: Record<AddonGroup, string> = {
  ircc_inbox: "IRCC Inbox",
  ai_tools: "AI Tools",
  client_work: "Client Work",
  communications: "Communications",
  compliance: "Compliance",
};

/** Phase 1 — foundation + communications + compliance */
export const PHASE_1_SLUGS = [
  "immigration-templates",
  "scheduled-send",
  "immigration-desk",
  "program-checklists",
  "compliance-pack",
] as const;

/** Phase 2 — IRCC inbox + client portal */
export const PHASE_2_SLUGS = [
  "ircc-mail-intel",
  "case-linked-mail",
  "deadline-guard",
  "client-portal",
] as const;

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
  {
    slug: "ircc-mail-intel",
    name: "IRCC Mail Intelligence",
    group: "ircc_inbox",
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
    description: "Track IRCC deadlines and document expiry dates.",
    features: ["Deadline extraction", "Expiry alerts", "Overdue dashboard"],
    sortOrder: 30,
    priceCents: 0,
    releasePhase: 2,
  },
  {
    slug: "ai-ircc-summarizer",
    name: "AI IRCC Summarizer",
    group: "ai_tools",
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
    description: "Daily brief of emails that need action today.",
    features: ["Morning brief", "Priority ranking", "Action reasons"],
    sortOrder: 90,
    priceCents: 0,
    releasePhase: 3,
    comingSoon: true,
  },
  {
    slug: "immigration-desk",
    name: "Immigration Desk",
    group: "client_work",
    description: "Client and matter CRM built for Canadian immigration practice.",
    features: ["UCI tracking", "Program pipeline", "Matter status"],
    sortOrder: 100,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "client-portal",
    name: "Client Portal",
    group: "client_work",
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
    description: "IMM forms and supporting document checklists per program.",
    features: ["IMM form lists", "Expiry flags", "Collection status"],
    sortOrder: 120,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "immigration-templates",
    name: "Immigration Template Pack",
    group: "communications",
    description: "Canada-specific email templates with merge fields.",
    features: ["Client updates", "Document requests", "Consent follow-ups"],
    sortOrder: 130,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "scheduled-send",
    name: "Scheduled Send",
    group: "communications",
    description: "Queue messages to send at a later date and time.",
    features: ["Schedule compose", "Send later queue", "Timezone aware"],
    sortOrder: 140,
    priceCents: 0,
    releasePhase: 1,
  },
  {
    slug: "compliance-pack",
    name: "Compliance Pack",
    group: "compliance",
    description: "Audit trail and consent tracking for regulated practice.",
    features: ["Activity log", "IMM5476 metadata", "Retention policy"],
    sortOrder: 150,
    priceCents: 0,
    releasePhase: 1,
  },
];

export function getCatalogEntry(slug: string): AddonCatalogEntry | undefined {
  return ADDON_CATALOG.find((a) => a.slug === slug);
}

export const TRIAL_DAYS = 7;
