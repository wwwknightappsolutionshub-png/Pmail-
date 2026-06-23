import type { ReactNode } from "react";
import type { BespokeWorkspace } from "@hostnet-demo/components/demo/BespokeMailDemo";
import { AddonUpsellPanel } from "./AddonUpsellPanel";
import type { PanelWorkspaceTrialStatus } from "../types/addon";
import { ContactsPanel } from "./ContactsPanel";
import { JobHunterPanel } from "./JobHunterPanel";
import { ProductionWorkspaceFrame } from "./ProductionWorkspaceFrame";
import { ProviderSettingsPanel } from "./ProviderSettingsPanel";
import { PwaPushSettings } from "./PwaPushSettings";
import { CalendarPanel, ComposeSettingsPanel, WorkspaceCrmPanel, WorkspaceRemindersPanel } from "./WorkspacePanels";
import { toolAddonSlug } from "../constants/addonTools";
import { virtualViewTitle, VIEW_CALENDAR, VIEW_CONTACTS, VIEW_JOB_HUNTER_SETTINGS, VIEW_WORKSPACE_CRM, VIEW_WORKSPACE_REMINDERS } from "../constants/mailViews";

const WORKSPACE_ADDON_COPY: Record<string, { name: string; description: string }> = {
  "bespoke-workspace": {
    name: "Bespoke Workspace",
    description: "CRM pipeline, reminders, and industry tools in one workspace.",
  },
  "full-calendar-functionality": {
    name: "Full Calendar",
    description: "Month and week calendar views with workspace events.",
  },
  "job-hunter-functionality": {
    name: "Job Hunter",
    description: "Career tools, CV scanner, and application tracking.",
  },
};

export type BespokeProductionWorkspaceContext = {
  hasAddon: (slug: string) => boolean;
  panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null;
  onWorkspaceMessage?: (message: string) => void;
};

function renderGatedView(
  view: string,
  hasAddon: (slug: string) => boolean,
  panel: ReactNode,
  panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null,
): ReactNode {
  const slug = toolAddonSlug(view);
  if (slug && !hasAddon(slug)) {
    const copy = WORKSPACE_ADDON_COPY[slug];
    return (
      <AddonUpsellPanel
        addonSlug={slug}
        addonName={copy?.name ?? "Add-on"}
        description={copy?.description ?? "Subscribe from the Add-ons marketplace to unlock this tool."}
        panelWorkspaceTrial={panelWorkspaceTrial}
      />
    );
  }
  return panel;
}

function renderFramedWorkspace(
  view: string,
  hasAddon: (slug: string) => boolean,
  panel: ReactNode,
  panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null,
): ReactNode {
  return (
    <ProductionWorkspaceFrame title={virtualViewTitle(view)}>
      {renderGatedView(view, hasAddon, panel, panelWorkspaceTrial)}
    </ProductionWorkspaceFrame>
  );
}

export function renderBespokeProductionWorkspace(
  workspace: BespokeWorkspace,
  ctx: BespokeProductionWorkspaceContext,
): ReactNode | null {
  const { hasAddon, onWorkspaceMessage, panelWorkspaceTrial } = ctx;

  switch (workspace) {
    case "contacts":
      return renderFramedWorkspace(
        VIEW_CONTACTS,
        hasAddon,
        <ContactsPanel onMessage={(message) => onWorkspaceMessage?.(message)} />,
        panelWorkspaceTrial,
      );
    case "crm":
      return renderFramedWorkspace(VIEW_WORKSPACE_CRM, hasAddon, <WorkspaceCrmPanel />, panelWorkspaceTrial);
    case "reminders":
      return renderFramedWorkspace(
        VIEW_WORKSPACE_REMINDERS,
        hasAddon,
        <WorkspaceRemindersPanel />,
        panelWorkspaceTrial,
      );
    case "calendar":
      return renderFramedWorkspace(VIEW_CALENDAR, hasAddon, <CalendarPanel />, panelWorkspaceTrial);
    case "settings":
      return (
        <div className="bespoke-production-settings-stack">
          <ComposeSettingsPanel onMessage={onWorkspaceMessage} />
          <ProviderSettingsPanel />
          <PwaPushSettings />
        </div>
      );
    case "career":
      return renderGatedView(VIEW_JOB_HUNTER_SETTINGS, hasAddon, <JobHunterPanel />);
    default:
      return null;
  }
}
