import type { MailFolder } from "../types/mail";
import type { BusinessVertical } from "../types/mail";
import { useEffect, useState } from "react";
import {
  ACCOUNTING_NAV,
  B2B_NAV,
  HEALTHCARE_NAV,
  PHASE_1_NAV,
  PHASE_2_NAV,
  REAL_ESTATE_NAV,
  RECRUITMENT_NAV,
  WORKSPACE_NAV,
  platformToolsSidebarNav,
  toolAddonSlug,
} from "../constants/addonTools";
import { VIEW_DOCUMENTS, VIEW_INDUSTRY_TOOLS } from "../constants/mailViews";
import { FolderNavIcon } from "./FolderNavIcons";
import {
  MobileDrawerTooltip,
  mobileDrawerTooltipHandlers,
  type MobileDrawerTooltipState,
} from "./MobileDrawerTooltip";
import "./FolderNav.css";

export type FolderKind =
  | "compose"
  | "inbox"
  | "drafts"
  | "sent"
  | "trash"
  | "contacts"
  | "documents"
  | "junk"
  | "scheduled"
  | "auto_response"
  | "desk"
  | "checklists"
  | "compliance"
  | "ircc_intel"
  | "case_linked"
  | "deadlines"
  | "portal"
  | "workspace_crm"
  | "workspace_reminders"
  | "workspace_calendar"
  | "industry_tools"
  | "open_tracking"
  | "file_vault"
  | "inbox_cleanup"
  | "attachment_categorize"
  | "esign"
  | "email_sla"
  | "mail2pdf"
  | "job_hunter_settings"
  | "career_scanner"
  | "career_workspace"
  | "auto_reply_functionality"
  | "provider_settings"
  | "compose_settings"
  | "re_listing_board"
  | "re_showing_scheduler"
  | "re_quick_replies"
  | "re_deal_room"
  | "ac_document_intake"
  | "ac_filing_calendar"
  | "ac_secure_exchange"
  | "ac_client_entities"
  | "rc_role_pipeline"
  | "rc_interview_desk"
  | "rc_bulk_outreach"
  | "rc_talent_search"
  | "b2b_client_workspaces"
  | "b2b_project_tracker"
  | "b2b_proposal_desk"
  | "b2b_sla_monitor"
  | "hc_patient_registry"
  | "hc_appointment_desk"
  | "hc_referral_tracker"
  | "hc_hipaa_audit"
  | "new_folder"
  | "addons"
  | "other";

export function resolveFolderKind(folder: MailFolder): FolderKind {
  const special = folder.specialUse ?? "";
  const name = folder.name.toLowerCase();

  if (special === "\\Inbox") return "inbox";
  if (special === "\\Drafts") return "drafts";
  if (special === "\\Sent") return "sent";
  if (special === "\\Trash") return "trash";
  if (special === "\\Junk" || name.includes("junk") || name.includes("spam")) return "junk";

  return "other";
}

export function folderDisplayLabel(folder: MailFolder): string {
  const kind = resolveFolderKind(folder);
  const labels: Record<FolderKind, string> = {
    compose: "New mail",
    inbox: "Inbox",
    drafts: "Drafts",
    sent: "Sent",
    trash: "Trash",
    contacts: "Contacts",
    documents: "Documents",
    junk: "Spam",
    scheduled: "Scheduled",
    auto_response: "Immigration templates",
    desk: "Immigration Desk",
    checklists: "Program checklists",
    compliance: "Compliance audit",
    ircc_intel: "IRCC intelligence",
    case_linked: "Case-linked mail",
    deadlines: "Deadline Guard",
    portal: "Client portal",
    workspace_crm: "CRM pipeline",
    workspace_reminders: "Reminders",
    workspace_calendar: "Full calendar",
    industry_tools: "Industry tools",
    open_tracking: "Open tracking",
    file_vault: "File vault",
    inbox_cleanup: "Inbox cleanup",
    attachment_categorize: "Attachment categories",
    esign: "E-sign",
    email_sla: "Email SLA",
    mail2pdf: "Mail 2 PDF",
    job_hunter_settings: "Job Hunter",
    career_scanner: "CV Scanner",
    career_workspace: "Career",
    auto_reply_functionality: "Auto-reply",
    provider_settings: "Provider settings",
    compose_settings: "Compose settings",
    re_listing_board: "Listing Board",
    re_showing_scheduler: "Showing Scheduler",
    re_quick_replies: "Quick Replies",
    re_deal_room: "Deal Room",
    ac_document_intake: "Document Vault",
    ac_filing_calendar: "Tax Calendar",
    ac_secure_exchange: "Exchange Ledger",
    ac_client_entities: "Entity Ledger",
    rc_role_pipeline: "Role Pipeline",
    rc_interview_desk: "Interview Desk",
    rc_bulk_outreach: "Bulk Outreach",
    rc_talent_search: "Talent Search",
    b2b_client_workspaces: "Client Workspaces",
    b2b_project_tracker: "Project Tracker",
    b2b_proposal_desk: "Proposal Desk",
    b2b_sla_monitor: "SLA Monitor",
    hc_patient_registry: "Patient Registry",
    hc_appointment_desk: "Appointment Desk",
    hc_referral_tracker: "Referral Tracker",
    hc_hipaa_audit: "HIPAA Audit",
    new_folder: "New folder",
    addons: "Add-ons",
    other: folder.name,
  };
  return labels[kind];
}

