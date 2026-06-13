import {
  VIEW_AUTO_RESPONSE,
  VIEW_CASE_LINKED,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_DEADLINES,
  VIEW_DESK,
  VIEW_IRCC_INTEL,
  VIEW_PORTAL,
  VIEW_SCHEDULED,
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
