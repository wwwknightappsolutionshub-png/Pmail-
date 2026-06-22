import {
  ACCOUNTING_CRM,
  ACCOUNTING_REMINDERS,
  B2B_CRM,
  B2B_REMINDERS,
  CRM_LABELS,
  CRM_STAGE_OPTIONS,
  HEALTHCARE_CRM,
  HEALTHCARE_REMINDERS,
  LEGAL_CRM,
  LEGAL_REMINDERS,
  REAL_ESTATE_CRM,
  REAL_ESTATE_REMINDERS,
  RECRUITMENT_CRM,
  RECRUITMENT_REMINDERS,
} from "./bespokeMailCrmReminders";

export type DemoMessage = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  tags: string[];
  unread?: boolean;
  attachment?: string;
  attachments?: string[];
  contactId?: string;
};

export type IndustryToolLane = string;

export type IndustryDeckHeader = {
  label: string;
  subtitle: string;
};

export const INDUSTRY_DECK_HEADERS: Record<string, IndustryDeckHeader> = {
  legal: { label: "Practice operations", subtitle: "Matter workflow pathway" },
  healthcare: { label: "Care operations", subtitle: "Clinical workflow pathway" },
  accounting: { label: "Firm operations", subtitle: "Client accounting pathway" },
  "real-estate": { label: "Listing operations", subtitle: "Property transaction pathway" },
  recruitment: { label: "Talent operations", subtitle: "Hiring workflow pathway" },
  "b2b-services": { label: "Account operations", subtitle: "Client delivery pathway" },
};

export type DemoToolItem = {
  id: string;
  label: string;
  hint: string;
  stationCode?: string;
  metric?: string;
  metricDetail?: string;
  lane?: IndustryToolLane;
};

/** @deprecated Use IndustryToolLane */
export type HealthcareToolLane = IndustryToolLane;

export type DemoInsight = {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "accent";
};

export type DemoCrmContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  stage: string;
  notes: string;
  lastActivity: string;
};

export type DemoReminder = {
  id: string;
  title: string;
  dueAt: string;
  contactId?: string;
  status: "pending" | "done";
  channel: "email" | "in-app";
};

export type BespokeMailDemoConfig = {
  useCaseId: string;
  brandName: string;
  workspaceLabel: string;
  userLabel: string;
  crmLabel: string;
  folders: string[];
  tools: DemoToolItem[];
  messages: DemoMessage[];
  crmContacts: DemoCrmContact[];
  reminders: DemoReminder[];
  crmStageOptions: string[];
  defaultMessageId: string;
  defaultToolId: string;
  defaultContactId: string;
  insights: DemoInsight[];
  toolPanels: Record<string, { title: string; lines: string[] }>;
};

