import type { ReactNode } from "react";
import type { ComposeInitial } from "./ComposeModal";
import { DocumentsPanel } from "./DocumentsPanel";
import { ProviderSettingsPanel } from "./ProviderSettingsPanel";
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
  VIEW_AUTO_REPLY_FUNCTIONALITY,
  VIEW_CALENDAR,
  VIEW_COMPOSE_SETTINGS,
  VIEW_CONTACTS,
  VIEW_DOCUMENTS,
  VIEW_INDUSTRY_TOOLS,
  VIEW_OPEN_TRACKING,
  VIEW_FILE_VAULT,
  VIEW_INBOX_CLEANUP,
  VIEW_ATTACHMENT_CATEGORIZE,
  VIEW_ESIGN,
  VIEW_EMAIL_SLA,
  VIEW_MAIL2PDF,
  VIEW_PROVIDER_SETTINGS,
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
} from "../constants/mailViews";
import type { BusinessVertical } from "../types/mail";
import type { CareerScannerPreload } from "./CareerScannerPanel";
import { ContactsPanel } from "./ContactsPanel";

export type { CareerScannerPreload };

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
  if (activeFolder === VIEW_PROVIDER_SETTINGS) {
    return <ProviderSettingsPanel />;
  }
  if (activeFolder === VIEW_COMPOSE_SETTINGS) {
    return <ComposeSettingsPanel />;
  }
  if (activeFolder === VIEW_AUTO_REPLY_FUNCTIONALITY) {
    return renderGatedView(activeFolder, <AutoReplyPanel />);
  }

  return null;
}
