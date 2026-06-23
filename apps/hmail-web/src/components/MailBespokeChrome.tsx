import { Link } from "react-router-dom";
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
import { VIEW_CONTACTS, VIEW_DOCUMENTS, isVirtualView, type MailSearchState } from "../constants/mailViews";
import { hasVerticalIndustryRibbonAccess } from "../utils/verticalIndustryRibbon";
import { GmailMailSearch } from "./GmailMailSearch";
import "./MailBespokeChrome.css";

const WORKSPACE_TAB = "__workspace__";
const CAREER_TAB = "__career__";

const PRIMARY_TABS = [
  { id: WORKSPACE_TAB, label: "Workspace" },
  { id: VIEW_CONTACTS, label: "Contacts" },
  { id: VIEW_DOCUMENTS, label: "Documents" },
  ...WORKSPACE_NAV.map((item) => ({ id: item.view, label: item.label })),
];

function industryNavFor(businessVertical?: BusinessVertical | null) {
  switch (businessVertical) {
    case "legal":
      return null;
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
    default:
      return null;
  }
}

function resolveActiveTab(activeFolder: string): string {
  if (activeFolder === CAREER_TAB) return CAREER_TAB;
  if (isVirtualView(activeFolder)) return activeFolder;
  return WORKSPACE_TAB;
}

export interface MailBespokeChromeProps {
  productName: string;
  displayName: string;
  displayEmail: string;
  activeFolder: string;
  inboxPath: string;
  businessVertical?: BusinessVertical | null;
  uiThemeVersion: "dark" | "light";
  hasAddon: (slug: string) => boolean;
  careerNavUnlocked?: boolean;
  searchDraft: MailSearchState;
  onSearchDraftChange: (next: MailSearchState) => void;
  onSearch: () => void;
  onSearchClear: () => void;
  onSelectView: (view: string) => void;
  onOpenCareer?: () => void;
  onOpenAddons: (highlightSlug?: string) => void;
  onReferFriend: () => void;
  onThemeToggle: () => void;
  referBusy?: boolean;
}

export function MailBespokeChrome({
  productName,
  displayName,
  displayEmail,
  activeFolder,
  inboxPath,
  businessVertical,
  uiThemeVersion,
  hasAddon,
  careerNavUnlocked = false,
  searchDraft,
  onSearchDraftChange,
  onSearch,
  onSearchClear,
  onSelectView,
  onOpenCareer,
  onOpenAddons,
  onReferFriend,
  onThemeToggle,
  referBusy = false,
}: MailBespokeChromeProps) {
  const activeTab = resolveActiveTab(activeFolder);
  const inMailWorkspace = activeTab === WORKSPACE_TAB;
  const industryNav = industryNavFor(businessVertical);
  const showLegalToolbar = businessVertical === "legal";
  const showIndustryToolbar =
    inMailWorkspace && hasVerticalIndustryRibbonAccess(businessVertical, hasAddon);

  const openWorkspace = () => {
    onSelectView(inboxPath || "INBOX");
  };

  const renderToolChip = (view: string, label: string, locked: boolean) => {
    const active = activeFolder === view;
    return (
      <button
        key={view}
        type="button"
        className={`bespoke-prod-tool-chip ${active ? "bespoke-prod-tool-chip--active" : ""} ${locked ? "bespoke-prod-tool-chip--locked" : ""}`}
        onClick={() => (locked ? onOpenAddons(toolAddonSlug(view) ?? "") : onSelectView(view))}
      >
        <strong>{label}</strong>
        <small>{locked ? "Add-on required" : "Open tool"}</small>
      </button>
    );
  };

  return (
    <>
      <header className="bespoke-prod-topbar">
        <div className="bespoke-prod-topbar-left">
          <div>
            <p className="bespoke-prod-kicker">{productName} Workspace</p>
            <strong className="bespoke-prod-brand">Welcome back, {displayName}</strong>
          </div>
        </div>
        <div className="bespoke-prod-topbar-center">
          <GmailMailSearch
            value={searchDraft}
            onChange={onSearchDraftChange}
            onSearch={onSearch}
            onClear={onSearchClear}
          />
        </div>
        <div className="bespoke-prod-topbar-right">
          <button type="button" className="bespoke-prod-ghost-btn" disabled={referBusy} onClick={onReferFriend}>
            {referBusy ? "Sending…" : "Refer a friend"}
          </button>
          <Link to="/addons" className="bespoke-prod-ghost-btn">
            View add-ons
          </Link>
          <button type="button" className="bespoke-prod-ghost-btn" onClick={onThemeToggle}>
            {uiThemeVersion === "light" ? "Dark UI" : "Light UI"}
          </button>
          <span className="bespoke-prod-user" title={displayEmail}>
            {displayName} &lt;{displayEmail}&gt;
          </span>
        </div>
      </header>

      <nav className="bespoke-prod-tabs" aria-label="Workspace areas">
        {PRIMARY_TABS.map((tab) => {
          const slug = tab.id === WORKSPACE_TAB ? "" : toolAddonSlug(tab.id) ?? "";
          const locked = slug ? !hasAddon(slug) : false;
          return (
            <button
              key={tab.id}
              type="button"
              className={`bespoke-prod-tab ${activeTab === tab.id ? "bespoke-prod-tab--active" : ""}`}
              onClick={() => {
                if (tab.id === WORKSPACE_TAB) {
                  openWorkspace();
                  return;
                }
                if (locked) {
                  onOpenAddons(slug);
                  return;
                }
                onSelectView(tab.id);
              }}
            >
              {tab.label}
              {locked ? " ·" : ""}
            </button>
          );
        })}
        {careerNavUnlocked && onOpenCareer ? (
          <button
            type="button"
            className={`bespoke-prod-tab ${activeTab === CAREER_TAB ? "bespoke-prod-tab--active" : ""}`}
            onClick={onOpenCareer}
          >
            Career
          </button>
        ) : null}
      </nav>

      {showIndustryToolbar ? (
        <section className="bespoke-prod-toolbar" aria-label="Industry and business vertical tools">
          <div className="bespoke-prod-toolbar-row bespoke-prod-toolbar-row--industry-only">
            <div className="bespoke-prod-toolbar-block">
              <p className="bespoke-prod-toolbar-label">
                {showLegalToolbar ? "Practice & IRCC tools" : "Industry / business vertical tools"}
              </p>
              <div className="bespoke-prod-tools-rail">
                {showLegalToolbar
                  ? [...PHASE_1_NAV, ...PHASE_2_NAV].map((item) =>
                      renderToolChip(item.view, item.label, !hasAddon(toolAddonSlug(item.view) ?? "")),
                    )
                  : industryNav?.map((item) =>
                      renderToolChip(item.view, item.label, !hasAddon(toolAddonSlug(item.view) ?? "")),
                    )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
