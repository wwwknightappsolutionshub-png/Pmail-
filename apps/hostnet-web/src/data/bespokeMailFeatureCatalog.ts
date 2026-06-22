export type BespokeMailFeatureGroup = {
  title: string;
  items: string[];
};

export const CORE_MAIL_INBOX: BespokeMailFeatureGroup = {
  title: "Mail & inbox",
  items: [
    "Workspace hub with Outlook-style folders: New Mail, Inbox, Outbox, Drafts, Scheduled, Trash, Documents",
    "Industry inbox filters that narrow grouped threads by tag",
    "Auto-group messages by sender email ID with collapsible sender groups",
    "Unread counts per sender group; mark as read on open",
    "Mark as unread and delete icon actions on message read view",
    "Thread insights panel, tags, and multi-attachment support",
    "Paginated Documents folder across inbox and outbound attachments",
  ],
};

export const CORE_OUTBOUND: BespokeMailFeatureGroup = {
  title: "Outbound mail",
  items: [
    "Gmail-style floating compose with CC/BCC, schedule send, and draft save",
    "Outbox, Drafts, and Scheduled folders with edit, send, restore, and trash",
    "Recipient open tracking on sent mail with first/last open timestamps",
    "Simulate recipient open for demo read-receipt workflows",
  ],
};

export const CORE_CONTACTS_CRM: BespokeMailFeatureGroup = {
  title: "Contacts & CRM",
  items: [
    "Searchable contacts directory (name, email, phone, organization, notes)",
    "Add contacts and view per-sender email history",
    "Jump from contact to grouped inbox threads",
    "Pipeline CRM with configurable stages and notes",
    "Reminder system — schedule, filter pending/done, mark complete",
    "Reminders linked to contacts across email and in-app channels",
  ],
};

export const CORE_BRAND_SETTINGS: BespokeMailFeatureGroup = {
  title: "Brand settings",
  items: [
    "Custom outbound sender display name",
    "Two sample email signatures per industry — edit or create new",
    "Signature avatar upload and preview",
    "Auto-reply templates with plan-gated upgrade path",
    "Reply identity preview with active signature on compose",
    "Upgrade CTA to custom pricing from live demo",
  ],
};

export const CORE_WORKSPACE: BespokeMailFeatureGroup = {
  title: "Workspace navigation",
  items: [
    "Home Workspace tab for mail operations",
    "Contacts, CRM, and Reminders dedicated workspaces",
    "Brand Settings tab for identity and automation",
    "Industry tools toolbar with contextual operational panels",
    "Live demo badge with branded tenant header",
  ],
};

function composeItems(plan: string, industryLabel: string): BespokeMailFeatureGroup {
  return {
    title: "Brand settings",
    items: [
      "Custom outbound sender display name",
      `Two ${industryLabel} email signatures — edit or create new`,
      `Auto-reply gated — requires ${plan} plan`,
      "Auto-reply template preview and edit before upgrade",
      "PHI/PII-aware reply identity preview where applicable",
    ],
  };
}

export const INDUSTRY_FEATURES: Record<
  string,
  { tools: BespokeMailFeatureGroup; mailExtras: string[] }
> = {
  legal: {
    mailExtras: [
      "Folders: All matters, Court deadlines, Client intake, Privileged",
      "Matter-based tagging and privileged attachment handling",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Matter registry — active case tracking",
        "Deadline guard — court and filing dates",
        "Audit trail — 7-year retention and export log",
        "Client portal — secure document requests",
      ],
    },
  },
  "real-estate": {
    mailExtras: [
      "Folders: All deals, Listings, Showings, Offers",
      "Listing and offer threads with attachment support",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Listing board — active property tracking",
        "Showing scheduler — calendar-linked tours",
        "Quick replies — showing and offer templates",
        "Deal room — shared team visibility on deals",
      ],
    },
  },
  accounting: {
    mailExtras: [
      "Folders: All clients, Document requests, Filing deadlines, Secure drop",
      "Secure file exchange on client entity threads",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Document intake — open request tracking",
        "Filing calendar — deadline and peak season view",
        "Secure exchange — encrypted client threads",
        "Client entities — multi-entity record management",
      ],
    },
  },
  recruitment: {
    mailExtras: [
      "Folders: All roles, Candidates, Interviews, Offers",
      "Interview and offer threads with attachments",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Role pipeline — open requisition tracking",
        "Interview desk — scheduled panel and phone screens",
        "Bulk outreach — queued candidate campaigns",
        "Talent search — cross-role and client thread search",
      ],
    },
  },
  "b2b-services": {
    mailExtras: [
      "Folders: All clients, Projects, SOW threads, SLA alerts",
      "Proposal and deliverable threads with attachments",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Client workspaces — isolated branded domains",
        "Project tracker — milestone and phase status",
        "Proposal desk — versioned SOW revisions",
        "SLA monitor — escalation and countdown alerts",
      ],
    },
  },
  healthcare: {
    mailExtras: [
      "Folders: All patients, Appointments, Referrals, Prior auth",
      "Clinical summaries and prior auth on threads",
    ],
    tools: {
      title: "Industry tools",
      items: [
        "Patient registry — active chart tracking",
        "Appointment desk — daily schedule and no-show alerts",
        "Referral tracker — inbound and outbound referral status",
        "HIPAA audit — access log and minimum-necessary roles",
      ],
    },
  },
};

export function buildUseCaseFeatureGroups(
  useCaseId: string,
  plan: string,
  industryLabel: string,
  crmExtras: string[],
): BespokeMailFeatureGroup[] {
  const industry = INDUSTRY_FEATURES[useCaseId] ?? INDUSTRY_FEATURES.legal;
  return [
    {
      title: CORE_MAIL_INBOX.title,
      items: [...industry.mailExtras, ...CORE_MAIL_INBOX.items],
    },
    CORE_OUTBOUND,
    industry.tools,
    {
      title: CORE_CONTACTS_CRM.title,
      items: [...CORE_CONTACTS_CRM.items, ...crmExtras],
    },
    CORE_WORKSPACE,
    composeItems(plan, industryLabel),
  ];
}
