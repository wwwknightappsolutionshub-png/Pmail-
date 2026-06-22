import type { MailFolder } from "../types/mail";
import type { BusinessVertical } from "../types/mail";
import {
  ACCOUNTING_NAV,
  B2B_NAV,
  HEALTHCARE_NAV,
  PHASE_1_NAV,
  PHASE_2_NAV,
  REAL_ESTATE_NAV,
  RECRUITMENT_NAV,
  WORKSPACE_NAV,
  toolAddonSlug,
} from "../constants/addonTools";
import { VIEW_CONTACTS, VIEW_DOCUMENTS } from "../constants/mailViews";
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

function FolderIcon({ kind }: { kind: FolderKind }) {
  if (kind === "compose") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4 6.5 10 11l6-4.5V14.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1h8.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
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
  hasAddon: (slug: string) => boolean;
}

function renderSpecialItem(
  kind: FolderKind,
  label: string,
  path: string,
  activeFolder: string,
  onSelect: (path: string) => void,
  options?: { locked?: boolean; onLocked?: () => void },
) {
  const isActive = activeFolder === path;
  const locked = options?.locked ?? false;

  return (
    <button
      key={path}
      type="button"
      className={`folder-nav-item folder-nav-item--${kind} ${isActive ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
      onClick={() => {
        if (locked && options?.onLocked) {
          options.onLocked();
          return;
        }
        onSelect(path);
      }}
    >
      <span className="folder-nav-item-accent" aria-hidden="true" />
      <span className={`folder-nav-icon folder-nav-icon--${kind}`}>
        <FolderIcon kind={kind} />
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
  hasAddon,
}: FolderNavProps) {
  const sorted = sortFolders(folders);
  const primary = sorted.filter((f) => resolveFolderKind(f) !== "other");
  const other = sorted.filter((f) => resolveFolderKind(f) === "other");
  const industryNav = verticalNavFor(businessVertical);
  const showLegalTools = businessVertical === "legal";

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
        onClick={() => onSelect(folder.path)}
      >
        <span className="folder-nav-item-accent" aria-hidden="true" />
        <span className={`folder-nav-icon folder-nav-icon--${kind}`}>
          <FolderIcon kind={kind} />
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
      onLocked: () => onOpenAddons(slug),
    });
  };

  return (
    <nav className="folder-nav" aria-label="Mail folders">
      <div className="folder-nav-group folder-nav-group--compose">
        <button type="button" className="folder-nav-item folder-nav-item--compose" onClick={onCompose}>
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--compose">
            <FolderIcon kind="compose" />
          </span>
          <span className="folder-nav-label">New mail</span>
        </button>
      </div>

      <p className="folder-nav-heading">Mailboxes</p>
      <div className="folder-nav-group">
        {primary.map(renderItem)}
        {renderSpecialItem("contacts", "Contacts", VIEW_CONTACTS, activeFolder, onSelect)}
        {renderSpecialItem("documents", "Documents", VIEW_DOCUMENTS, activeFolder, onSelect)}
      </div>

      <p className="folder-nav-heading folder-nav-heading--secondary">Platform tools</p>
      <div className="folder-nav-group">
        {WORKSPACE_NAV.map((item) => renderTool(item.view, item.label, item.kind))}
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
      ) : !showLegalTools ? (
        <p className="folder-nav-hint">Choose your industry workspace in Add-ons to unlock vertical tools.</p>
      ) : null}

      <p className="folder-nav-heading folder-nav-heading--secondary">Folders</p>
      <div className="folder-nav-group">
        <button
          type="button"
          className="folder-nav-item folder-nav-item--new_folder"
          onClick={onNewFolder}
        >
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--new_folder">
            <FolderIcon kind="new_folder" />
          </span>
          <span className="folder-nav-label">New folder</span>
        </button>
      </div>

      <p className="folder-nav-heading folder-nav-heading--secondary">Marketplace</p>
      <div className="folder-nav-group">
        <button type="button" className="folder-nav-item folder-nav-item--addons" onClick={() => onOpenAddons()}>
          <span className="folder-nav-item-accent" aria-hidden="true" />
          <span className="folder-nav-icon folder-nav-icon--addons">
            <FolderIcon kind="addons" />
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
    </nav>
  );
}
