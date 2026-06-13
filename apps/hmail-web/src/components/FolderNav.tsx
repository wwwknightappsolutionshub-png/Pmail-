import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { MailFolder } from "../types/mail";
import { PHASE_1_NAV, PHASE_2_NAV, toolAddonSlug } from "../constants/addonTools";
import { VIEW_CONTACTS } from "../constants/mailViews";
import "./FolderNav.css";

export type FolderKind =
  | "compose"
  | "inbox"
  | "drafts"
  | "sent"
  | "trash"
  | "contacts"
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
  onSelect: (path: string) => void;
  onNewFolder: () => void;
  onCompose: () => void;
  onOpenAddons: (highlightSlug?: string) => void;
  hasAddon: (slug: string) => boolean;
}

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function CollapsibleNavSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`folder-nav-section ${open ? "is-open" : "is-collapsed"}`}>
      <button
        type="button"
        className="folder-nav-section-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`folder-nav-section-${id}`}
      >
        <span className="folder-nav-heading folder-nav-heading--secondary">{title}</span>
        <span className="folder-nav-section-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div id={`folder-nav-section-${id}`} className="folder-nav-section-body">
          {children}
        </div>
      ) : null}
    </div>
  );
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
  onSelect,
  onNewFolder,
  onCompose,
  onOpenAddons,
  hasAddon,
}: FolderNavProps) {
  const sorted = sortFolders(folders);
  const primary = sorted.filter((f) => resolveFolderKind(f) !== "other");
  const other = sorted.filter((f) => resolveFolderKind(f) === "other");

  const phase1Views = useMemo(() => new Set(PHASE_1_NAV.map((item) => item.view)), []);
  const phase2Views = useMemo(() => new Set(PHASE_2_NAV.map((item) => item.view)), []);

  const [practiceOpen, setPracticeOpen] = useState(() => {
    if (phase1Views.has(activeFolder)) return true;
    return !isMobileViewport();
  });
  const [irccOpen, setIrccOpen] = useState(() => {
    if (phase2Views.has(activeFolder)) return true;
    return !isMobileViewport();
  });

  useEffect(() => {
    if (phase1Views.has(activeFolder)) setPracticeOpen(true);
    if (phase2Views.has(activeFolder)) setIrccOpen(true);
  }, [activeFolder, phase1Views, phase2Views]);

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
      </div>

      <CollapsibleNavSection
        id="practice"
        title="Practice tools"
        open={practiceOpen}
        onToggle={() => setPracticeOpen((prev) => !prev)}
      >
        <div className="folder-nav-group">
          {PHASE_1_NAV.map((item) => renderTool(item.view, item.label, item.kind))}
        </div>
      </CollapsibleNavSection>

      <CollapsibleNavSection
        id="ircc"
        title="IRCC tools"
        open={irccOpen}
        onToggle={() => setIrccOpen((prev) => !prev)}
      >
        <div className="folder-nav-group">
          {PHASE_2_NAV.map((item) => renderTool(item.view, item.label, item.kind))}
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
      </CollapsibleNavSection>

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
          <p className="folder-nav-heading folder-nav-heading--secondary">Folders</p>
          <div className="folder-nav-group">{other.map(renderItem)}</div>
        </>
      ) : null}
    </nav>
  );
}
