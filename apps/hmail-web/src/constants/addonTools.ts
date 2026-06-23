import {
  VIEW_AUTO_RESPONSE,
  VIEW_CASE_LINKED,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_DEADLINES,
  VIEW_DESK,
  VIEW_INDUSTRY_TOOLS,
  VIEW_IRCC_INTEL,
  VIEW_OPEN_TRACKING,
  VIEW_FILE_VAULT,
  VIEW_INBOX_CLEANUP,
  VIEW_ATTACHMENT_CATEGORIZE,
  VIEW_ESIGN,
  VIEW_EMAIL_SLA,
  VIEW_MAIL2PDF,
  VIEW_JOB_HUNTER_SETTINGS,
  VIEW_CAREER_SCANNER,
  VIEW_CALENDAR,
  VIEW_PORTAL,
  VIEW_SCHEDULED,
  VIEW_COMPOSE_SETTINGS,
  VIEW_AUTO_REPLY_FUNCTIONALITY,
  VIEW_PROVIDER_SETTINGS,
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
  VIEW_RE_LISTING_BOARD,
  VIEW_RE_SHOWING_SCHEDULER,
  VIEW_RE_QUICK_REPLIES,
  VIEW_RE_DEAL_ROOM,
  VIEW_AC_DOCUMENT_INTAKE,
  VIEW_AC_FILING_CALENDAR,
  VIEW_AC_SECURE_EXCHANGE,
  VIEW_AC_CLIENT_ENTITIES,
  VIEW_RC_ROLE_PIPELINE,
  VIEW_RC_INTERVIEW_DESK,
  VIEW_RC_BULK_OUTREACH,
  VIEW_RC_TALENT_SEARCH,
  VIEW_B2B_CLIENT_WORKSPACES,
  VIEW_B2B_PROJECT_TRACKER,
  VIEW_B2B_PROPOSAL_DESK,
  VIEW_B2B_SLA_MONITOR,
  VIEW_HC_PATIENT_REGISTRY,
  VIEW_HC_APPOINTMENT_DESK,
  VIEW_HC_REFERRAL_TRACKER,
  VIEW_HC_HIPAA_AUDIT,
} from "./mailViews";

export const TOOL_ADDON_SLUGS: Record<string, string> = {
  [VIEW_SCHEDULED]: "scheduled-send",
  [VIEW_AUTO_RESPONSE]: "immigration-templates",
  [VIEW_DESK]: "immigration-desk",
  [VIEW_CHECKLISTS]: "program-checklists",
  [VIEW_COMPLIANCE]: "compliance-pack",
  [VIEW_IRCC_INTEL]: "ircc-mail-intel",
  [VIEW_CASE_LINKED]: "case-linked-mail",
  [VIEW_DEADLINES]: "deadline-guard",
  [VIEW_PORTAL]: "client-portal",
  [VIEW_WORKSPACE_CRM]: "bespoke-workspace",
  [VIEW_WORKSPACE_REMINDERS]: "bespoke-workspace",
  [VIEW_INDUSTRY_TOOLS]: "bespoke-workspace",
  [VIEW_OPEN_TRACKING]: "open-tracking",
  [VIEW_FILE_VAULT]: "file-vault-functionality",
  [VIEW_INBOX_CLEANUP]: "inbox-cleanup-functionality",
  [VIEW_ATTACHMENT_CATEGORIZE]: "attachment-categorize-functionality",
  [VIEW_ESIGN]: "esign-from-email-functionality",
  [VIEW_EMAIL_SLA]: "email-sla-tracker-functionality",
  [VIEW_MAIL2PDF]: "mail2pdf-functionality",
  [VIEW_JOB_HUNTER_SETTINGS]: "job-hunter-functionality",
  [VIEW_CAREER_SCANNER]: "job-hunter-functionality",
  [VIEW_AUTO_REPLY_FUNCTIONALITY]: "auto-reply-functionality",
  [VIEW_CALENDAR]: "full-calendar-functionality",
  [VIEW_RE_LISTING_BOARD]: "re-listing-board",
  [VIEW_RE_SHOWING_SCHEDULER]: "re-showing-scheduler",
  [VIEW_RE_QUICK_REPLIES]: "re-quick-replies",
  [VIEW_RE_DEAL_ROOM]: "re-deal-room",
  [VIEW_AC_DOCUMENT_INTAKE]: "ac-document-intake",
  [VIEW_AC_FILING_CALENDAR]: "ac-filing-calendar",
  [VIEW_AC_SECURE_EXCHANGE]: "ac-secure-exchange",
  [VIEW_AC_CLIENT_ENTITIES]: "ac-client-entities",
  [VIEW_RC_ROLE_PIPELINE]: "rc-role-pipeline",
  [VIEW_RC_INTERVIEW_DESK]: "rc-interview-desk",
  [VIEW_RC_BULK_OUTREACH]: "rc-bulk-outreach",
  [VIEW_RC_TALENT_SEARCH]: "rc-talent-search",
  [VIEW_B2B_CLIENT_WORKSPACES]: "b2b-client-workspaces",
  [VIEW_B2B_PROJECT_TRACKER]: "b2b-project-tracker",
  [VIEW_B2B_PROPOSAL_DESK]: "b2b-proposal-desk",
  [VIEW_B2B_SLA_MONITOR]: "b2b-sla-monitor",
  [VIEW_HC_PATIENT_REGISTRY]: "hc-patient-registry",
  [VIEW_HC_APPOINTMENT_DESK]: "hc-appointment-desk",
  [VIEW_HC_REFERRAL_TRACKER]: "hc-referral-tracker",
  [VIEW_HC_HIPAA_AUDIT]: "hc-hipaa-audit",
};

