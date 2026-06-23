export const VIEW_CONTACTS = "__view__:contacts";
export const VIEW_DOCUMENTS = "__view__:documents";
export const VIEW_SCHEDULED = "__view__:scheduled";
export const VIEW_AUTO_RESPONSE = "__view__:auto_response";
export const VIEW_DESK = "__view__:immigration_desk";
export const VIEW_CHECKLISTS = "__view__:program_checklists";
export const VIEW_COMPLIANCE = "__view__:compliance_pack";
export const VIEW_IRCC_INTEL = "__view__:ircc_mail_intel";
export const VIEW_CASE_LINKED = "__view__:case_linked_mail";
export const VIEW_DEADLINES = "__view__:deadline_guard";
export const VIEW_PORTAL = "__view__:client_portal";
export const VIEW_WORKSPACE_CRM = "__view__:workspace_crm";
export const VIEW_WORKSPACE_REMINDERS = "__view__:workspace_reminders";
export const VIEW_PROVIDER_SETTINGS = "__view__:provider_settings";
export const VIEW_COMPOSE_SETTINGS = "__view__:compose_settings";
export const VIEW_AUTO_REPLY_FUNCTIONALITY = "__view__:auto_reply_functionality";
export const VIEW_CALENDAR = "__view__:workspace_calendar";
export const VIEW_OPEN_TRACKING = "__view__:open_tracking";
export const VIEW_FILE_VAULT = "__view__:file_vault";
export const VIEW_INBOX_CLEANUP = "__view__:inbox_cleanup";
export const VIEW_ATTACHMENT_CATEGORIZE = "__view__:attachment_categorize";
export const VIEW_ESIGN = "__view__:esign";
export const VIEW_EMAIL_SLA = "__view__:email_sla";
export const VIEW_MAIL2PDF = "__view__:mail2pdf";
export const VIEW_JOB_HUNTER_SETTINGS = "__view__:job_hunter_settings";
export const VIEW_CAREER_SCANNER = "__view__:career_scanner";
export const VIEW_INDUSTRY_TOOLS = "__view__:industry_tools";
export const VIEW_RE_LISTING_BOARD = "__view__:re_listing_board";
export const VIEW_RE_SHOWING_SCHEDULER = "__view__:re_showing_scheduler";
export const VIEW_RE_QUICK_REPLIES = "__view__:re_quick_replies";
export const VIEW_RE_DEAL_ROOM = "__view__:re_deal_room";
export const VIEW_AC_DOCUMENT_INTAKE = "__view__:ac_document_intake";
export const VIEW_AC_FILING_CALENDAR = "__view__:ac_filing_calendar";
export const VIEW_AC_SECURE_EXCHANGE = "__view__:ac_secure_exchange";
export const VIEW_AC_CLIENT_ENTITIES = "__view__:ac_client_entities";
export const VIEW_RC_ROLE_PIPELINE = "__view__:rc_role_pipeline";
export const VIEW_RC_INTERVIEW_DESK = "__view__:rc_interview_desk";
export const VIEW_RC_BULK_OUTREACH = "__view__:rc_bulk_outreach";
export const VIEW_RC_TALENT_SEARCH = "__view__:rc_talent_search";
export const VIEW_B2B_CLIENT_WORKSPACES = "__view__:b2b_client_workspaces";
export const VIEW_B2B_PROJECT_TRACKER = "__view__:b2b_project_tracker";
export const VIEW_B2B_PROPOSAL_DESK = "__view__:b2b_proposal_desk";
export const VIEW_B2B_SLA_MONITOR = "__view__:b2b_sla_monitor";
export const VIEW_HC_PATIENT_REGISTRY = "__view__:hc_patient_registry";
export const VIEW_HC_APPOINTMENT_DESK = "__view__:hc_appointment_desk";
export const VIEW_HC_REFERRAL_TRACKER = "__view__:hc_referral_tracker";
export const VIEW_HC_HIPAA_AUDIT = "__view__:hc_hipaa_audit";

export const ALL_VIRTUAL_VIEWS = [
  VIEW_CONTACTS,
  VIEW_DOCUMENTS,
  VIEW_SCHEDULED,
  VIEW_AUTO_RESPONSE,
  VIEW_DESK,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_IRCC_INTEL,
  VIEW_CASE_LINKED,
  VIEW_DEADLINES,
  VIEW_PORTAL,
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
  VIEW_CALENDAR,
  VIEW_PROVIDER_SETTINGS,
  VIEW_COMPOSE_SETTINGS,
  VIEW_AUTO_REPLY_FUNCTIONALITY,
  VIEW_OPEN_TRACKING,
  VIEW_FILE_VAULT,
  VIEW_INBOX_CLEANUP,
  VIEW_ATTACHMENT_CATEGORIZE,
  VIEW_ESIGN,
  VIEW_EMAIL_SLA,
  VIEW_MAIL2PDF,
  VIEW_JOB_HUNTER_SETTINGS,
  VIEW_CAREER_SCANNER,
  VIEW_INDUSTRY_TOOLS,
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
] as const;

