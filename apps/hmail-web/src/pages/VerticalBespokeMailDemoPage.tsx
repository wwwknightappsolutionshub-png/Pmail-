import { createPortal } from "react-dom";
import { BespokeMailDemo, type BespokeWorkspace } from "@hostnet-demo/components/demo/BespokeMailDemo";
import "@hostnet-demo/components/demo/BespokeMailDemo.css";
import { getBespokeMailDemo } from "@hostnet-demo/data/bespokeMailDemoData";
import type { BusinessVertical } from "../types/mail";
import type { ReactNode } from "react";
import { useAddons } from "../context/AddonContext";
import { shouldHideVerticalIndustryRibbon } from "../utils/verticalIndustryRibbon";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { HMailLogo } from "../components/HMailLogo";
import { LazyIndustryToolPanel } from "../components/industryTools/LazyIndustryToolPanel";
import "./VerticalBespokeMailDemoPage.css";

type AutoReplyEntitlementState = {
  entitled: boolean;
  daysLeft: number;
  gated: boolean;
};

type LiveComposeSettings = {
  autoReplyEnabled: boolean;
  activeAutoReplyId: string | null;
  autoReplies: Array<{ id: string; name: string; subject: string; body: string; enabled?: boolean }>;
  autoReplyEntitlement: AutoReplyEntitlementState & {
    complimentaryActive: boolean;
    subscribed: boolean;
    complimentaryEndsAt: string | null;
    upsellDue: boolean;
  };
};

const VERTICAL_DEMO_IDS: Record<BusinessVertical, string> = {
  standard: "platform",
  "free-basic": "platform",
  legal: "legal",
  "real-estate": "real-estate",
  accounting: "accounting",
  recruitment: "recruitment",
  "b2b-services": "b2b-services",
  healthcare: "healthcare",
};

type VerticalBespokeMailDemoPageProps = {
  businessVertical: BusinessVertical | null | undefined;
  userName?: string;
  userEmail?: string;
  viewerAvatarUrl?: string | null;
  calendarEnterpriseEnabled?: boolean;
  whatsappEnabled?: boolean;
  mailToPdfEnabled?: boolean;
  uiThemeVersion?: "dark" | "light";
  platformNotice?: string;
  onThemeChange?: (theme: "dark" | "light") => void | Promise<void>;
  hideIndustryTools?: boolean;
  workspaceToolsGated?: boolean;
  onStartAddonSubscription?: (slug: string) => void | Promise<void>;
  onMailToPdfExport?: (payload: {
    subject: string;
    from: string;
    to: string;
    date?: string;
    body: string;
    cc?: string;
    attachments?: string[];
  }) => void | Promise<void>;
  onWhatsappSend?: (payload: { toPhone: string; body: string; subject?: string }) => void | Promise<void>;
  organizationUsers?: Array<{ id: string; email: string; displayName: string }>;
  onLogout?: () => void;
  onReferFriend?: () => Promise<{ rewardToast: string | null; message?: string }>;
  liveComposeSettings?: LiveComposeSettings | null;
  onAutoReplySettingsPersist?: (payload: { autoReplyOn: boolean; activeAutoReplyId: string }) => void | Promise<void>;
  onAutoReplyTemplateSave?: (payload: {
    mode: "create" | "update";
    id?: string;
    name: string;
    subject: string;
    body: string;
  }) => void | Promise<{ id?: string } | void>;
  renderTopbarSearch?: ReactNode;
  renderTopbarBrand?: ReactNode;
  renderInboxWorkspace?: ReactNode;
  renderWorkspace?: (workspace: BespokeWorkspace) => ReactNode | null;
  showCareerTab?: boolean;
  onCareerTabClick?: () => void;
  forcedWorkspace?: BespokeWorkspace;
  onWorkspaceTabNavigate?: (workspace: BespokeWorkspace) => void;
  requestedWorkspace?: BespokeWorkspace | null;
  onRequestedWorkspaceHandled?: () => void;
  onApplyComposeTemplate?: (template: { subject: string; html: string; label?: string }) => void;
  mailWorkspaceViews?: Partial<Record<"contacts" | "crm" | "reminders" | "calendar", string>>;
  activeMailWorkspaceView?: string | null;
  onMailWorkspaceView?: (view: string | null) => void;
  onLeaveMailSearch?: () => void;
  mobileTopbarSearchCollapsed?: boolean;
  workspaceTabCounts?: {
    contacts: number;
    reminders: number;
    calendar: number;
    messaging: number;
  } | null;
  renderMobileFooterNav?: ReactNode;
  onOpenAddons?: () => void;
};