export const BESPOKE_MAIL_DEMOS: Record<string, BespokeMailDemoConfig> = {
  legal: {
    useCaseId: "legal",
    brandName: "Hartwell & Partners",
    workspaceLabel: "Legal practice mail",
    userLabel: "Partner inbox",
    crmLabel: CRM_LABELS.legal,
    crmContacts: LEGAL_CRM,
    reminders: LEGAL_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS.legal,
    defaultContactId: "legal-c1",
    folders: ["All matters", "Court deadlines", "Client intake", "Privileged"],
    tools: [
      { id: "matters", label: "Matter registry", hint: "14 active matters", stationCode: "01", metric: "14", metricDetail: "Active matters", lane: "registry" },
      { id: "deadlines", label: "Deadline guard", hint: "3 due this week", stationCode: "02", metric: "3", metricDetail: "Due this week", lane: "deadlines" },
      { id: "compliance", label: "Audit trail", hint: "Full retention log", stationCode: "03", metric: "Full", metricDetail: "Retention log", lane: "compliance" },
      { id: "clients", label: "Client portal", hint: "Secure doc requests", stationCode: "04", metric: "Secure", metricDetail: "Doc requests", lane: "clients" },
    ],
    defaultToolId: "matters",
    defaultMessageId: "legal-1",
    insights: [
      { label: "Matter", value: "#2841 — Chen v. Metro", tone: "accent" },
      { label: "Retention", value: "7-year policy", tone: "ok" },
      { label: "Next deadline", value: "Filing — Mar 18", tone: "warn" },
    ],
    messages: [
      {
        id: "legal-1",
        from: "Clerk of Court <filings@courts.gov>",
        subject: "Hearing date confirmed — Matter #2841",
        preview: "The court has scheduled the preliminary hearing for March 18…",
        body: "The court has scheduled the preliminary hearing for March 18 at 09:30. All parties must file updated disclosures no later than March 12. This thread is linked to Matter #2841 and logged to the firm audit trail.",
        time: "9:14 AM",
        tags: ["Matter #2841", "Court", "Deadline"],
        unread: true,
        attachment: "hearing-notice.pdf",
        attachments: ["matter-2841-index.pdf"],
        contactId: "legal-c3",
      },
      {
        id: "legal-2",
        from: "R. Chen <r.chen@clientmail.com>",
        subject: "Signed retainer and ID documents",
        preview: "Please find the executed retainer agreement and passport copy…",
        body: "Please find the executed retainer agreement and passport copy attached. Let me know if you need anything else before we proceed with the filing package.",
        time: "Yesterday",
        tags: ["Client intake", "Privileged"],
        attachment: "retainer-signed.pdf",
        attachments: ["passport-copy.pdf"],
        contactId: "legal-c1",
      },
      {
        id: "legal-3",
        from: "Associate Desk <desk@hartwell.law>",
        subject: "Contract markup ready for partner review",
        preview: "Redlines on the vendor MSA are complete. Compliance flags…",
        body: "Redlines on the vendor MSA are complete. Compliance flags two clauses for partner review. Matter thread updated and associate access restricted to litigation team roles.",
        time: "Mon",
        tags: ["MSA review", "Internal"],
        contactId: "legal-c2",
      },
      {
        id: "legal-4",
        from: "R. Chen <r.chen@clientmail.com>",
        subject: "Question about disclosure timeline",
        preview: "Can you confirm if we need updated financials before March 12…",
        body: "Can you confirm if we need updated financials before March 12? I can upload through the client portal tonight if that helps.",
        time: "2 days ago",
        tags: ["Matter #2841", "Client"],
        contactId: "legal-c1",
      },
      {
        id: "legal-5",
        from: "Clerk of Court <filings@courts.gov>",
        subject: "Filing receipt — disclosure packet",
        preview: "Electronic filing receipt attached for your records…",
        body: "Electronic filing receipt attached for your records. Please retain for matter #2841 compliance log.",
        time: "Last week",
        tags: ["Court", "Filed"],
        contactId: "legal-c3",
      },
    ],
    toolPanels: {
      matters: {
        title: "Matter registry",
        lines: [
          "Matter #2841 — Chen v. Metro — Litigation",
          "Matter #2810 — Apex NDA — Corporate",
          "All messages auto-tagged to matter threads",
          "Partner / associate role scopes enforced",
        ],
      },
      deadlines: {
        title: "Deadline guard",
        lines: [
          "Mar 18 — Preliminary hearing (Court)",
          "Mar 12 — Disclosure filing due",
          "Calendar sync and email reminders enabled",
        ],
      },
      compliance: {
        title: "Audit trail",
        lines: [
          "Every view, forward, and export logged",
          "7-year retention policy applied",
          "Export ready for compliance review",
        ],
      },
      clients: {
        title: "Client portal",
        lines: [
          "Secure upload link sent to R. Chen",
          "Document request template applied",
          "Portal activity mirrored in inbox thread",
        ],
      },
    },
  },

  "real-estate": {
    useCaseId: "real-estate",
    brandName: "Northline Realty",
    workspaceLabel: "Agent operations mail",
    userLabel: "Agent inbox",
    crmLabel: CRM_LABELS["real-estate"],
    crmContacts: REAL_ESTATE_CRM,
    reminders: REAL_ESTATE_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS["real-estate"],
    defaultContactId: "re-c1",
    folders: ["All deals", "Listings", "Showings", "Offers"],
    tools: [
      { id: "listings", label: "Listing board", hint: "6 active listings", stationCode: "01", metric: "6", metricDetail: "Active listings", lane: "listings" },
      { id: "showings", label: "Showing scheduler", hint: "4 this week", stationCode: "02", metric: "4", metricDetail: "This week", lane: "showings" },
      { id: "templates", label: "Quick replies", hint: "12 templates", stationCode: "03", metric: "12", metricDetail: "Templates", lane: "templates" },
      { id: "team", label: "Deal room", hint: "Shared visibility", stationCode: "04", metric: "Live", metricDetail: "Deal room", lane: "deals" },
    ],
    defaultToolId: "listings",
    defaultMessageId: "re-1",
    insights: [
      { label: "Property", value: "42 Oak Lane", tone: "accent" },
      { label: "Stage", value: "Offer review", tone: "warn" },
      { label: "Team", value: "3 agents watching", tone: "ok" },
    ],
    messages: [
      {
        id: "re-1",
        from: "MLS Alerts <alerts@mls.local>",
        subject: "New offer received — 42 Oak Lane",
        preview: "Buyer submitted an offer at $518,000 with financing contingency…",
        body: "Buyer submitted an offer at $518,000 with financing contingency. Disclosure package attached. Showing history and buyer follow-ups are threaded to this listing.",
        time: "8:02 AM",
        tags: ["42 Oak Lane", "Offer", "Hot"],
        unread: true,
        attachment: "offer-summary.pdf",
        attachments: ["disclosure-package.pdf"],
        contactId: "re-c1",
      },
      {
        id: "re-2",
        from: "Jordan Lee <j.lee@buyermail.com>",
        subject: "Confirming tomorrow's showing at 4pm",
        preview: "We can make the 4pm slot. Please confirm lockbox code…",
        body: "We can make the 4pm slot. Please confirm lockbox code and parking instructions. Mobile quick-reply template inserted for showing confirmations.",
        time: "Yesterday",
        tags: ["Showing", "Buyer lead"],
        contactId: "re-c1",
      },
      {
        id: "re-3",
        from: "Listing Desk <desk@northline.realty>",
        subject: "Price adjustment published for 18 River Court",
        preview: "MLS updated to $425,000. Follow-up sequence queued…",
        body: "MLS updated to $425,000. Follow-up sequence queued for interested buyers. Team deal room notified.",
        time: "Sun",
        tags: ["18 River Court", "Listing"],
        contactId: "re-c2",
      },
      {
        id: "re-4",
        from: "Jordan Lee <j.lee@buyermail.com>",
        subject: "Inspection questions for 42 Oak Lane",
        preview: "We reviewed the inspection report and have two follow-up items…",
        body: "We reviewed the inspection report and have two follow-up items before we finalize the offer response.",
        time: "3 days ago",
        tags: ["42 Oak Lane", "Buyer"],
        contactId: "re-c1",
      },
      {
        id: "re-5",
        from: "Jordan Lee <j.lee@buyermail.com>",
        subject: "Mortgage pre-approval updated",
        preview: "Lender sent revised pre-approval letter attached…",
        body: "Lender sent revised pre-approval letter attached. Please add to the offer package for 42 Oak Lane.",
        time: "Last week",
        tags: ["Offer", "Buyer"],
        contactId: "re-c1",
        attachment: "pre-approval.pdf",
      },
    ],
    toolPanels: {
      listings: {
        title: "Listing board",
        lines: [
          "42 Oak Lane — Offer review — 3 showings",
          "18 River Court — Active — price reduced",
          "Listing alerts routed to agent mobile inbox",
        ],
      },
      showings: {
        title: "Showing scheduler",
        lines: [
          "Tomorrow 4:00 PM — 42 Oak Lane — Jordan Lee",
          "Thu 11:30 AM — 9 Maple Dr — walk-through",
          "Calendar invites sent from mail thread",
        ],
      },
      templates: {
        title: "Quick replies",
        lines: [
          "Showing confirmation — applied",
          "Offer follow-up — queued",
          "Thank-you after closing — draft ready",
        ],
      },
      team: {
        title: "Deal room",
        lines: [
          "Listing owner: Agent Kim",
          "2 collaborators following thread",
          "Offer documents visible to team lead",
        ],
      },
    },
  },

  accounting: {
    useCaseId: "accounting",
    brandName: "Summit Ledger Co.",
    workspaceLabel: "Client accounting mail",
    userLabel: "Tax season inbox",
    crmLabel: CRM_LABELS.accounting,
    crmContacts: ACCOUNTING_CRM,
    reminders: ACCOUNTING_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS.accounting,
    defaultContactId: "acct-c1",
    folders: ["All clients", "Document requests", "Filing deadlines", "Secure drop"],
    tools: [
      { id: "intake", label: "Document intake", hint: "8 open requests", stationCode: "01", metric: "8", metricDetail: "Open requests", lane: "intake" },
      { id: "deadlines", label: "Filing calendar", hint: "Apr 15 peak", stationCode: "02", metric: "Apr 15", metricDetail: "Peak season", lane: "deadlines" },
      { id: "secure", label: "Secure exchange", hint: "Encrypted threads", stationCode: "03", metric: "Secure", metricDetail: "Encrypted threads", lane: "secure" },
      { id: "clients", label: "Client entities", hint: "126 active", stationCode: "04", metric: "126", metricDetail: "Active clients", lane: "clients" },
    ],
    defaultToolId: "intake",
    defaultMessageId: "acct-1",
    insights: [
      { label: "Client", value: "Riverside Holdings LLC", tone: "accent" },
      { label: "Tax year", value: "FY2024", tone: "ok" },
      { label: "Due", value: "W-2s — Mar 20", tone: "warn" },
    ],
    messages: [
      {
        id: "acct-1",
        from: "Tax Desk <tax@summitledger.com>",
        subject: "W-2 request — Riverside Holdings LLC",
        preview: "Structured document request sent. Client portal upload link…",
        body: "Structured document request sent for all 2024 W-2 and 1099 forms. Client portal upload link embedded. Thread scoped to Riverside Holdings LLC entity.",
        time: "7:45 AM",
        tags: ["FY2024", "W-2 pending", "Client"],
        unread: true,
        contactId: "acct-c1",
      },
      {
        id: "acct-2",
        from: "Reminder Engine <reminders@summitledger.com>",
        subject: "Filing deadline reminder — Partnership return",
        preview: "Partnership return due March 15. Missing K-1 from partner…",
        body: "Partnership return due March 15. Missing K-1 from partner thread flagged. Automated reminder scheduled for client contact.",
        time: "Yesterday",
        tags: ["Deadline", "Partnership"],
        contactId: "acct-c2",
      },
      {
        id: "acct-3",
        from: "M. Ortiz <m.ortiz@riversidehold.com>",
        subject: "Signed return and payment authorization",
        preview: "Attached signed Form 8879 and bank authorization…",
        body: "Attached signed Form 8879 and bank authorization. Please confirm receipt through secure exchange. Delivery and download logged.",
        time: "Mon",
        tags: ["Signed return", "Secure"],
        attachment: "8879-signed.pdf",
        attachments: ["entity-summary.xlsx"],
        contactId: "acct-c1",
      },
      {
        id: "acct-4",
        from: "M. Ortiz <m.ortiz@riversidehold.com>",
        subject: "K-1 draft for review",
        preview: "Please review the attached partnership K-1 draft…",
        body: "Please review the attached partnership K-1 draft before we finalize the Riverside Holdings return.",
        time: "4 days ago",
        tags: ["FY2024", "Review"],
        contactId: "acct-c1",
      },
      {
        id: "acct-5",
        from: "Parkview Partners LP <tax@parkviewpartners.com>",
        subject: "Missing partner schedule",
        preview: "We are still missing one partner K-1 supporting schedule…",
        body: "We are still missing one partner K-1 supporting schedule. Can you confirm expected delivery date?",
        time: "2 days ago",
        tags: ["Partnership", "Pending"],
        contactId: "acct-c2",
      },
    ],
    toolPanels: {
      intake: {
        title: "Document intake",
        lines: [
          "W-2 / 1099 checklist sent to Riverside Holdings",
          "3 of 5 documents received",
          "Auto-reminder scheduled for missing items",
        ],
      },
      deadlines: {
        title: "Filing calendar",
        lines: [
          "Mar 15 — Partnership returns",
          "Apr 15 — Individual & C-corp peak",
          "Deadline alerts tied to client threads",
        ],
      },
      secure: {
        title: "Secure exchange",
        lines: [
          "TLS enforced on client domain",
          "Download and forward events audited",
          "Encrypted attachment policy active",
        ],
      },
      clients: {
        title: "Client entities",
        lines: [
          "Riverside Holdings LLC — Tax prep",
          "All threads grouped by entity",
          "Staff permissions scoped per client",
        ],
      },
    },
  },

  recruitment: {
    useCaseId: "recruitment",
    brandName: "TalentBridge Staffing",
    workspaceLabel: "Recruiter operations mail",
    userLabel: "Recruiter inbox",
    crmLabel: CRM_LABELS.recruitment,
    crmContacts: RECRUITMENT_CRM,
    reminders: RECRUITMENT_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS.recruitment,
    defaultContactId: "rec-c1",
    folders: ["All roles", "Candidates", "Interviews", "Offers"],
    tools: [
      { id: "pipeline", label: "Role pipeline", hint: "9 open roles", stationCode: "01", metric: "9", metricDetail: "Open roles", lane: "pipeline" },
      { id: "schedule", label: "Interview desk", hint: "6 this week", stationCode: "02", metric: "6", metricDetail: "This week", lane: "schedule" },
      { id: "outreach", label: "Bulk outreach", hint: "42 queued", stationCode: "03", metric: "42", metricDetail: "Queued", lane: "outreach" },
      { id: "search", label: "Talent search", hint: "Cross-thread", stationCode: "04", metric: "Live", metricDetail: "Cross-thread", lane: "search" },
    ],
    defaultToolId: "pipeline",
    defaultMessageId: "rec-1",
    insights: [
      { label: "Role", value: "Senior Platform Engineer", tone: "accent" },
      { label: "Stage", value: "Final interview", tone: "warn" },
      { label: "Client", value: "Acme SaaS", tone: "ok" },
    ],
    messages: [
      {
        id: "rec-1",
        from: "Interview Desk <desk@talentbridge.com>",
        subject: "Final interview confirmed — A. Mensah",
        preview: "Acme SaaS confirmed Friday 2pm panel. Candidate brief attached…",
        body: "Acme SaaS confirmed Friday 2pm panel interview for Senior Platform Engineer. Candidate brief and scorecard linked to role pipeline. Calendar invite sent from thread.",
        time: "10:20 AM",
        tags: ["Acme SaaS", "Interview", "Senior Dev"],
        unread: true,
        contactId: "rec-c1",
      },
      {
        id: "rec-2",
        from: "A. Mensah <a.mensah@email.com>",
        subject: "Availability for final round",
        preview: "I can do Thursday after 3pm or Friday morning…",
        body: "I can do Thursday after 3pm or Friday morning. Happy to meet the platform team. Please share the panel format.",
        time: "Yesterday",
        tags: ["Candidate", "Pipeline"],
        contactId: "rec-c1",
      },
      {
        id: "rec-3",
        from: "Acme HR <hr@acmesaas.com>",
        subject: "Offer template approved for release",
        preview: "Legal approved the offer letter template. Ready to send…",
        body: "Legal approved the offer letter template. Ready to send once final interview feedback is logged. Offer workflow attached to role thread.",
        time: "Mon",
        tags: ["Offer", "Client"],
        attachment: "offer-template.docx",
        contactId: "rec-c2",
      },
      {
        id: "rec-4",
        from: "A. Mensah <a.mensah@email.com>",
        subject: "Portfolio links for panel review",
        preview: "Sharing GitHub and architecture write-up ahead of Friday…",
        body: "Sharing GitHub and architecture write-up ahead of Friday's panel. Happy to present migration case study.",
        time: "3 days ago",
        tags: ["Candidate", "Portfolio"],
        contactId: "rec-c1",
      },
      {
        id: "rec-5",
        from: "Acme HR <hr@acmesaas.com>",
        subject: "Panel attendee list confirmed",
        preview: "Engineering manager and staff engineer will join Friday panel…",
        body: "Engineering manager and staff engineer will join Friday panel. Please share candidate brief 24h prior.",
        time: "Yesterday",
        tags: ["Acme SaaS", "Interview"],
        contactId: "rec-c2",
      },
    ],
    toolPanels: {
      pipeline: {
        title: "Role pipeline",
        lines: [
          "Senior Platform Engineer — Acme SaaS — 4 finalists",
          "Stage: Final interview — 1 scheduled",
          "Candidate tags synced to inbox",
        ],
      },
      schedule: {
        title: "Interview desk",
        lines: [
          "Fri 2:00 PM — Panel — A. Mensah",
          "Thu 4:30 PM — Phone screen — DevOps lead",
          "No-show alerts enabled",
        ],
      },
      outreach: {
        title: "Bulk outreach",
        lines: [
          "42 sourced candidates queued",
          "Follow-up status tracked per thread",
          "Reply detection moves candidates to pipeline",
        ],
      },
      search: {
        title: "Talent search",
        lines: [
          "Search across roles, clients, and candidates",
          "Recent: “Acme SaaS platform” — 18 threads",
          "Saved filters for active desk",
        ],
      },
    },
  },

  "b2b-services": {
    useCaseId: "b2b-services",
    brandName: "Northstar Consult Group",
    workspaceLabel: "Client delivery mail",
    userLabel: "Delivery lead inbox",
    crmLabel: CRM_LABELS["b2b-services"],
    crmContacts: B2B_CRM,
    reminders: B2B_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS["b2b-services"],
    defaultContactId: "b2b-c1",
    folders: ["All clients", "Projects", "SOW threads", "SLA alerts"],
    tools: [
      { id: "workspaces", label: "Client workspaces", hint: "11 clients", stationCode: "01", metric: "11", metricDetail: "Clients", lane: "workspaces" },
      { id: "projects", label: "Project tracker", hint: "Project Alpha", stationCode: "02", metric: "Alpha", metricDetail: "Active project", lane: "projects" },
      { id: "proposals", label: "Proposal desk", hint: "2 pending", stationCode: "03", metric: "2", metricDetail: "Pending", lane: "proposals" },
      { id: "sla", label: "SLA monitor", hint: "1 escalation", stationCode: "04", metric: "1", metricDetail: "Escalation", lane: "sla" },
    ],
    defaultToolId: "projects",
    defaultMessageId: "b2b-1",
    insights: [
      { label: "Client", value: "Helios Retail", tone: "accent" },
      { label: "Project", value: "Alpha migration", tone: "ok" },
      { label: "SLA", value: "4h window — 1h left", tone: "warn" },
    ],
    messages: [
      {
        id: "b2b-1",
        from: "Helios PM <pm@heliosretail.com>",
        subject: "Urgent: deliverable review needed today",
        preview: "We need sign-off on migration cutover plan before 5pm…",
        body: "We need sign-off on migration cutover plan before 5pm. SLA clock started at 1pm. Project Alpha thread updated and escalation path notified to delivery lead.",
        time: "1:08 PM",
        tags: ["Helios Retail", "SLA 4h", "Project Alpha"],
        unread: true,
        attachment: "cutover-plan.pdf",
        attachments: ["rollback-checklist.pdf"],
        contactId: "b2b-c1",
      },
      {
        id: "b2b-2",
        from: "Delivery Desk <delivery@northstar.consult>",
        subject: "SOW milestone logged — Phase 2 complete",
        preview: "Phase 2 deliverables accepted. Phase 3 kickoff thread…",
        body: "Phase 2 deliverables accepted by client approver. Phase 3 kickoff thread opened. Handoff notes preserved in project workspace.",
        time: "Yesterday",
        tags: ["SOW", "Milestone"],
        contactId: "b2b-c3",
      },
      {
        id: "b2b-3",
        from: "Nova MSP <procurement@novamsp.com>",
        subject: "Proposal feedback — managed services scope",
        preview: "Procurement reviewed SOW pricing. Requested revision on…",
        body: "Procurement reviewed SOW pricing. Requested revision on support tiers. Proposal desk linked and version history stored on thread.",
        time: "Mon",
        tags: ["Proposal", "Nova MSP"],
        contactId: "b2b-c2",
      },
      {
        id: "b2b-4",
        from: "Helios PM <pm@heliosretail.com>",
        subject: "Rollback checklist approval",
        preview: "Please confirm rollback checklist is attached to cutover plan…",
        body: "Please confirm rollback checklist is attached to cutover plan before end of day sign-off.",
        time: "2 days ago",
        tags: ["Project Alpha", "Cutover"],
        contactId: "b2b-c1",
      },
      {
        id: "b2b-5",
        from: "Helios PM <pm@heliosretail.com>",
        subject: "Stakeholder sync notes",
        preview: "Notes from yesterday's stakeholder sync attached…",
        body: "Notes from yesterday's stakeholder sync attached. Action items logged to Project Alpha workspace.",
        time: "Last week",
        tags: ["Helios Retail", "Notes"],
        contactId: "b2b-c1",
      },
    ],
    toolPanels: {
      workspaces: {
        title: "Client workspaces",
        lines: [
          "Helios Retail — Dedicated branded domain",
          "Nova MSP — Proposal stage",
          "Per-client mail isolation enabled",
        ],
      },
      projects: {
        title: "Project tracker",
        lines: [
          "Project Alpha — Migration — Phase 3 next",
          "Deliverable status visible from inbox",
          "Team handoff notes on thread",
        ],
      },
      proposals: {
        title: "Proposal desk",
        lines: [
          "Nova MSP — Revision requested",
          "Version 2 draft in progress",
          "Approval trail attached to mail",
        ],
      },
      sla: {
        title: "SLA monitor",
        lines: [
          "Helios Retail — 4h SLA — 1h remaining",
          "Escalation route: Delivery lead → Director",
          "Client reply auto-pauses SLA clock",
        ],
      },
    },
  },

  healthcare: {
    useCaseId: "healthcare",
    brandName: "Summit Care Partners",
    workspaceLabel: "Clinical operations mail",
    userLabel: "Care coordinator inbox",
    crmLabel: CRM_LABELS.healthcare,
    crmContacts: HEALTHCARE_CRM,
    reminders: HEALTHCARE_REMINDERS,
    crmStageOptions: CRM_STAGE_OPTIONS.healthcare,
    defaultContactId: "hc-c1",
    folders: ["All patients", "Appointments", "Referrals", "Prior auth"],
    tools: [
      {
        id: "patients",
        label: "Patient registry",
        hint: "128 active charts",
        stationCode: "01",
        lane: "registry",
      },
      {
        id: "appointments",
        label: "Appointment desk",
        hint: "14 today",
        stationCode: "02",
        lane: "scheduling",
      },
      {
        id: "referrals",
        label: "Referral tracker",
        hint: "6 open",
        stationCode: "03",
        lane: "referrals",
      },
      {
        id: "compliance",
        label: "HIPAA audit",
        hint: "Full access log",
        stationCode: "04",
        lane: "compliance",
      },
    ],
    defaultToolId: "patients",
    defaultMessageId: "hc-1",
    insights: [
      { label: "Patient", value: "M. Patterson", tone: "accent" },
      { label: "Care plan", value: "Cardiology follow-up", tone: "ok" },
      { label: "Prior auth", value: "MRI — pending", tone: "warn" },
    ],
    messages: [
      {
        id: "hc-1",
        from: "M. Patterson <m.patterson@patientmail.com>",
        subject: "Question about post-discharge medication",
        preview: "I started the new prescription but have mild dizziness in the evenings…",
        body: "I started the new prescription but have mild dizziness in the evenings. Should I continue or call the clinic? My follow-up is scheduled for next week but wanted to check sooner.",
        time: "10:22 AM",
        tags: ["Patient", "Medication", "Urgent review"],
        unread: true,
        contactId: "hc-c1",
      },
      {
        id: "hc-2",
        from: "Dr. S. Okoro <s.okoro@riverside.med>",
        subject: "Referral — cardiac rehab consult",
        preview: "Please evaluate M. Patterson for outpatient cardiac rehabilitation…",
        body: "Please evaluate M. Patterson for outpatient cardiac rehabilitation following recent hospitalization. Clinical summary and recent echo attached. Prior authorization request submitted to CareFirst.",
        time: "Yesterday",
        tags: ["Referral", "Cardiology"],
        attachment: "referral-summary.pdf",
        attachments: ["echo-results.pdf"],
        contactId: "hc-c2",
      },
      {
        id: "hc-3",
        from: "CareFirst Prior Auth <priorauth@carefirst.ins>",
        subject: "Additional documentation requested — MRI PA-88421",
        preview: "We require recent lab results and clinical notes to continue review…",
        body: "We require recent lab results and clinical notes to continue review of prior authorization PA-88421. Please respond within 5 business days to avoid automatic denial.",
        time: "Mon",
        tags: ["Prior auth", "Payer"],
        contactId: "hc-c3",
      },
      {
        id: "hc-4",
        from: "M. Patterson <m.patterson@patientmail.com>",
        subject: "Lab results uploaded to portal",
        preview: "I uploaded my blood work from this morning as requested…",
        body: "I uploaded my blood work from this morning as requested. Please let me know if anything else is needed before my follow-up appointment.",
        time: "2 days ago",
        tags: ["Patient", "Labs"],
        contactId: "hc-c1",
      },
      {
        id: "hc-5",
        from: "M. Patterson <m.patterson@patientmail.com>",
        subject: "Appointment confirmation for Mar 19",
        preview: "Confirming the 10:30 AM cardiology follow-up at Summit Care…",
        body: "Confirming the 10:30 AM cardiology follow-up at Summit Care Partners. Please advise if telehealth is available instead.",
        time: "Last week",
        tags: ["Appointment", "Patient"],
        contactId: "hc-c1",
      },
    ],
    toolPanels: {
      patients: {
        title: "Patient registry",
        lines: [
          "M. Patterson — Cardiology follow-up — Active care",
          "Patient threads linked to chart ID and care team",
          "Secure messaging audit trail enabled",
        ],
      },
      appointments: {
        title: "Appointment desk",
        lines: [
          "Today 10:30 AM — Follow-up — M. Patterson",
          "Today 2:00 PM — New patient intake — Telehealth",
          "No-show and reminder sequences active",
        ],
      },
      referrals: {
        title: "Referral tracker",
        lines: [
          "Dr. Okoro — Cardiac rehab — Awaiting scheduling",
          "Referral status synced to patient CRM record",
          "Outbound updates logged to referral thread",
        ],
      },
      compliance: {
        title: "HIPAA audit",
        lines: [
          "All message access and exports logged",
          "Minimum necessary access roles enforced",
          "BAA-covered vendor activity monitored",
        ],
      },
    },
  },
};

export const DEMO_USE_CASE_IDS = Object.keys(BESPOKE_MAIL_DEMOS);

export function getBespokeMailDemo(useCaseId: string): BespokeMailDemoConfig | undefined {
  return BESPOKE_MAIL_DEMOS[useCaseId];
}