export type MailStatusFilter = "all" | "unread" | "read" | "starred";

export type MailSearchField = "date" | "sender" | "subject" | "recipient" | "body";

export type MailSearchScope = "all" | "inbox" | "sent" | "drafts" | "scheduled" | "trash";

export interface MailSearchState {
  field: MailSearchField;
  query: string;
  scope?: MailSearchScope;
}

export function isVirtualView(path: string): boolean {
  return (ALL_VIRTUAL_VIEWS as readonly string[]).includes(path);
}

export function folderSupportsBulkActions(folderKind: string): boolean {
  return folderKind === "inbox" || folderKind === "sent";
}

export function folderSupportsFilters(_folderKind: string): boolean {
  return true;
}

export function virtualViewTitle(path: string): string {
  const titles: Record<string, string> = {
    [VIEW_CONTACTS]: "Contacts",
    [VIEW_DOCUMENTS]: "Documents",
    [VIEW_SCHEDULED]: "Scheduled",
    [VIEW_AUTO_RESPONSE]: "Immigration templates",
    [VIEW_DESK]: "Immigration Desk",
    [VIEW_CHECKLISTS]: "Program checklists",
    [VIEW_COMPLIANCE]: "Compliance audit",
    [VIEW_IRCC_INTEL]: "IRCC Mail Intelligence",
    [VIEW_CASE_LINKED]: "Case-linked mail",
    [VIEW_DEADLINES]: "Deadline Guard",
    [VIEW_PORTAL]: "Client portal",
    [VIEW_WORKSPACE_CRM]: "CRM pipeline",
    [VIEW_WORKSPACE_REMINDERS]: "Reminders",
    [VIEW_CALENDAR]: "Full calendar",
    [VIEW_PROVIDER_SETTINGS]: "Provider settings",
    [VIEW_COMPOSE_SETTINGS]: "Compose settings",
    [VIEW_AUTO_REPLY_FUNCTIONALITY]: "Auto-reply",
    [VIEW_OPEN_TRACKING]: "Open tracking",
    [VIEW_FILE_VAULT]: "File vault",
    [VIEW_INBOX_CLEANUP]: "Inbox cleanup",
    [VIEW_ATTACHMENT_CATEGORIZE]: "Attachment categories",
    [VIEW_ESIGN]: "E-sign",
    [VIEW_EMAIL_SLA]: "Email SLA",
    [VIEW_MAIL2PDF]: "Mail 2 PDF",
    [VIEW_JOB_HUNTER_SETTINGS]: "Job Hunter",
    [VIEW_CAREER_SCANNER]: "CV Scanner",
    [VIEW_INDUSTRY_TOOLS]: "Industry tools",
    [VIEW_RE_LISTING_BOARD]: "Listing Board",
    [VIEW_RE_SHOWING_SCHEDULER]: "Showing Scheduler",
    [VIEW_RE_QUICK_REPLIES]: "Quick Replies",
    [VIEW_RE_DEAL_ROOM]: "Deal Room",
    [VIEW_AC_DOCUMENT_INTAKE]: "Document Vault",
    [VIEW_AC_FILING_CALENDAR]: "Tax Calendar",
    [VIEW_AC_SECURE_EXCHANGE]: "Exchange Ledger",
    [VIEW_AC_CLIENT_ENTITIES]: "Entity Ledger",
    [VIEW_RC_ROLE_PIPELINE]: "Role Pipeline",
    [VIEW_RC_INTERVIEW_DESK]: "Interview Desk",
    [VIEW_RC_BULK_OUTREACH]: "Bulk Outreach",
    [VIEW_RC_TALENT_SEARCH]: "Talent Search",
    [VIEW_B2B_CLIENT_WORKSPACES]: "Client Workspaces",
    [VIEW_B2B_PROJECT_TRACKER]: "Project Tracker",
    [VIEW_B2B_PROPOSAL_DESK]: "Proposal Desk",
    [VIEW_B2B_SLA_MONITOR]: "SLA Monitor",
    [VIEW_HC_PATIENT_REGISTRY]: "Patient Registry",
    [VIEW_HC_APPOINTMENT_DESK]: "Appointment Desk",
    [VIEW_HC_REFERRAL_TRACKER]: "Referral Tracker",
    [VIEW_HC_HIPAA_AUDIT]: "HIPAA Audit",
  };
  return titles[path] ?? "Tools";
}