export function VerticalBespokeMailDemoPage({
  businessVertical,
  userName,
  userEmail,
  viewerAvatarUrl,
  calendarEnterpriseEnabled,
  whatsappEnabled,
  mailToPdfEnabled,
  uiThemeVersion = "dark",
  platformNotice,
  onThemeChange,
  hideIndustryTools,
  workspaceToolsGated,
  onStartAddonSubscription,
  onMailToPdfExport,
  onWhatsappSend,
  organizationUsers,
  onLogout,
  onReferFriend,
  liveComposeSettings,
  onAutoReplySettingsPersist,
  onAutoReplyTemplateSave,
  renderTopbarSearch,
  renderTopbarBrand,
  renderInboxWorkspace,
  renderWorkspace,
  showCareerTab,
  onCareerTabClick,
  forcedWorkspace,
  onWorkspaceTabNavigate,
  requestedWorkspace,
  onRequestedWorkspaceHandled,
  onApplyComposeTemplate,
  mailWorkspaceViews,
  activeMailWorkspaceView,
  onMailWorkspaceView,
  onLeaveMailSearch,
  mobileTopbarSearchCollapsed = false,
  workspaceTabCounts = null,
  renderMobileFooterNav,
  onOpenAddons,
}: VerticalBespokeMailDemoPageProps) {
  const { hasAddon } = useAddons();
  const resolvedHideIndustryTools =
    hideIndustryTools ?? shouldHideVerticalIndustryRibbon(businessVertical, hasAddon);
  const demoId = VERTICAL_DEMO_IDS[businessVertical ?? "standard"] ?? "platform";
  const demo = getBespokeMailDemo(demoId);

  if (!demo) {
    return (
      <div className="pmail-demo-shell pmail-demo-shell--missing">
        <p>Demo workspace unavailable.</p>
      </div>
    );
  }

  return (
    <div className={`pmail-demo-shell ${uiThemeVersion === "light" ? "pmail-demo-shell--light" : ""}`}>
      <BespokeMailDemo
        demo={demo}
        viewerName={userName}
        viewerEmail={userEmail}
        viewerAvatarUrl={viewerAvatarUrl}
        addonsHref="/addons"
        onOpenAddons={onOpenAddons}
        calendarEnterpriseEnabled={calendarEnterpriseEnabled}
        whatsappEnabled={whatsappEnabled}
        mailToPdfEnabled={mailToPdfEnabled}
        autoReplyEntitlement={
          liveComposeSettings
            ? {
                entitled: liveComposeSettings.autoReplyEntitlement.entitled,
                daysLeft: liveComposeSettings.autoReplyEntitlement.daysLeft,
                gated: liveComposeSettings.autoReplyEntitlement.gated,
              }
            : undefined
        }
        liveComposeSettings={
          liveComposeSettings
            ? {
                autoReplyEnabled: liveComposeSettings.autoReplyEnabled,
                activeAutoReplyId: liveComposeSettings.activeAutoReplyId,
                autoReplies: liveComposeSettings.autoReplies,
              }
            : undefined
        }
        onAutoReplySettingsPersist={onAutoReplySettingsPersist}
        onAutoReplyTemplateSave={onAutoReplyTemplateSave}
        uiThemeVersion={uiThemeVersion}
        platformNotice={platformNotice}
        onThemeChange={onThemeChange}
        hideIndustryTools={resolvedHideIndustryTools}
        workspaceToolsGated={workspaceToolsGated}
        onStartAddonSubscription={onStartAddonSubscription}
        onMailToPdfExport={onMailToPdfExport}
        onWhatsappSend={onWhatsappSend}
        organizationUsers={organizationUsers}
        onLogout={onLogout}
        onReferFriend={onReferFriend}
        renderTopbarSearch={renderTopbarSearch}
        renderTopbarBrand={renderTopbarBrand ?? <HMailLogo size="sm" className="bespoke-demo-topbar-logo" />}
        renderInboxWorkspace={renderInboxWorkspace}
        renderWorkspace={renderWorkspace}
        showCareerTab={showCareerTab}
        onCareerTabClick={onCareerTabClick}
        forcedWorkspace={forcedWorkspace}
        onWorkspaceTabNavigate={onWorkspaceTabNavigate}
        requestedWorkspace={requestedWorkspace}
        onRequestedWorkspaceHandled={onRequestedWorkspaceHandled}
        onApplyComposeTemplate={onApplyComposeTemplate}
        mailWorkspaceViews={mailWorkspaceViews}
        activeMailWorkspaceView={activeMailWorkspaceView}
        onMailWorkspaceView={onMailWorkspaceView}
        onLeaveMailSearch={onLeaveMailSearch}
        mobileTopbarSearchCollapsed={mobileTopbarSearchCollapsed}
        workspaceTabCounts={workspaceTabCounts}
        renderLoading={<PmailLoadingScreen subtitle="Loading your workspace…" />}
        renderIndustryTool={({ demo: currentDemo, toolId, applyComposeTemplate }) => (
          <LazyIndustryToolPanel
            useCaseId={currentDemo.useCaseId}
            toolId={toolId}
            applyComposeTemplate={applyComposeTemplate}
          />
        )}
      />
      {renderMobileFooterNav
        ? createPortal(
            <div
              className={`pmail-shell-mobile-footer${
                uiThemeVersion === "light" ? " pmail-shell-mobile-footer--light" : ""
              }`}
            >
              {renderMobileFooterNav}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
