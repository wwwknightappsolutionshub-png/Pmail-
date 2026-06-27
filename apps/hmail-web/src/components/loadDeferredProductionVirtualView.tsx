import type { ReactNode } from "react";
import type { ComposeTemplateHandoff } from "../types/composeTemplate";
import { composeTemplateNotice } from "../types/composeTemplate";
import {
  VIEW_AC_CLIENT_ENTITIES,
  VIEW_AC_DOCUMENT_INTAKE,
  VIEW_AC_FILING_CALENDAR,
  VIEW_AC_SECURE_EXCHANGE,
  VIEW_AUTO_RESPONSE,
  VIEW_B2B_CLIENT_WORKSPACES,
  VIEW_B2B_PROJECT_TRACKER,
  VIEW_B2B_PROPOSAL_DESK,
  VIEW_B2B_SLA_MONITOR,
  VIEW_CAREER_SCANNER,
  VIEW_CASE_LINKED,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_DEADLINES,
  VIEW_DESK,
  VIEW_HC_APPOINTMENT_DESK,
  VIEW_HC_HIPAA_AUDIT,
  VIEW_HC_PATIENT_REGISTRY,
  VIEW_HC_REFERRAL_TRACKER,
  VIEW_IRCC_INTEL,
  VIEW_JOB_HUNTER_SETTINGS,
  VIEW_PORTAL,
  VIEW_RC_BULK_OUTREACH,
  VIEW_RC_INTERVIEW_DESK,
  VIEW_RC_ROLE_PIPELINE,
  VIEW_RC_TALENT_SEARCH,
  VIEW_RE_DEAL_ROOM,
  VIEW_RE_LISTING_BOARD,
  VIEW_RE_QUICK_REPLIES,
  VIEW_RE_SHOWING_SCHEDULER,
  VIEW_SCHEDULED,
} from "../constants/mailViews";
import type { VirtualViewContext } from "./ProductionVirtualViews";

