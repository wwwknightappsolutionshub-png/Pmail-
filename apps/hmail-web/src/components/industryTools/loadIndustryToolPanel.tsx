import type { ReactNode } from "react";

type ComposeTemplate = { subject: string; html: string; label?: string };

export async function loadIndustryToolPanel(
  useCaseId: string,
  toolId: string,
  applyComposeTemplate: (template: ComposeTemplate) => void,
): Promise<ReactNode> {
  if (useCaseId === "legal") {
    const panels = await import("../FeaturePanels");
    if (toolId === "matters") return <panels.ImmigrationDeskPanel />;
    if (toolId === "deadlines") return <panels.DeadlinesPanel />;
    if (toolId === "compliance") return <panels.CompliancePanel />;
    if (toolId === "clients") return <panels.ClientPortalPanel />;
    return null;
  }

  if (useCaseId === "accounting") {
    const panels = await import("../AccountingPanels");
    if (toolId === "intake") return <panels.DocumentIntakePanel />;
    if (toolId === "deadlines") return <panels.FilingCalendarPanel />;
    if (toolId === "secure") return <panels.SecureExchangePanel onUseTemplate={applyComposeTemplate} />;
    if (toolId === "clients") return <panels.ClientEntitiesPanel />;
    return null;
  }

  if (useCaseId === "real-estate") {
    const panels = await import("../RealEstatePanels");
    if (toolId === "listings") return <panels.ListingBoardPanel />;
    if (toolId === "showings") return <panels.ShowingSchedulerPanel />;
    if (toolId === "templates") return <panels.QuickRepliesPanel onUseTemplate={applyComposeTemplate} />;
    if (toolId === "team") return <panels.DealRoomPanel />;
    return null;
  }

  if (useCaseId === "recruitment") {
    const panels = await import("../RecruitmentPanels");
    if (toolId === "pipeline") return <panels.RolePipelinePanel />;
    if (toolId === "schedule") return <panels.InterviewDeskPanel />;
    if (toolId === "outreach") return <panels.BulkOutreachPanel onUseTemplate={applyComposeTemplate} />;
    if (toolId === "search") return <panels.TalentSearchPanel />;
    return null;
  }

  if (useCaseId === "b2b-services") {
    const panels = await import("../B2bPanels");
    if (toolId === "workspaces") return <panels.ClientWorkspacesPanel />;
    if (toolId === "projects") return <panels.ProjectTrackerPanel />;
    if (toolId === "proposals") return <panels.ProposalDeskPanel onUseTemplate={applyComposeTemplate} />;
    if (toolId === "sla") return <panels.SlaMonitorPanel />;
    return null;
  }

  if (useCaseId === "healthcare") {
    const panels = await import("../HealthcarePanels");
    if (toolId === "patients") return <panels.PatientRegistryPanel />;
    if (toolId === "appointments") return <panels.AppointmentDeskPanel />;
    if (toolId === "referrals") return <panels.ReferralTrackerPanel onUseTemplate={applyComposeTemplate} />;
    if (toolId === "compliance") return <panels.HipaaAuditPanel />;
    return null;
  }

  return null;
}
