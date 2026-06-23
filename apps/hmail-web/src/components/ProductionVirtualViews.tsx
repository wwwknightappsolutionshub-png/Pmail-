import type { ReactNode } from "react";
import {
  ClientEntitiesPanel,
  DocumentIntakePanel,
  FilingCalendarPanel,
  SecureExchangePanel,
} from "./AccountingPanels";
import {
  ClientWorkspacesPanel,
  ProjectTrackerPanel,
  ProposalDeskPanel,
  SlaMonitorPanel,
} from "./B2bPanels";
import type { ComposeInitial } from "./ComposeModal";
import type { ComposeTemplateHandoff } from "../types/composeTemplate";
import { composeTemplateNotice } from "../types/composeTemplate";
import { DocumentsPanel } from "./DocumentsPanel";
import {
  CaseLinkedPanel,
  ChecklistsPanel,
  ClientPortalPanel,
  CompliancePanel,
  DeadlinesPanel,
  ImmigrationDeskPanel,
  IrccIntelPanel,
  ScheduledPanelFeature,
  TemplatesPanel,
} from "./FeaturePanels";
import {
  AppointmentDeskPanel,
  HipaaAuditPanel,
  PatientRegistryPanel,
  ReferralTrackerPanel,
} from "./HealthcarePanels";
import { ProviderSettingsPanel } from "./ProviderSettingsPanel";
import {
  BulkOutreachPanel,
  InterviewDeskPanel,
  RolePipelinePanel,
  TalentSearchPanel,
} from "./RecruitmentPanels";
import {
  DealRoomPanel,
  ListingBoardPanel,
  QuickRepliesPanel,
  ShowingSchedulerPanel,
} from "./RealEstatePanels";
import { AutoReplyPanel } from "./AutoReplyPanel";
import {
  CalendarPanel,
  ComposeSettingsPanel,
  AttachmentCategorizePanel,
  EmailSlaPanel,
  EsignPanel,
  FileVaultPanel,
  InboxCleanupPanel,
  IndustryToolsPanel,
  Mail2PdfPanel,
  OpenTrackingPanel,
  WorkspaceCrmPanel,
  WorkspaceRemindersPanel,
} from "./WorkspacePanels";
import {
  VIEW_AC_CLIENT_ENTITIES,
  VIEW_AC_DOCUMENT_INTAKE,
  VIEW_AC_FILING_CALENDAR,
  VIEW_AC_SECURE_EXCHANGE,
  VIEW_AUTO_REPLY_FUNCTIONALITY,
  VIEW_AUTO_RESPONSE,
  VIEW_B2B_CLIENT_WORKSPACES,
  VIEW_B2B_PROJECT_TRACKER,
  VIEW_B2B_PROPOSAL_DESK,
  VIEW_B2B_SLA_MONITOR,
  VIEW_CALENDAR,
  VIEW_CASE_LINKED,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_COMPOSE_SETTINGS,
  VIEW_CONTACTS,
  VIEW_DEADLINES,
  VIEW_DESK,
  VIEW_DOCUMENTS,
  VIEW_HC_APPOINTMENT_DESK,
  VIEW_HC_HIPAA_AUDIT,
  VIEW_HC_PATIENT_REGISTRY,
  VIEW_HC_REFERRAL_TRACKER,
  VIEW_INDUSTRY_TOOLS,
  VIEW_IRCC_INTEL,
  VIEW_OPEN_TRACKING,
  VIEW_FILE_VAULT,
  VIEW_INBOX_CLEANUP,
  VIEW_ATTACHMENT_CATEGORIZE,
  VIEW_ESIGN,
  VIEW_EMAIL_SLA,
  VIEW_MAIL2PDF,
  VIEW_JOB_HUNTER_SETTINGS,
  VIEW_CAREER_SCANNER,
  VIEW_PORTAL,
  VIEW_PROVIDER_SETTINGS,
  VIEW_RC_BULK_OUTREACH,
  VIEW_RC_INTERVIEW_DESK,
  VIEW_RC_ROLE_PIPELINE,
  VIEW_RC_TALENT_SEARCH,
  VIEW_RE_DEAL_ROOM,
  VIEW_RE_LISTING_BOARD,
  VIEW_RE_QUICK_REPLIES,
  VIEW_RE_SHOWING_SCHEDULER,
  VIEW_SCHEDULED,
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
} from "../constants/mailViews";
import type { BusinessVertical } from "../types/mail";
import { JobHunterPanel } from "./JobHunterPanel";
import { CareerScannerPanel, type CareerScannerPreload } from "./CareerScannerPanel";
import { ContactsPanel } from "./ContactsPanel";