export async function loadDeferredProductionVirtualView(
  activeFolder: string,
  ctx: VirtualViewContext,
): Promise<ReactNode | null> {
  const { renderGatedView, openCompose } = ctx;
  const applyTemplate = (template: ComposeTemplateHandoff) => {
    openCompose({ mode: "new", subject: template.subject, html: template.html });
    ctx.onComposeTemplateApplied?.(composeTemplateNotice(template));
  };

  if (activeFolder === VIEW_SCHEDULED || activeFolder === VIEW_AUTO_RESPONSE) {
    const panels = await import("./FeaturePanels");
    if (activeFolder === VIEW_SCHEDULED) {
      return renderGatedView(activeFolder, <panels.ScheduledPanelFeature />);
    }
    return renderGatedView(activeFolder, <panels.TemplatesPanel onUseTemplate={applyTemplate} />);
  }

  if (
    activeFolder === VIEW_DESK ||
    activeFolder === VIEW_CHECKLISTS ||
    activeFolder === VIEW_COMPLIANCE ||
    activeFolder === VIEW_IRCC_INTEL ||
    activeFolder === VIEW_CASE_LINKED ||
    activeFolder === VIEW_DEADLINES ||
    activeFolder === VIEW_PORTAL
  ) {
    const panels = await import("./FeaturePanels");
    if (activeFolder === VIEW_DESK) return renderGatedView(activeFolder, <panels.ImmigrationDeskPanel />);
    if (activeFolder === VIEW_CHECKLISTS) return renderGatedView(activeFolder, <panels.ChecklistsPanel />);
    if (activeFolder === VIEW_COMPLIANCE) return renderGatedView(activeFolder, <panels.CompliancePanel />);
    if (activeFolder === VIEW_IRCC_INTEL) return renderGatedView(activeFolder, <panels.IrccIntelPanel />);
    if (activeFolder === VIEW_CASE_LINKED) return renderGatedView(activeFolder, <panels.CaseLinkedPanel />);
    if (activeFolder === VIEW_DEADLINES) return renderGatedView(activeFolder, <panels.DeadlinesPanel />);
    return renderGatedView(activeFolder, <panels.ClientPortalPanel />);
  }

  if (activeFolder === VIEW_JOB_HUNTER_SETTINGS) {
    const { JobHunterPanel } = await import("./JobHunterPanel");
    return renderGatedView(activeFolder, <JobHunterPanel />);
  }

  if (activeFolder === VIEW_CAREER_SCANNER) {
    const { CareerScannerPanel } = await import("./CareerScannerPanel");
    return renderGatedView(
      activeFolder,
      <CareerScannerPanel
        preload={ctx.careerScannerPreload}
        onPreloadConsumed={ctx.onCareerScannerPreloadConsumed}
      />,
    );
  }

  if (
    activeFolder === VIEW_RE_LISTING_BOARD ||
    activeFolder === VIEW_RE_SHOWING_SCHEDULER ||
    activeFolder === VIEW_RE_QUICK_REPLIES ||
    activeFolder === VIEW_RE_DEAL_ROOM
  ) {
    const panels = await import("./RealEstatePanels");
    if (activeFolder === VIEW_RE_LISTING_BOARD) return renderGatedView(activeFolder, <panels.ListingBoardPanel />);
    if (activeFolder === VIEW_RE_SHOWING_SCHEDULER) {
      return renderGatedView(activeFolder, <panels.ShowingSchedulerPanel />);
    }
    if (activeFolder === VIEW_RE_QUICK_REPLIES) {
      return renderGatedView(activeFolder, <panels.QuickRepliesPanel onUseTemplate={applyTemplate} />);
    }
    return renderGatedView(activeFolder, <panels.DealRoomPanel />);
  }

  if (
    activeFolder === VIEW_AC_DOCUMENT_INTAKE ||
    activeFolder === VIEW_AC_FILING_CALENDAR ||
    activeFolder === VIEW_AC_SECURE_EXCHANGE ||
    activeFolder === VIEW_AC_CLIENT_ENTITIES
  ) {
    const panels = await import("./AccountingPanels");
    if (activeFolder === VIEW_AC_DOCUMENT_INTAKE) return renderGatedView(activeFolder, <panels.DocumentIntakePanel />);
    if (activeFolder === VIEW_AC_FILING_CALENDAR) return renderGatedView(activeFolder, <panels.FilingCalendarPanel />);
    if (activeFolder === VIEW_AC_SECURE_EXCHANGE) {
      return renderGatedView(activeFolder, <panels.SecureExchangePanel onUseTemplate={applyTemplate} />);
    }
    return renderGatedView(activeFolder, <panels.ClientEntitiesPanel />);
  }

  if (
    activeFolder === VIEW_RC_ROLE_PIPELINE ||
    activeFolder === VIEW_RC_INTERVIEW_DESK ||
    activeFolder === VIEW_RC_BULK_OUTREACH ||
    activeFolder === VIEW_RC_TALENT_SEARCH
  ) {
    const panels = await import("./RecruitmentPanels");
    if (activeFolder === VIEW_RC_ROLE_PIPELINE) return renderGatedView(activeFolder, <panels.RolePipelinePanel />);
    if (activeFolder === VIEW_RC_INTERVIEW_DESK) return renderGatedView(activeFolder, <panels.InterviewDeskPanel />);
    if (activeFolder === VIEW_RC_BULK_OUTREACH) {
      return renderGatedView(activeFolder, <panels.BulkOutreachPanel onUseTemplate={applyTemplate} />);
    }
    return renderGatedView(activeFolder, <panels.TalentSearchPanel />);
  }

  if (
    activeFolder === VIEW_B2B_CLIENT_WORKSPACES ||
    activeFolder === VIEW_B2B_PROJECT_TRACKER ||
    activeFolder === VIEW_B2B_PROPOSAL_DESK ||
    activeFolder === VIEW_B2B_SLA_MONITOR
  ) {
    const panels = await import("./B2bPanels");
    if (activeFolder === VIEW_B2B_CLIENT_WORKSPACES) {
      return renderGatedView(activeFolder, <panels.ClientWorkspacesPanel />);
    }
    if (activeFolder === VIEW_B2B_PROJECT_TRACKER) return renderGatedView(activeFolder, <panels.ProjectTrackerPanel />);
    if (activeFolder === VIEW_B2B_PROPOSAL_DESK) {
      return renderGatedView(activeFolder, <panels.ProposalDeskPanel onUseTemplate={applyTemplate} />);
    }
    return renderGatedView(activeFolder, <panels.SlaMonitorPanel />);
  }

  if (
    activeFolder === VIEW_HC_PATIENT_REGISTRY ||
    activeFolder === VIEW_HC_APPOINTMENT_DESK ||
    activeFolder === VIEW_HC_REFERRAL_TRACKER ||
    activeFolder === VIEW_HC_HIPAA_AUDIT
  ) {
    const panels = await import("./HealthcarePanels");
    if (activeFolder === VIEW_HC_PATIENT_REGISTRY) {
      return renderGatedView(activeFolder, <panels.PatientRegistryPanel />);
    }
    if (activeFolder === VIEW_HC_APPOINTMENT_DESK) {
      return renderGatedView(activeFolder, <panels.AppointmentDeskPanel />);
    }
    if (activeFolder === VIEW_HC_REFERRAL_TRACKER) {
      return renderGatedView(activeFolder, <panels.ReferralTrackerPanel onUseTemplate={applyTemplate} />);
    }
    return renderGatedView(activeFolder, <panels.HipaaAuditPanel />);
  }

  return null;
}
