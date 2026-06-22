import { BespokeMailDemo } from "@hostnet-demo/components/demo/BespokeMailDemo";
import "@hostnet-demo/components/demo/BespokeMailDemo.css";
import { getBespokeMailDemo } from "@hostnet-demo/data/bespokeMailDemoData";
import {
  ClientEntitiesPanel,
  DocumentIntakePanel,
  FilingCalendarPanel,
  SecureExchangePanel,
} from "../components/AccountingPanels";
import {
  ClientWorkspacesPanel,
  ProjectTrackerPanel,
  ProposalDeskPanel,
  SlaMonitorPanel,
} from "../components/B2bPanels";
import {
  AppointmentDeskPanel,
  HipaaAuditPanel,
  PatientRegistryPanel,
  ReferralTrackerPanel,
} from "../components/HealthcarePanels";
import {
  BulkOutreachPanel,
  InterviewDeskPanel,
  RolePipelinePanel,
  TalentSearchPanel,
} from "../components/RecruitmentPanels";
import {
  DealRoomPanel,
  ListingBoardPanel,
  QuickRepliesPanel,
  ShowingSchedulerPanel,
} from "../components/RealEstatePanels";
import type { BusinessVertical } from "../types/mail";
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
  standard: "accounting",
  "free-basic": "accounting",
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
};

export function VerticalBespokeMailDemoPage({
  businessVertical,
  userName,
  userEmail,
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
}: VerticalBespokeMailDemoPageProps) {
  const demoId = VERTICAL_DEMO_IDS[businessVertical ?? "legal"] ?? "legal";
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
        addonsHref="/addons"
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
        hideIndustryTools={hideIndustryTools}
        workspaceToolsGated={workspaceToolsGated}
        onStartAddonSubscription={onStartAddonSubscription}
        onMailToPdfExport={onMailToPdfExport}
        onWhatsappSend={onWhatsappSend}
        organizationUsers={organizationUsers}
        onLogout={onLogout}
        onReferFriend={onReferFriend}
        renderIndustryTool={({ demo: currentDemo, toolId, applyComposeTemplate }) => {
          if (currentDemo.useCaseId === "accounting") {
            if (toolId === "intake") return <DocumentIntakePanel />;
            if (toolId === "deadlines") return <FilingCalendarPanel />;
            if (toolId === "secure") return <SecureExchangePanel onUseTemplate={applyComposeTemplate} />;
            if (toolId === "clients") return <ClientEntitiesPanel />;
          }

          if (currentDemo.useCaseId === "real-estate") {
            if (toolId === "listings") return <ListingBoardPanel />;
            if (toolId === "showings") return <ShowingSchedulerPanel />;
            if (toolId === "templates") return <QuickRepliesPanel onUseTemplate={applyComposeTemplate} />;
            if (toolId === "team") return <DealRoomPanel />;
          }

          if (currentDemo.useCaseId === "recruitment") {
            if (toolId === "pipeline") return <RolePipelinePanel />;
            if (toolId === "schedule") return <InterviewDeskPanel />;
            if (toolId === "outreach") return <BulkOutreachPanel onUseTemplate={applyComposeTemplate} />;
            if (toolId === "search") return <TalentSearchPanel />;
          }

          if (currentDemo.useCaseId === "b2b-services") {
            if (toolId === "workspaces") return <ClientWorkspacesPanel />;
            if (toolId === "projects") return <ProjectTrackerPanel />;
            if (toolId === "proposals") return <ProposalDeskPanel onUseTemplate={applyComposeTemplate} />;
            if (toolId === "sla") return <SlaMonitorPanel />;
          }

          if (currentDemo.useCaseId === "healthcare") {
            if (toolId === "patients") return <PatientRegistryPanel />;
            if (toolId === "appointments") return <AppointmentDeskPanel />;
            if (toolId === "referrals") return <ReferralTrackerPanel onUseTemplate={applyComposeTemplate} />;
            if (toolId === "compliance") return <HipaaAuditPanel />;
          }

          return null;
        }}
      />
    </div>
  );
}
