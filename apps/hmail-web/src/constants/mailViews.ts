export const VIEW_SCHEDULED = "__view__:scheduled";
export const VIEW_AUTO_RESPONSE = "__view__:auto_response";
export const VIEW_DESK = "__view__:immigration_desk";
export const VIEW_CHECKLISTS = "__view__:program_checklists";
export const VIEW_COMPLIANCE = "__view__:compliance_pack";
export const VIEW_IRCC_INTEL = "__view__:ircc_mail_intel";
export const VIEW_CASE_LINKED = "__view__:case_linked_mail";
export const VIEW_DEADLINES = "__view__:deadline_guard";
export const VIEW_PORTAL = "__view__:client_portal";

export const ALL_VIRTUAL_VIEWS = [
  VIEW_SCHEDULED,
  VIEW_AUTO_RESPONSE,
  VIEW_DESK,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_IRCC_INTEL,
  VIEW_CASE_LINKED,
  VIEW_DEADLINES,
  VIEW_PORTAL,
] as const;

export type MailStatusFilter = "all" | "unread" | "read" | "starred";

export type MailSearchField = "date" | "sender" | "subject" | "recipient" | "body";

export interface MailSearchState {
  field: MailSearchField;
  query: string;
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
    [VIEW_SCHEDULED]: "Scheduled",
    [VIEW_AUTO_RESPONSE]: "Immigration templates",
    [VIEW_DESK]: "Immigration Desk",
    [VIEW_CHECKLISTS]: "Program checklists",
    [VIEW_COMPLIANCE]: "Compliance audit",
    [VIEW_IRCC_INTEL]: "IRCC Mail Intelligence",
    [VIEW_CASE_LINKED]: "Case-linked mail",
    [VIEW_DEADLINES]: "Deadline Guard",
    [VIEW_PORTAL]: "Client portal",
  };
  return titles[path] ?? "Tools";
}