export const ADDON_VIRTUAL_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(TOOL_ADDON_SLUGS).map(([view, slug]) => [slug, view]),
);

export function toolAddonSlug(viewPath: string): string | undefined {
  return TOOL_ADDON_SLUGS[viewPath];
}

export const PHASE_1_NAV = [
  { view: VIEW_DESK, label: "Immigration Desk", kind: "desk" as const },
  { view: VIEW_CHECKLISTS, label: "Program checklists", kind: "checklists" as const },
  { view: VIEW_SCHEDULED, label: "Scheduled", kind: "scheduled" as const },
  { view: VIEW_AUTO_RESPONSE, label: "Immigration templates", kind: "auto_response" as const },
  { view: VIEW_COMPLIANCE, label: "Compliance audit", kind: "compliance" as const },
];

export const PHASE_2_NAV = [
  { view: VIEW_IRCC_INTEL, label: "IRCC intelligence", kind: "ircc_intel" as const },
  { view: VIEW_CASE_LINKED, label: "Case-linked mail", kind: "case_linked" as const },
  { view: VIEW_DEADLINES, label: "Deadline Guard", kind: "deadlines" as const },
  { view: VIEW_PORTAL, label: "Client portal", kind: "portal" as const },
];

export const WORKSPACE_NAV = [
  { view: VIEW_WORKSPACE_CRM, label: "CRM pipeline", kind: "workspace_crm" as const },
  { view: VIEW_WORKSPACE_REMINDERS, label: "Reminders", kind: "workspace_reminders" as const },
  { view: VIEW_CALENDAR, label: "Full calendar", kind: "workspace_calendar" as const },
  { view: VIEW_INDUSTRY_TOOLS, label: "Industry tools", kind: "industry_tools" as const },
  { view: VIEW_OPEN_TRACKING, label: "Open tracking", kind: "open_tracking" as const },
  { view: VIEW_FILE_VAULT, label: "File vault", kind: "file_vault" as const },
  { view: VIEW_INBOX_CLEANUP, label: "Inbox cleanup", kind: "inbox_cleanup" as const },
  { view: VIEW_ATTACHMENT_CATEGORIZE, label: "Attachment categories", kind: "attachment_categorize" as const },
  { view: VIEW_ESIGN, label: "E-sign", kind: "esign" as const },
  { view: VIEW_EMAIL_SLA, label: "Email SLA", kind: "email_sla" as const },
  { view: VIEW_MAIL2PDF, label: "Mail 2 PDF", kind: "mail2pdf" as const },
  { view: VIEW_JOB_HUNTER_SETTINGS, label: "Job Hunter", kind: "job_hunter_settings" as const },
  { view: VIEW_CAREER_SCANNER, label: "CV Scanner", kind: "career_scanner" as const },
  { view: VIEW_AUTO_REPLY_FUNCTIONALITY, label: "Auto-reply", kind: "auto_reply_functionality" as const },
  { view: VIEW_PROVIDER_SETTINGS, label: "Provider settings", kind: "provider_settings" as const },
  { view: VIEW_COMPOSE_SETTINGS, label: "Compose settings", kind: "compose_settings" as const },
];