const FOLDER_SORT: FolderKind[] = ["inbox", "drafts", "sent", "junk", "trash", "other"];

export function sortFolders(folders: MailFolder[]): MailFolder[] {
  return [...folders].sort((a, b) => {
    const ak = resolveFolderKind(a);
    const bk = resolveFolderKind(b);
    const ai = FOLDER_SORT.indexOf(ak);
    const bi = FOLDER_SORT.indexOf(bk);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

function verticalNavFor(businessVertical?: BusinessVertical | null) {
  switch (businessVertical) {
    case "real-estate":
      return REAL_ESTATE_NAV;
    case "accounting":
      return ACCOUNTING_NAV;
    case "recruitment":
      return RECRUITMENT_NAV;
    case "b2b-services":
      return B2B_NAV;
    case "healthcare":
      return HEALTHCARE_NAV;
    case "legal":
      return null;
    default:
      return null;
  }
}

function FolderNavFlyout({ label }: { label: string }) {
  return (
    <span className="folder-nav-flyout" role="tooltip">
      {label}
    </span>
  );
}

interface FolderNavProps {
  folders: MailFolder[];
  activeFolder: string;
  loading?: boolean;
  businessVertical?: BusinessVertical | null;
  onSelect: (path: string) => void;
  onNewFolder: () => void;
  onCompose: () => void;
  onOpenAddons: (highlightSlug?: string) => void;
  onPaidAddonGate?: (slug: string, label: string) => void;
  hasAddon: (slug: string) => boolean;
  hideIndustryTools?: boolean;
  iconOnlyRail?: boolean;
  tooltipTheme?: "light" | "dark";
}

function renderSpecialItem(
  kind: FolderKind,
  label: string,
  path: string,
  activeFolder: string,
  onSelect: (path: string) => void,
  options?: {
    locked?: boolean;
    onLocked?: () => void;
    iconOnlyRail?: boolean;
    drawerTooltipProps?: (label: string) => Record<string, unknown>;
  },
) {
  const isActive = activeFolder === path;
  const locked = options?.locked ?? false;
  const drawerTooltipProps = options?.drawerTooltipProps;

  return (
    <button
      key={path}
      type="button"
      className={`folder-nav-item folder-nav-item--${kind} ${isActive ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
      aria-label={label}
      {...(options?.iconOnlyRail ? {} : { "data-tooltip": label })}
      {...(drawerTooltipProps?.(label) ?? {})}
      onClick={() => {
        if (locked && options?.onLocked) {
          options.onLocked();
          return;
        }
        onSelect(path);
      }}
    >
      <FolderNavFlyout label={label} />
      <span className="folder-nav-item-accent" aria-hidden="true" />
      <span className={`folder-nav-icon folder-nav-icon--${kind}`}>
        <FolderNavIcon kind={kind} />
      </span>
      <span className="folder-nav-label">{label}</span>
      {locked ? <span className="folder-nav-lock" aria-label="Requires add-on">🔒</span> : null}
    </button>
  );
}

export function FolderNav({
  folders,
  activeFolder,
  loading,
  businessVertical,
  onSelect,
  onNewFolder,
  onCompose,
  onOpenAddons,
  onPaidAddonGate,
  hasAddon,
  hideIndustryTools = false,
  iconOnlyRail = false,
  tooltipTheme = "dark",
}: FolderNavProps) {
  const [drawerTooltip, setDrawerTooltip] = useState<MobileDrawerTooltipState>(null);
  const sorted = sortFolders(folders);
  const primary = sorted.filter((f) => resolveFolderKind(f) !== "other");
  const other = sorted.filter((f) => resolveFolderKind(f) === "other");
  const industryNav = hideIndustryTools ? null : verticalNavFor(businessVertical);
  const showLegalTools = !hideIndustryTools && businessVertical === "legal";
  const workspaceNav = platformToolsSidebarNav(
    hideIndustryTools ? WORKSPACE_NAV.filter((item) => item.view !== VIEW_INDUSTRY_TOOLS) : WORKSPACE_NAV,
  );

  useEffect(() => {
    if (!iconOnlyRail) {
      setDrawerTooltip(null);
    }
  }, [iconOnlyRail]);

  const drawerTooltipProps = (label: string) =>
    iconOnlyRail ? mobileDrawerTooltipHandlers(label, setDrawerTooltip) : {};

  if (loading) {
    return <div className="folder-nav-loading">Loading folders…</div>;
  }

  const renderItem = (folder: MailFolder) => {
    const kind = resolveFolderKind(folder);
    const isActive = activeFolder === folder.path;
    const count = folder.unseen ?? 0;

    return (
      <button
        key={folder.path}
        type="button"
        className={`folder-nav-item folder-nav-item--${kind} ${isActive ? "is-active" : ""}`}
        aria-label={folderDisplayLabel(folder)}
        {...(iconOnlyRail ? {} : { "data-tooltip": folderDisplayLabel(folder) })}
        {...drawerTooltipProps(folderDisplayLabel(folder))}
        onClick={() => onSelect(folder.path)}
      >
        <FolderNavFlyout label={folderDisplayLabel(folder)} />
        <span className="folder-nav-item-accent" aria-hidden="true" />
        <span className={`folder-nav-icon folder-nav-icon--${kind}`}>
          <FolderNavIcon kind={kind} />
        </span>
        <span className="folder-nav-label">{folderDisplayLabel(folder)}</span>
        {count > 0 ? <span className="folder-nav-badge">{count}</span> : null}
      </button>
    );
  };

  const renderTool = (view: string, label: string, kind: FolderKind) => {
    const slug = toolAddonSlug(view) ?? "";
    return renderSpecialItem(kind, label, view, activeFolder, onSelect, {
      locked: slug ? !hasAddon(slug) : false,
      onLocked: () => {
        if (slug && onPaidAddonGate) {
          onPaidAddonGate(slug, label);
          return;
        }
        onOpenAddons(slug);
      },
      iconOnlyRail,
      drawerTooltipProps,
    });
  };

  return (
    <nav className="folder-nav" aria-label="Mail folders">
      <div className="folder-nav-group folder-nav-group--compose">
        <button
          type="button"
          className="folder-nav-item folder-nav-item--compose"
          onClick={onCompose}
          aria-label="New mail"
          {...(iconOnlyRail ? {} : { "data-tooltip": "New mail" })}
          {...drawerTooltipProps("New mail")}
        >
          <FolderNavFlyout label="New mail" />
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--compose">
            <FolderNavIcon kind="compose" />
          </span>
          <span className="folder-nav-label">New mail</span>
        </button>
      </div>

      <p className="folder-nav-heading">Mailboxes</p>
      <div className="folder-nav-group">
        {primary.map(renderItem)}
        {renderSpecialItem("documents", "Documents", VIEW_DOCUMENTS, activeFolder, onSelect, {
          iconOnlyRail,
          drawerTooltipProps,
        })}
      </div>

      <p className="folder-nav-heading folder-nav-heading--secondary folder-nav-heading--platform-tools">Platform tools</p>
      <div className="folder-nav-group folder-nav-group--platform-tools">
        {workspaceNav.map((item) => renderTool(item.view, item.label, item.kind))}
      </div>

      {showLegalTools ? (
        <>
          <p className="folder-nav-heading folder-nav-heading--secondary">Practice tools</p>
          <div className="folder-nav-group">
            {PHASE_1_NAV.map((item) => renderTool(item.view, item.label, item.kind))}
          </div>

          <p className="folder-nav-heading folder-nav-heading--secondary">IRCC tools</p>
          <div className="folder-nav-group">
            {PHASE_2_NAV.map((item) => renderTool(item.view, item.label, item.kind))}
          </div>
        </>
      ) : null}

      {industryNav ? (
        <>
          <p className="folder-nav-heading folder-nav-heading--secondary">Industry tools</p>
          <div className="folder-nav-group">
            {industryNav.map((item) => renderTool(item.view, item.label, item.kind))}
          </div>
        </>
      ) : null}

      <p className="folder-nav-heading folder-nav-heading--secondary">Folders</p>
      <div className="folder-nav-group">
        <button
          type="button"
          className="folder-nav-item folder-nav-item--new_folder"
          onClick={onNewFolder}
          aria-label="New folder"
          {...(iconOnlyRail ? {} : { "data-tooltip": "New folder" })}
          {...drawerTooltipProps("New folder")}
        >
          <FolderNavFlyout label="New folder" />
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--new_folder">
            <FolderNavIcon kind="new_folder" />
          </span>
          <span className="folder-nav-label">New folder</span>
        </button>
      </div>

      <p className="folder-nav-heading folder-nav-heading--secondary">Marketplace</p>
      <div className="folder-nav-group">
        <button
          type="button"
          className="folder-nav-item folder-nav-item--addons"
          onClick={() => onOpenAddons()}
          aria-label="Add-ons"
          {...(iconOnlyRail ? {} : { "data-tooltip": "Add-ons" })}
          {...drawerTooltipProps("Add-ons")}
        >
          <FolderNavFlyout label="Add-ons" />
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--addons">
            <FolderNavIcon kind="addons" />
          </span>
          <span className="folder-nav-label">Add-ons</span>
        </button>
      </div>

      {other.length > 0 ? (
        <>
          <p className="folder-nav-heading folder-nav-heading--secondary">Custom folders</p>
          <div className="folder-nav-group">{other.map(renderItem)}</div>
        </>
      ) : null}
      {iconOnlyRail ? <MobileDrawerTooltip state={drawerTooltip} theme={tooltipTheme} /> : null}
    </nav>
  );
}