export type VirtualViewContext = {
  renderGatedView: (view: string, panel: ReactNode) => ReactNode;
  openCompose: (initial?: ComposeInitial) => void;
  contactsPrefillEmail?: string;
  onContactsMessage?: (message: string) => void;
  inboxPath?: string;
  onOpenMessage?: (folder: string, uid: number) => void;
  businessVertical?: BusinessVertical | null;
  onSelectView?: (view: string) => void;
  careerScannerPreload?: CareerScannerPreload | null;
  onCareerScannerPreloadConsumed?: () => void;
  onComposeTemplateApplied?: (message: string) => void;
  jobHunterEnabled?: boolean;
};

export function renderProductionVirtualView(
  activeFolder: string,
  ctx: VirtualViewContext,
): ReactNode | null {
  const { renderGatedView, openCompose } = ctx;
  const applyTemplate = (template: ComposeTemplateHandoff) => {
    openCompose({ mode: "new", subject: template.subject, html: template.html });
    ctx.onComposeTemplateApplied?.(composeTemplateNotice(template));
  };

  if (activeFolder === VIEW_SCHEDULED) {
    return renderGatedView(activeFolder, <ScheduledPanelFeature />);
  }
  if (activeFolder === VIEW_AUTO_RESPONSE) {
    return renderGatedView(activeFolder, <TemplatesPanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_DESK) {
    return renderGatedView(activeFolder, <ImmigrationDeskPanel />);
  }
  if (activeFolder === VIEW_CHECKLISTS) {
    return renderGatedView(activeFolder, <ChecklistsPanel />);
  }
  if (activeFolder === VIEW_COMPLIANCE) {
    return renderGatedView(activeFolder, <CompliancePanel />);
  }
  if (activeFolder === VIEW_IRCC_INTEL) {
    return renderGatedView(activeFolder, <IrccIntelPanel />);
  }
  if (activeFolder === VIEW_CASE_LINKED) {
    return renderGatedView(activeFolder, <CaseLinkedPanel />);
  }
  if (activeFolder === VIEW_DEADLINES) {
    return renderGatedView(activeFolder, <DeadlinesPanel />);
  }
  if (activeFolder === VIEW_PORTAL) {
    return renderGatedView(activeFolder, <ClientPortalPanel />);
  }
  if (activeFolder === VIEW_CONTACTS) {
    return (
      <ContactsPanel
        initialEmail={ctx.contactsPrefillEmail}
        onMessage={(message) => ctx.onContactsMessage?.(message)}
      />
    );
  }
  if (activeFolder === VIEW_DOCUMENTS) {
    return (
      <DocumentsPanel
        inboxPath={ctx.inboxPath}
        onOpenMessage={(folder, uid) => ctx.onOpenMessage?.(folder, uid)}
        jobHunterEnabled={ctx.jobHunterEnabled}
      />
    );
  }
  if (activeFolder === VIEW_WORKSPACE_CRM) {
    return renderGatedView(activeFolder, <WorkspaceCrmPanel />);
  }
  if (activeFolder === VIEW_WORKSPACE_REMINDERS) {
    return renderGatedView(activeFolder, <WorkspaceRemindersPanel />);
  }
  if (activeFolder === VIEW_CALENDAR) {
    return renderGatedView(activeFolder, <CalendarPanel />);
  }
  if (activeFolder === VIEW_INDUSTRY_TOOLS) {
    return renderGatedView(
      activeFolder,
      <IndustryToolsPanel businessVertical={ctx.businessVertical} onSelectView={ctx.onSelectView} />,
    );
  }
  if (activeFolder === VIEW_OPEN_TRACKING) {
    return renderGatedView(activeFolder, <OpenTrackingPanel />);
  }
  if (activeFolder === VIEW_FILE_VAULT) {
    return renderGatedView(activeFolder, <FileVaultPanel />);
  }
  if (activeFolder === VIEW_INBOX_CLEANUP) {
    return renderGatedView(activeFolder, <InboxCleanupPanel />);
  }
  if (activeFolder === VIEW_ATTACHMENT_CATEGORIZE) {
    return renderGatedView(activeFolder, <AttachmentCategorizePanel />);
  }
  if (activeFolder === VIEW_ESIGN) {
    return renderGatedView(
      activeFolder,
      <EsignPanel
        onComposeHandoff={(handoff) =>
          openCompose({ mode: "new", to: handoff.to, subject: handoff.subject, html: handoff.html, text: handoff.text })
        }
      />,
    );
  }
  if (activeFolder === VIEW_EMAIL_SLA) {
    return renderGatedView(
      activeFolder,
      <EmailSlaPanel
        onComposeHandoff={(handoff) =>
          openCompose({
            mode: handoff.mode ?? "reply",
            to: handoff.to,
            subject: handoff.subject,
            inReplyTo: handoff.inReplyTo,
            references: handoff.references,
          })
        }
      />,
    );
  }
  if (activeFolder === VIEW_MAIL2PDF) {
    return renderGatedView(activeFolder, <Mail2PdfPanel />);
  }
  if (activeFolder === VIEW_JOB_HUNTER_SETTINGS) {
    return renderGatedView(activeFolder, <JobHunterPanel />);
  }
  if (activeFolder === VIEW_CAREER_SCANNER) {
    return renderGatedView(
      activeFolder,
      <CareerScannerPanel
        preload={ctx.careerScannerPreload}
        onPreloadConsumed={ctx.onCareerScannerPreloadConsumed}
      />,
    );
  }
  if (activeFolder === VIEW_PROVIDER_SETTINGS) {
    return <ProviderSettingsPanel />;
  }
  if (activeFolder === VIEW_COMPOSE_SETTINGS) {
    return <ComposeSettingsPanel />;
  }
  if (activeFolder === VIEW_AUTO_REPLY_FUNCTIONALITY) {
    return renderGatedView(activeFolder, <AutoReplyPanel />);
  }
  if (activeFolder === VIEW_RE_LISTING_BOARD) {
    return renderGatedView(activeFolder, <ListingBoardPanel />);
  }
  if (activeFolder === VIEW_RE_SHOWING_SCHEDULER) {
    return renderGatedView(activeFolder, <ShowingSchedulerPanel />);
  }
  if (activeFolder === VIEW_RE_QUICK_REPLIES) {
    return renderGatedView(activeFolder, <QuickRepliesPanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_RE_DEAL_ROOM) {
    return renderGatedView(activeFolder, <DealRoomPanel />);
  }
  if (activeFolder === VIEW_AC_DOCUMENT_INTAKE) {
    return renderGatedView(activeFolder, <DocumentIntakePanel />);
  }
  if (activeFolder === VIEW_AC_FILING_CALENDAR) {
    return renderGatedView(activeFolder, <FilingCalendarPanel />);
  }
  if (activeFolder === VIEW_AC_SECURE_EXCHANGE) {
    return renderGatedView(activeFolder, <SecureExchangePanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_AC_CLIENT_ENTITIES) {
    return renderGatedView(activeFolder, <ClientEntitiesPanel />);
  }
  if (activeFolder === VIEW_RC_ROLE_PIPELINE) {
    return renderGatedView(activeFolder, <RolePipelinePanel />);
  }
  if (activeFolder === VIEW_RC_INTERVIEW_DESK) {
    return renderGatedView(activeFolder, <InterviewDeskPanel />);
  }
  if (activeFolder === VIEW_RC_BULK_OUTREACH) {
    return renderGatedView(activeFolder, <BulkOutreachPanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_RC_TALENT_SEARCH) {
    return renderGatedView(activeFolder, <TalentSearchPanel />);
  }
  if (activeFolder === VIEW_B2B_CLIENT_WORKSPACES) {
    return renderGatedView(activeFolder, <ClientWorkspacesPanel />);
  }
  if (activeFolder === VIEW_B2B_PROJECT_TRACKER) {
    return renderGatedView(activeFolder, <ProjectTrackerPanel />);
  }
  if (activeFolder === VIEW_B2B_PROPOSAL_DESK) {
    return renderGatedView(activeFolder, <ProposalDeskPanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_B2B_SLA_MONITOR) {
    return renderGatedView(activeFolder, <SlaMonitorPanel />);
  }
  if (activeFolder === VIEW_HC_PATIENT_REGISTRY) {
    return renderGatedView(activeFolder, <PatientRegistryPanel />);
  }
  if (activeFolder === VIEW_HC_APPOINTMENT_DESK) {
    return renderGatedView(activeFolder, <AppointmentDeskPanel />);
  }
  if (activeFolder === VIEW_HC_REFERRAL_TRACKER) {
    return renderGatedView(activeFolder, <ReferralTrackerPanel onUseTemplate={applyTemplate} />);
  }
  if (activeFolder === VIEW_HC_HIPAA_AUDIT) {
    return renderGatedView(activeFolder, <HipaaAuditPanel />);
  }

  return null;
}