/** Platform tools reachable from top tabs / Brand Settings — not listed in the mail sidebar. */
const SIDEBAR_HIDDEN_PLATFORM_VIEWS = new Set<string>([
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
  VIEW_CALENDAR,
  VIEW_PROVIDER_SETTINGS,
  VIEW_COMPOSE_SETTINGS,
  VIEW_CAREER_SCANNER,
  VIEW_JOB_HUNTER_SETTINGS,
]);

export function platformToolsSidebarNav<T extends (typeof WORKSPACE_NAV)[number]>(items: T[]): T[] {
  return items.filter((item) => !SIDEBAR_HIDDEN_PLATFORM_VIEWS.has(item.view));
}

export const REAL_ESTATE_NAV = [
  { view: VIEW_RE_LISTING_BOARD, label: "Listing Board", kind: "re_listing_board" as const },
  { view: VIEW_RE_SHOWING_SCHEDULER, label: "Showing Scheduler", kind: "re_showing_scheduler" as const },
  { view: VIEW_RE_QUICK_REPLIES, label: "Quick Replies", kind: "re_quick_replies" as const },
  { view: VIEW_RE_DEAL_ROOM, label: "Deal Room", kind: "re_deal_room" as const },
];

export const ACCOUNTING_NAV = [
  { view: VIEW_AC_DOCUMENT_INTAKE, label: "Document Vault", kind: "ac_document_intake" as const },
  { view: VIEW_AC_FILING_CALENDAR, label: "Tax Calendar", kind: "ac_filing_calendar" as const },
  { view: VIEW_AC_SECURE_EXCHANGE, label: "Exchange Ledger", kind: "ac_secure_exchange" as const },
  { view: VIEW_AC_CLIENT_ENTITIES, label: "Entity Ledger", kind: "ac_client_entities" as const },
];

export const RECRUITMENT_NAV = [
  { view: VIEW_RC_ROLE_PIPELINE, label: "Role Pipeline", kind: "rc_role_pipeline" as const },
  { view: VIEW_RC_INTERVIEW_DESK, label: "Interview Desk", kind: "rc_interview_desk" as const },
  { view: VIEW_RC_BULK_OUTREACH, label: "Bulk Outreach", kind: "rc_bulk_outreach" as const },
  { view: VIEW_RC_TALENT_SEARCH, label: "Talent Search", kind: "rc_talent_search" as const },
];

export const B2B_NAV = [
  { view: VIEW_B2B_CLIENT_WORKSPACES, label: "Client Workspaces", kind: "b2b_client_workspaces" as const },
  { view: VIEW_B2B_PROJECT_TRACKER, label: "Project Tracker", kind: "b2b_project_tracker" as const },
  { view: VIEW_B2B_PROPOSAL_DESK, label: "Proposal Desk", kind: "b2b_proposal_desk" as const },
  { view: VIEW_B2B_SLA_MONITOR, label: "SLA Monitor", kind: "b2b_sla_monitor" as const },
];

export const HEALTHCARE_NAV = [
  { view: VIEW_HC_PATIENT_REGISTRY, label: "Patient Registry", kind: "hc_patient_registry" as const },
  { view: VIEW_HC_APPOINTMENT_DESK, label: "Appointment Desk", kind: "hc_appointment_desk" as const },
  { view: VIEW_HC_REFERRAL_TRACKER, label: "Referral Tracker", kind: "hc_referral_tracker" as const },
  { view: VIEW_HC_HIPAA_AUDIT, label: "HIPAA Audit", kind: "hc_hipaa_audit" as const },
];
