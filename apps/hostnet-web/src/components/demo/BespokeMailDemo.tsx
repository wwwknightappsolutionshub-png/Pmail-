import { ChangeEvent, FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type {
  BespokeMailDemoConfig,
  DemoCrmContact,
  DemoMessage,
  DemoReminder,
  DemoToolItem,
  IndustryToolLane,
} from "../../data/bespokeMailDemoData";
import { INDUSTRY_DECK_HEADERS } from "../../data/bespokeMailDemoData";
import {
  getComposeSettings,
  type DemoAutoReply,
  type DemoSignature,
} from "../../data/bespokeMailComposeSettings";
import {
  buildSenderGroups,
  contactInitials,
  extractSenderEmail,
  filterMessagesByInboxFolder,
  formatFromHeader,
  messageCountForContact,
  senderDisplayName,
} from "../../data/demoMailUtils";
import {
  buildDefaultAvatarDataUrl,
  readImageFileAsDataUrl,
  resolveSignatureAvatarUrl,
} from "../../data/demoSignatureUtils";
import type { ComposeMailDraft, DemoOutboundMail, DemoTrashItem, MailFolderId } from "../../data/demoMailClient";
import {
  emptyComposeDraft,
  extractDocumentRows,
  OUTLOOK_MAIL_FOLDERS,
  defaultOpenTracking,
} from "../../data/demoMailClient";
import { getMailClientSeeds } from "../../data/demoMailClientSeeds";
import {
  buildPersistedState,
  hydrateDemoWorkspace,
  queueDemoWorkspaceSave,
  resolveDemoAutoReplyEntitlement,
  type DemoCalendarEvent,
  type DemoCalendarEnterpriseState,
  type DemoMessagingThread,
  type DemoReminderSequence,
} from "../../services/bespokeDemoWorkspace";
import { buildDemoReferralCompose, REFERRAL_REWARD_TOAST } from "../../data/referralCompose";
import {
  MailComposeForm,
  MailDocumentsTable,
  MailFolderNav,
  MailOutboundList,
  MailTrashList,
  OutboundDetail,
} from "./MailOutlookViews";
import {
  buildMailSearchCorpus,
  parseGmailQuery,
  searchMailRecords,
  type MailSearchResultItem,
  type MailSearchScope,
} from "../../data/mailSearch";
import { MailSearchBar, type MailSearchBarHandle } from "./MailSearchBar";
import { MailSearchResults } from "./MailSearchResults";
import { AutoReplyModal } from "./AutoReplyModal";
import { DetailPdfIcon, DetailPrintIcon } from "./DetailToolbarIcons";

type AutoReplyEntitlementState = {
  entitled: boolean;
  daysLeft: number;
  gated: boolean;
};

type Workspace = "inbox" | "industry" | "contacts" | "crm" | "reminders" | "calendar" | "messaging" | "settings";

type SignatureDraft = {
  name: string;
  body: string;
  avatarUrl: string;
};

type Props = {
  demo: BespokeMailDemoConfig;
  viewerName?: string;
  viewerEmail?: string;
  addonsHref?: string;
  calendarEnterpriseEnabled?: boolean;
  whatsappEnabled?: boolean;
  mailToPdfEnabled?: boolean;
  autoReplyEntitlement?: AutoReplyEntitlementState;
  liveComposeSettings?: {
    autoReplyEnabled: boolean;
    activeAutoReplyId: string | null;
    autoReplies: Array<{ id: string; name: string; subject: string; body: string; enabled?: boolean }>;
  };
  onAutoReplySettingsPersist?: (payload: {
    autoReplyOn: boolean;
    activeAutoReplyId: string;
  }) => void | Promise<void>;
  onAutoReplyTemplateSave?: (payload: {
    mode: "create" | "update";
    id?: string;
    name: string;
    subject: string;
    body: string;
  }) => void | Promise<{ id?: string } | void>;
  uiThemeVersion?: "dark" | "light";
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
  platformNotice?: string;
  organizationUsers?: Array<{ id: string; email: string; displayName: string }>;
  onLogout?: () => void;
  onReferFriend?: () => Promise<{ rewardToast: string | null; message?: string }>;
  renderIndustryTool?: (context: {
    demo: BespokeMailDemoConfig;
    toolId: string;
    fallback: { title: string; lines: string[] };
    applyComposeTemplate: (template: { subject: string; html: string }) => void;
  }) => ReactNode;
};

function htmlToComposeText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function emptySignatureDraft(): SignatureDraft {
  return {
    name: "",
    body: "",
    avatarUrl: buildDefaultAvatarDataUrl("Signature"),
  };
}

function SignaturePreview({ signature }: { signature: DemoSignature }) {
  const avatarUrl = resolveSignatureAvatarUrl(signature);

  return (
    <div className="bespoke-demo-signature-preview-card">
      <img src={avatarUrl} alt="" className="bespoke-demo-signature-avatar" />
      <pre className="bespoke-demo-signature-preview bespoke-demo-signature-preview--inline">{signature.body}</pre>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16.02 3.2c-7.06 0-12.8 5.64-12.8 12.58 0 2.37.68 4.68 1.96 6.67L3.1 28.8l6.58-2.04a13.02 13.02 0 0 0 6.34 1.64c7.06 0 12.8-5.64 12.8-12.58S23.08 3.2 16.02 3.2Zm0 22.98c-2.04 0-4.02-.58-5.73-1.68l-.4-.26-3.9 1.2 1.24-3.76-.27-.4a10.14 10.14 0 0 1-1.56-5.5c0-5.71 4.77-10.36 10.62-10.36s10.62 4.65 10.62 10.36-4.77 10.4-10.62 10.4Zm5.86-7.78c-.32-.16-1.9-.92-2.2-1.02-.3-.12-.52-.16-.74.16-.22.32-.84 1.02-1.04 1.24-.18.22-.38.24-.7.08-.32-.16-1.36-.49-2.6-1.56-.96-.84-1.6-1.88-1.78-2.2-.18-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.2.22-.32.32-.54.1-.22.06-.4-.02-.56-.08-.16-.74-1.76-1.02-2.4-.26-.62-.54-.54-.74-.54h-.62c-.22 0-.56.08-.86.4-.3.32-1.12 1.08-1.12 2.64s1.16 3.08 1.32 3.3c.16.22 2.28 3.42 5.52 4.8.77.33 1.37.52 1.84.67.77.24 1.47.2 2.03.12.62-.09 1.9-.76 2.17-1.5.27-.74.27-1.38.19-1.5-.08-.14-.3-.22-.62-.38Z"
      />
    </svg>
  );
}

function IndustryStationIcon({ lane }: { lane?: IndustryToolLane }) {
  switch (lane) {
    case "registry":
    case "clients":
    case "workspaces":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 3a5 5 0 0 1 5 5v1h1.5a2.5 2.5 0 0 1 0 5H17v1a5 5 0 1 1-10 0v-1H5.5a2.5 2.5 0 0 1 0-5H7V8a5 5 0 0 1 5-5Zm-3 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-1.5 8a1.5 1.5 0 0 0 0 3h9a1.5 1.5 0 0 0 0-3h-9Z"
          />
        </svg>
      );
    case "scheduling":
    case "deadlines":
    case "schedule":
    case "showings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v13A2.5 2.5 0 0 1 19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-13A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 6H4.5v11.5h15V8ZM8 11.5a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Zm5 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1Zm-5 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1Z"
          />
        </svg>
      );
    case "referrals":
    case "outreach":
    case "proposals":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11v2H6.5a.5.5 0 0 0-.5.5V11H4V6.5ZM13 4h4.5A2.5 2.5 0 0 1 20 6.5V11h-2V6.5a.5.5 0 0 0-.5-.5H13V4ZM4 13h2v4.5a.5.5 0 0 0 .5.5H11v2H6.5A2.5 2.5 0 0 1 4 17.5V13Zm15 0v4.5a2.5 2.5 0 0 1-2.5 2.5H13v-2h4.5a.5.5 0 0 0 .5-.5V13h2Zm-8.25 1.75a1 1 0 0 1 1.41 0l1.34 1.34 3.18-3.18a1 1 0 1 1 1.41 1.41l-3.89 3.9a1 1 0 0 1-1.41 0l-2.04-2.05a1 1 0 0 1 0-1.42Z"
          />
        </svg>
      );
    case "compliance":
    case "secure":
    case "sla":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 2a4 4 0 0 1 4 4v1h1.2a2.8 2.8 0 0 1 0 5.6H16v1a4 4 0 1 1-8 0v-1H6.8a2.8 2.8 0 0 1 0-5.6H8V6a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v2.2a1 1 0 0 1-1 1H6.8a.8.8 0 0 0 0 1.6H9a1 1 0 0 1 1 1V16a2 2 0 1 0 4 0v-2.2a1 1 0 0 1 1-1h2.2a.8.8 0 0 0 0-1.6H15a1 1 0 0 1-1-1V6a2 2 0 0 0-2-2Zm-5.5 12.5a1.5 1.5 0 0 0 0 3h11a1.5 1.5 0 0 0 0-3h-11Z"
          />
        </svg>
      );
    case "intake":
    case "listings":
    case "pipeline":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M4 4h16v2H4V4Zm0 5h10v2H4V9Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z" />
        </svg>
      );
    case "templates":
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M10 2a8 8 0 1 0 4.9 14.3l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
          />
        </svg>
      );
    case "deals":
    case "projects":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M3 7h8V3H3v4Zm10 0h8V3h-8v4ZM3 21h8v-4H3v4Zm10 0h8v-4h-8v4ZM3 14h8v-4H3v4Zm10 0h8v-4h-8v4Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14l-6-3-6 3V5Z" />
        </svg>
      );
  }
}

function IndustryOperationsDeck({
  useCaseId,
  tools,
  activeToolId,
  onSelectTool,
}: {
  useCaseId: string;
  tools: DemoToolItem[];
  activeToolId: string | null;
  onSelectTool: (toolId: string) => void;
}) {
  const deckHeader = INDUSTRY_DECK_HEADERS[useCaseId];
  if (!deckHeader) return null;

  return (
    <div className={`bespoke-demo-toolbar-block bespoke-demo-toolbar-block--clinical bespoke-demo-toolbar-block--${useCaseId}`}>
      <div className="bespoke-demo-clinical-deck-head">
        <div className="bespoke-demo-clinical-deck-copy">
          <p className="bespoke-demo-toolbar-label">{deckHeader.label}</p>
          <p className="bespoke-demo-clinical-deck-sub">{deckHeader.subtitle}</p>
        </div>
        <span className="bespoke-demo-clinical-deck-live" aria-hidden="true">
          <span className="bespoke-demo-clinical-deck-live-dot" />
          Live
        </span>
      </div>

      <div className="bespoke-demo-clinical-pathway" role="tablist" aria-label={deckHeader.label}>
        {tools.map((tool, index) => {
          const isActive = activeToolId === tool.id;
          const laneClass = tool.lane ? ` bespoke-demo-clinical-station--${tool.lane}` : "";

          return (
            <div key={tool.id} className="bespoke-demo-clinical-pathway-cell">
              {index > 0 ? <span className="bespoke-demo-clinical-pathway-bridge" aria-hidden="true" /> : null}
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`bespoke-demo-clinical-station${laneClass}${
                  isActive ? " bespoke-demo-clinical-station--active" : ""
                }`}
                onClick={() => onSelectTool(tool.id)}
              >
                <span className="bespoke-demo-clinical-station-code">{tool.stationCode ?? `0${index + 1}`}</span>
                <span className="bespoke-demo-clinical-station-icon">
                  <IndustryStationIcon lane={tool.lane} />
                </span>
                <span className="bespoke-demo-clinical-station-label">{tool.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function defaultCalendarEnterprise(defaultContactId: string): DemoCalendarEnterpriseState {
  return {
    googleConnected: false,
    microsoftConnected: false,
    lastSyncAt: null,
    reminderSequences: [
      {
        id: "seq-default",
        name: "Client appointment reminders",
        contactId: defaultContactId,
        active: true,
        triggers: [
          { id: "t-7d", label: "7 days before", daysBefore: 7, hoursBefore: 0, channel: "email" },
          { id: "t-1d", label: "1 day before", daysBefore: 1, hoursBefore: 0, channel: "email" },
          { id: "t-2h", label: "2 hours before", daysBefore: 0, hoursBefore: 2, channel: "in-app" },
        ],
      },
    ],
  };
}

function buildSyncedExternalEvents(
  source: "google" | "microsoft",
  defaultContactId: string,
  existing: DemoCalendarEvent[],
): DemoCalendarEvent[] {
  const hasSource = existing.some((event) => event.syncSource === source);
  if (hasSource) return [];

  const base = new Date();
  base.setDate(base.getDate() + (source === "google" ? 2 : 4));
  const second = new Date(base);
  second.setDate(second.getDate() + 1);

  const prefix = source === "google" ? "Google Calendar" : "Microsoft Outlook";
  return [
    {
      id: `sync-${source}-${Date.now()}`,
      title: `${prefix}: Client review`,
      date: base.toISOString().slice(0, 10),
      time: "10:00",
      contactId: defaultContactId,
      status: "scheduled",
      syncSource: source,
    },
    {
      id: `sync-${source}-${Date.now() + 1}`,
      title: `${prefix}: Team coverage block`,
      date: second.toISOString().slice(0, 10),
      time: "14:30",
      contactId: defaultContactId,
      status: "scheduled",
      syncSource: source,
    },
  ];
}

function reminderDueFromEvent(event: DemoCalendarEvent, trigger: DemoReminderSequence["triggers"][number]): string {
  const eventAt = new Date(`${event.date}T${event.time || "09:00"}`);
  eventAt.setDate(eventAt.getDate() - trigger.daysBefore);
  eventAt.setHours(eventAt.getHours() - trigger.hoursBefore);
  return eventAt.toISOString();
}

function applyReminderSequences(
  sequences: DemoReminderSequence[],
  events: DemoCalendarEvent[],
  reminders: DemoReminder[],
): DemoReminder[] {
  const activeSequences = sequences.filter((sequence) => sequence.active);
  if (!activeSequences.length) return reminders;

  const next = [...reminders];
  for (const event of events.filter((entry) => entry.status === "scheduled")) {
    for (const sequence of activeSequences) {
      if (sequence.contactId && event.contactId !== sequence.contactId) continue;
      for (const trigger of sequence.triggers) {
        const reminderId = `auto-${event.id}-${sequence.id}-${trigger.id}`;
        if (next.some((reminder) => reminder.id === reminderId)) continue;
        const dueAt = reminderDueFromEvent(event, trigger);
        next.unshift({
          id: reminderId,
          title: `${sequence.name}: ${event.title}`,
          dueAt,
          contactId: event.contactId,
          status: "pending",
          channel: trigger.channel,
        });
      }
    }
  }
  return next;
}

function formatDueDisplay(dateValue: string, timeValue: string): string {
  if (!dateValue) return "No date set";
  const date = new Date(`${dateValue}T${timeValue || "09:00"}`);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TopbarIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="bespoke-demo-topbar-btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function BespokeMailDemo({
  demo,
  viewerName,
  viewerEmail,
  addonsHref = "/#register",
  calendarEnterpriseEnabled = false,
  whatsappEnabled = false,
  mailToPdfEnabled = false,
  autoReplyEntitlement,
  liveComposeSettings,
  onAutoReplySettingsPersist,
  onAutoReplyTemplateSave,
  uiThemeVersion = "dark",
  onThemeChange,
  hideIndustryTools = false,
  workspaceToolsGated = false,
  onStartAddonSubscription,
  onMailToPdfExport,
  onWhatsappSend,
  platformNotice,
  organizationUsers = [],
  onLogout,
  onReferFriend,
  renderIndustryTool,
}: Props) {
  const composeSeed = useMemo(() => getComposeSettings(demo.useCaseId), [demo.useCaseId]);
  const displayName = viewerName?.trim() || viewerEmail?.split("@")[0] || "there";
  const displayEmail = viewerEmail?.trim() || composeSeed.defaultSenderEmail;

  const [workspace, setWorkspace] = useState<Workspace>("inbox");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [messages, setMessages] = useState<DemoMessage[]>(() => demo.messages.map((message) => ({ ...message })));
  const [selectedMessageId, setSelectedMessageId] = useState(demo.defaultMessageId);
  const [expandedSenderEmail, setExpandedSenderEmail] = useState<string | null>(null);

  const [crmContacts, setCrmContacts] = useState<DemoCrmContact[]>(() =>
    demo.crmContacts.map((contact) => ({ ...contact })),
  );
  const [selectedContactId, setSelectedContactId] = useState(demo.defaultContactId);
  const [crmSearch, setCrmSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    stage: demo.crmStageOptions[0],
  });

  const [reminders, setReminders] = useState<DemoReminder[]>(() =>
    demo.reminders.map((reminder) => ({ ...reminder })),
  );
  const [reminderFilter, setReminderFilter] = useState<"pending" | "done" | "all">("pending");
  const [newReminder, setNewReminder] = useState({
    title: "",
    date: "",
    time: "09:00",
    contactId: demo.defaultContactId,
    channel: "email" as DemoReminder["channel"],
  });
  const [calendarEvents, setCalendarEvents] = useState<DemoCalendarEvent[]>(() =>
    demo.reminders.slice(0, 3).map((reminder) => ({
      id: `cal-${reminder.id}`,
      title: reminder.title,
      date: reminder.dueAt.slice(0, 10),
      time: "09:00",
      contactId: reminder.contactId ?? demo.defaultContactId,
      status: reminder.status === "done" ? "done" : "scheduled",
    })),
  );
  const [newCalendarEvent, setNewCalendarEvent] = useState({
    title: "",
    date: "",
    time: "09:00",
    contactId: demo.defaultContactId,
  });
  const [calendarFullView, setCalendarFullView] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">("month");
  const [calendarCursorDate, setCalendarCursorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [calendarEnterprisePanel, setCalendarEnterprisePanel] = useState<"sync" | "reminder-sequences" | "capacity" | null>(
    null,
  );
  const [calendarEnterprise, setCalendarEnterprise] = useState<DemoCalendarEnterpriseState>(() =>
    defaultCalendarEnterprise(demo.defaultContactId),
  );
  const [calendarNotice, setCalendarNotice] = useState("");
  const [messagingThreads, setMessagingThreads] = useState<DemoMessagingThread[]>(() => [
    {
      id: `${demo.useCaseId}-org-general`,
      participantName: `${demo.brandName} Team`,
      participantEmail: `team@${displayEmail.split("@")[1] ?? "workspace.local"}`,
      participantPhone: "",
      participantType: "organization",
      lastActiveAt: new Date().toISOString(),
      messages: [
        {
          id: `${demo.useCaseId}-msg-seed`,
          author: "Workspace",
          channel: "internal",
          body: "Internal organization chat is ready for this workspace.",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  ]);
  const [activeThreadId, setActiveThreadId] = useState(`${demo.useCaseId}-org-general`);
  const [messageDraft, setMessageDraft] = useState({
    body: "",
    channel: "internal" as "internal" | "whatsapp",
  });


  const [autoReplyComplimentaryStartedAt, setAutoReplyComplimentaryStartedAt] = useState<string | null>(null);
  const [autoReplyModalOpen, setAutoReplyModalOpen] = useState(false);
  const demoAutoReplyEntitlement = useMemo(
    () => resolveDemoAutoReplyEntitlement(autoReplyComplimentaryStartedAt),
    [autoReplyComplimentaryStartedAt],
  );
  const autoReplyEntitled = autoReplyEntitlement?.entitled ?? demoAutoReplyEntitlement.entitled;
  const autoReplyDaysLeft = autoReplyEntitlement?.daysLeft ?? demoAutoReplyEntitlement.daysLeft;
  const [senderName, setSenderName] = useState(composeSeed.defaultSenderName);
  const [autoReplyOn, setAutoReplyOn] = useState(true);
  const [activeAutoReplyId, setActiveAutoReplyId] = useState(composeSeed.autoReplies[0]?.id ?? "");
  const [autoReplies, setAutoReplies] = useState<DemoAutoReply[]>(() =>
    composeSeed.autoReplies.map((reply) => ({ ...reply })),
  );
  const [activeSignatureId, setActiveSignatureId] = useState(composeSeed.signatures[0]?.id ?? "");
  const [signatures, setSignatures] = useState<DemoSignature[]>(() =>
    composeSeed.signatures.map((signature) => ({
      ...signature,
      avatarUrl: signature.avatarUrl ?? resolveSignatureAvatarUrl(signature),
    })),
  );
  const [editingAutoReplyId, setEditingAutoReplyId] = useState<string | "new" | null>(null);
  const [editingSignatureId, setEditingSignatureId] = useState<string | "new" | null>(null);
  const [autoReplyDraft, setAutoReplyDraft] = useState({ name: "", subject: "", body: "" });
  const [signatureDraft, setSignatureDraft] = useState<SignatureDraft>(emptySignatureDraft);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  const mailSeeds = useMemo(() => getMailClientSeeds(demo.useCaseId), [demo.useCaseId]);
  const [activeMailFolder, setActiveMailFolder] = useState<MailFolderId>("inbox");
  const mailSearchRef = useRef<MailSearchBarHandle>(null);
  const [mailSearchQuery, setMailSearchQuery] = useState("");
  const [mailSearchActive, setMailSearchActive] = useState(false);
  const [mailSearchScope, setMailSearchScope] = useState<MailSearchScope>("all");
  const [mailSearchSelectedId, setMailSearchSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DemoOutboundMail[]>(() => mailSeeds.drafts.map((item) => ({ ...item })));
  const [outbox, setOutbox] = useState<DemoOutboundMail[]>(() => mailSeeds.outbox.map((item) => ({ ...item })));
  const [scheduled, setScheduled] = useState<DemoOutboundMail[]>(() => mailSeeds.scheduled.map((item) => ({ ...item })));
  const [trash, setTrash] = useState<DemoTrashItem[]>([]);
  const [composeDraft, setComposeDraft] = useState<ComposeMailDraft>(() => emptyComposeDraft(demo.defaultContactId));
  const [editingOutboundId, setEditingOutboundId] = useState<string | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [selectedOutboundId, setSelectedOutboundId] = useState<string | null>(null);
  const [selectedTrashId, setSelectedTrashId] = useState<string | null>(null);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [mailNotice, setMailNotice] = useState<string | null>(null);
  const [referralToast, setReferralToast] = useState<string | null>(null);
  const [referBusy, setReferBusy] = useState(false);

  useEffect(() => {
    if (!referralToast) return;
    const timer = window.setTimeout(() => setReferralToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [referralToast]);

  useEffect(() => {
    if (platformNotice) setMailNotice(platformNotice);
  }, [platformNotice]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        mailSearchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [paidAddonNotice, setPaidAddonNotice] = useState<{ feature: string; slug: string } | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    setActiveTool(null);
    setWorkspace("inbox");
  }, [demo.useCaseId]);

  useEffect(() => {
    if (!liveComposeSettings) return;
    setAutoReplyOn(liveComposeSettings.autoReplyEnabled);
    setActiveAutoReplyId(liveComposeSettings.activeAutoReplyId ?? liveComposeSettings.autoReplies[0]?.id ?? "");
    setAutoReplies(
      liveComposeSettings.autoReplies.map((reply) => ({
        id: reply.id,
        name: reply.name,
        subject: reply.subject,
        body: reply.body,
      })),
    );
  }, [liveComposeSettings]);

  const filteredInboxMessages = useMemo(
    () => filterMessagesByInboxFolder(messages, demo.folders[0], demo.folders),
    [messages, demo.folders],
  );

  const senderGroups = useMemo(
    () => buildSenderGroups(filteredInboxMessages, crmContacts),
    [filteredInboxMessages, crmContacts],
  );
  const activeAutoReply = useMemo(
    () => autoReplies.find((reply) => reply.id === activeAutoReplyId) ?? autoReplies[0],
    [autoReplies, activeAutoReplyId],
  );
  const activeSignature = useMemo(
    () => signatures.find((signature) => signature.id === activeSignatureId) ?? signatures[0],
    [signatures, activeSignatureId],
  );
  const outboundFromHeader = formatFromHeader(senderName.trim() || composeSeed.defaultSenderName, composeSeed.defaultSenderEmail);

  const mailSearchCorpus = useMemo(
    () =>
      buildMailSearchCorpus({
        messages,
        outbox,
        drafts,
        scheduled,
        trash,
        outboundFromHeader,
      }),
    [messages, outbox, drafts, scheduled, trash, outboundFromHeader],
  );

  const parsedMailSearch = useMemo(() => parseGmailQuery(mailSearchQuery, mailSearchScope), [mailSearchQuery, mailSearchScope]);

  const mailSearchResults = useMemo(() => {
    if (!mailSearchActive) return [];
    return searchMailRecords(mailSearchCorpus, { ...parsedMailSearch, scope: mailSearchScope });
  }, [mailSearchActive, mailSearchCorpus, parsedMailSearch, mailSearchScope]);

  useEffect(() => {
    let cancelled = false;
    const seed = buildPersistedState({
      messages: demo.messages.map((message) => ({ ...message })),
      crmContacts: demo.crmContacts.map((contact) => ({ ...contact })),
      reminders: demo.reminders.map((reminder) => ({ ...reminder })),
      calendarEvents,
      calendarEnterprise,
      messagingThreads,
      drafts: mailSeeds.drafts.map((item) => ({ ...item })),
      outbox: mailSeeds.outbox.map((item) => ({ ...item })),
      scheduled: mailSeeds.scheduled.map((item) => ({ ...item })),
      trash: [],
      senderName: composeSeed.defaultSenderName,
      autoReplyOn: true,
      autoReplyComplimentaryStartedAt: new Date().toISOString(),
      activeAutoReplyId: composeSeed.autoReplies[0]?.id ?? "",
      activeSignatureId: composeSeed.signatures[0]?.id ?? "",
      autoReplies: composeSeed.autoReplies.map((reply) => ({ ...reply })),
      signatures: composeSeed.signatures.map((signature) => ({
        ...signature,
        avatarUrl: signature.avatarUrl ?? resolveSignatureAvatarUrl(signature),
      })),
    });

    void hydrateDemoWorkspace(demo.useCaseId, () => seed).then((loaded) => {
      if (cancelled) return;
      setMessages(loaded.messages);
      setCrmContacts(loaded.crmContacts);
      setReminders(loaded.reminders);
      setCalendarEvents(loaded.calendarEvents ?? calendarEvents);
      setCalendarEnterprise(loaded.calendarEnterprise ?? calendarEnterprise);
      setMessagingThreads(loaded.messagingThreads ?? messagingThreads);
      setDrafts(loaded.drafts);
      setOutbox(loaded.outbox);
      setScheduled(loaded.scheduled);
      setTrash(loaded.trash);
      setSenderName(loaded.senderName);
      setAutoReplyComplimentaryStartedAt(loaded.autoReplyComplimentaryStartedAt ?? new Date().toISOString());
      setAutoReplyOn(loaded.autoReplyOn ?? true);
      setActiveAutoReplyId(loaded.activeAutoReplyId);
      setActiveSignatureId(loaded.activeSignatureId);
      setAutoReplies(loaded.autoReplies);
      setSignatures(loaded.signatures);
      setWorkspaceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [demo.useCaseId, demo.messages, demo.crmContacts, demo.reminders, mailSeeds, composeSeed]);

  useEffect(() => {
    if (!workspaceReady) return;
    queueDemoWorkspaceSave(
      demo.useCaseId,
      buildPersistedState({
        messages,
        crmContacts,
        reminders,
        calendarEvents,
        calendarEnterprise,
        messagingThreads,
        drafts,
        outbox,
        scheduled,
        trash,
        senderName,
        autoReplyComplimentaryStartedAt: autoReplyComplimentaryStartedAt ?? new Date().toISOString(),
        autoReplyOn,
        activeAutoReplyId,
        activeSignatureId,
        autoReplies,
        signatures,
      }),
    );
  }, [
    workspaceReady,
    demo.useCaseId,
    messages,
    crmContacts,
    reminders,
    calendarEvents,
    calendarEnterprise,
    messagingThreads,
    drafts,
    outbox,
    scheduled,
    trash,
    senderName,
    autoReplyComplimentaryStartedAt,
    autoReplyOn,
    activeAutoReplyId,
    activeSignatureId,
    autoReplies,
    signatures,
  ]);

  useEffect(() => {
    if (!expandedSenderEmail) return;
    const stillValid = senderGroups.some((group) => group.senderEmail === expandedSenderEmail);
    if (!stillValid) setExpandedSenderEmail(null);
  }, [expandedSenderEmail, senderGroups]);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) ?? messages[0] ?? null,
    [messages, selectedMessageId],
  );

  const selectedContact = useMemo(
    () => crmContacts.find((contact) => contact.id === selectedContactId) ?? crmContacts[0],
    [crmContacts, selectedContactId],
  );

  const filteredContacts = useMemo(() => {
    const query = crmSearch.trim().toLowerCase();
    if (!query) return crmContacts;
    return crmContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.organization.toLowerCase().includes(query) ||
        contact.stage.toLowerCase().includes(query),
    );
  }, [crmContacts, crmSearch]);

  const filteredAddressBook = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return crmContacts;
    return crmContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.organization.toLowerCase().includes(query),
    );
  }, [crmContacts, contactSearch]);

  const filteredReminders = useMemo(() => {
    if (reminderFilter === "all") return reminders;
    return reminders.filter((reminder) => reminder.status === reminderFilter);
  }, [reminders, reminderFilter]);

  const whatsappContacts = useMemo(
    () => crmContacts.filter((contact) => contact.phone.trim().length > 0),
    [crmContacts],
  );
  const organizationChatUsers = useMemo(
    () =>
      organizationUsers.filter(
        (member) => member.email.trim().toLowerCase() !== displayEmail.trim().toLowerCase(),
      ),
    [organizationUsers, displayEmail],
  );
  const teamCapacityRows = useMemo(() => {
    const members = organizationChatUsers.length
      ? organizationChatUsers
      : [{ id: "self", email: displayEmail, displayName: displayName }];
    const cursor = new Date(`${calendarCursorDate}T00:00:00`);
    const weekStart = new Date(cursor);
    weekStart.setDate(cursor.getDate() - cursor.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    return members.map((member, index) => {
      const memberEvents = calendarEvents.filter((event, eventIndex) => {
        const eventDate = new Date(`${event.date}T00:00:00`);
        if (eventDate < weekStart || eventDate >= weekEnd) return false;
        return eventIndex % members.length === index;
      });
      const hoursBooked = memberEvents.length * 1.5;
      const hoursAvailable = 40;
      const utilization = Math.min(100, Math.round((hoursBooked / hoursAvailable) * 100));
      return {
        member,
        hoursBooked,
        hoursAvailable,
        utilization,
        eventCount: memberEvents.length,
        coverage: utilization >= 90 ? "at-capacity" : utilization >= 70 ? "watch" : "available",
      };
    });
  }, [organizationChatUsers, calendarEvents, calendarCursorDate, displayEmail, displayName]);
  const syncedEventCount = calendarEvents.filter((event) => event.syncSource && event.syncSource !== "local").length;
  const automatedReminderCount = reminders.filter((reminder) => reminder.id.startsWith("auto-")).length;
  const activeMessagingThread =
    messagingThreads.find((thread) => thread.id === activeThreadId) ?? messagingThreads[0] ?? null;
  const canUseWhatsappThread = activeMessagingThread?.participantType === "contact" && whatsappEnabled;
  const calendarVisibleDays = useMemo(() => {
    const cursor = new Date(`${calendarCursorDate}T00:00:00`);
    if (calendarViewMode === "week") {
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - cursor.getDay());
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const dateKey = date.toISOString().slice(0, 10);
        return {
          key: dateKey,
          day: String(date.getDate()),
          events: calendarEvents.filter((event) => event.date === dateKey),
        };
      });
    }

    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const totalDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    return [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({ key: `blank-${index}`, day: "", events: [] as DemoCalendarEvent[] })),
      ...Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const dateKey = new Date(cursor.getFullYear(), cursor.getMonth(), day).toISOString().slice(0, 10);
        return {
          key: dateKey,
          day: String(day),
          events: calendarEvents.filter((event) => event.date === dateKey),
        };
      }),
    ];
  }, [calendarCursorDate, calendarEvents, calendarViewMode]);
  const calendarPeriodLabel = new Date(`${calendarCursorDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const pendingReminderCount = reminders.filter((reminder) => reminder.status === "pending").length;
  const activeToolId = activeTool && demo.tools.some((tool) => tool.id === activeTool) ? activeTool : null;
  const toolPanel = demo.toolPanels[activeToolId ?? demo.defaultToolId] ?? demo.toolPanels[demo.defaultToolId];
  const applyComposeTemplate = (template: { subject: string; html: string }) => {
    setComposeDraft((current) => ({
      ...current,
      subject: template.subject,
      body: htmlToComposeText(template.html),
    }));
    setWorkspace("inbox");
    setActiveMailFolder("new-mail");
    setMailNotice("Template loaded into New Mail.");
  };
  const industryToolContent = renderIndustryTool?.({
    demo,
    toolId: activeToolId ?? demo.defaultToolId,
    fallback: toolPanel,
    applyComposeTemplate,
  });
  const selectedSenderEmail = selectedMessage ? extractSenderEmail(selectedMessage.from) : "";

  const allOutboundMail = useMemo(
    () => [...drafts, ...outbox, ...scheduled],
    [drafts, outbox, scheduled],
  );
  const documentRows = useMemo(
    () => extractDocumentRows(messages, allOutboundMail),
    [messages, allOutboundMail],
  );
  const mailFolderCounts = useMemo(
    () => ({
      "new-mail": 0,
      inbox: messages.length,
      outbox: outbox.length,
      drafts: drafts.length,
      scheduled: scheduled.length,
      trash: trash.length,
      documents: documentRows.length,
    }),
    [messages.length, outbox.length, drafts.length, scheduled.length, trash.length, documentRows.length],
  );
  const selectedOutbound = useMemo(
    () =>
      [...drafts, ...outbox, ...scheduled].find((item) => item.id === selectedOutboundId) ?? null,
    [drafts, outbox, scheduled, selectedOutboundId],
  );
  const selectedTrashItem = useMemo(
    () => trash.find((item) => item.id === selectedTrashId) ?? null,
    [trash, selectedTrashId],
  );
  const mailFolderLabel = OUTLOOK_MAIL_FOLDERS.find((folder) => folder.id === activeMailFolder)?.label ?? "Mail";

  function selectMailFolder(folder: MailFolderId) {
    setActiveMailFolder(folder);
    setDocumentsPage(1);
    if (folder === "new-mail") {
      setComposeDraft(emptyComposeDraft(demo.defaultContactId));
      setEditingOutboundId(null);
      setReplyingToMessageId(null);
    }
  }

  function buildOutboundFromCompose(
    status: DemoOutboundMail["status"],
    timeLabel: string,
    scheduledFor?: string,
  ): DemoOutboundMail {
    return {
      id: editingOutboundId ?? newId(`${demo.useCaseId}-out`),
      to: composeDraft.toName.trim(),
      toEmail: composeDraft.toEmail.trim().toLowerCase(),
      subject: composeDraft.subject.trim(),
      body: composeDraft.body.trim(),
      preview: composeDraft.body.trim().slice(0, 96) || "No preview",
      time: timeLabel,
      status,
      scheduledFor,
      attachment: composeDraft.attachment.trim() || undefined,
      contactId: composeDraft.contactId || undefined,
      openTracking: status === "sent" ? defaultOpenTracking() : undefined,
    };
  }

  function removeEditingOutboundFromBuckets(outboundId: string) {
    setDrafts((current) => current.filter((item) => item.id !== outboundId));
    setOutbox((current) => current.filter((item) => item.id !== outboundId));
    setScheduled((current) => current.filter((item) => item.id !== outboundId));
  }

  function hasComposeRecipients(draft: ComposeMailDraft): boolean {
    return Boolean(draft.toEmail.trim() || draft.ccEmail.trim() || draft.bccEmail.trim());
  }

  function hasComposeBody(draft: ComposeMailDraft): boolean {
    return Boolean(draft.body.trim() || draft.bodyHtml?.trim());
  }

  function saveDraftMail() {
    if (!hasComposeRecipients(composeDraft) || !composeDraft.subject.trim() || !hasComposeBody(composeDraft)) return;
    const mail = buildOutboundFromCompose("draft", "Draft saved just now");
    if (editingOutboundId) removeEditingOutboundFromBuckets(editingOutboundId);
    setDrafts((current) => [mail, ...current.filter((item) => item.id !== mail.id)]);
    setSelectedOutboundId(mail.id);
    setEditingOutboundId(null);
    setReplyingToMessageId(null);
    setComposeDraft(emptyComposeDraft(demo.defaultContactId));
    setActiveMailFolder("drafts");
    setMailNotice(`Draft "${mail.subject}" saved.`);
  }

  function sendComposeMail() {
    if (!hasComposeRecipients(composeDraft) || !composeDraft.subject.trim() || !hasComposeBody(composeDraft)) return;

    const mail = buildOutboundFromCompose("sent", "Sent just now");
    if (editingOutboundId) removeEditingOutboundFromBuckets(editingOutboundId);
    setOutbox((current) => [mail, ...current.filter((item) => item.id !== mail.id)]);
    setSelectedOutboundId(mail.id);
    setEditingOutboundId(null);
    setReplyingToMessageId(null);
    setComposeDraft(emptyComposeDraft(demo.defaultContactId));
    setActiveMailFolder("outbox");
    setMailNotice(`Message sent to ${mail.to}.`);
  }

  function scheduleComposeMail() {
    if (!hasComposeRecipients(composeDraft) || !composeDraft.subject.trim() || !hasComposeBody(composeDraft)) return;
    if (!composeDraft.scheduleDate) {
      setMailNotice("Choose a schedule date before scheduling send.");
      return;
    }
    const scheduledFor = formatDueDisplay(composeDraft.scheduleDate, composeDraft.scheduleTime);
    const mail = buildOutboundFromCompose("scheduled", "Scheduled", scheduledFor);
    if (editingOutboundId) removeEditingOutboundFromBuckets(editingOutboundId);
    setScheduled((current) => [mail, ...current.filter((item) => item.id !== mail.id)]);
    setSelectedOutboundId(mail.id);
    setEditingOutboundId(null);
    setReplyingToMessageId(null);
    setComposeDraft(emptyComposeDraft(demo.defaultContactId));
    setActiveMailFolder("scheduled");
    setMailNotice(`Message scheduled for ${scheduledFor}.`);
  }

  function discardComposeMail() {
    setEditingOutboundId(null);
    setReplyingToMessageId(null);
    setComposeDraft(emptyComposeDraft(demo.defaultContactId));
    setActiveMailFolder("inbox");
    setMailNotice("Compose discarded.");
  }

  function startReplyToMessage(message: DemoMessage) {
    const senderEmail = extractSenderEmail(message.from);
    const contact =
      crmContacts.find((entry) => entry.id === message.contactId) ??
      crmContacts.find((entry) => entry.email.toLowerCase() === senderEmail);
    const subject = message.subject.trim().toLowerCase().startsWith("re:")
      ? message.subject
      : `Re: ${message.subject}`;

    setComposeDraft({
      toName: contact?.name ?? senderDisplayName(message.from),
      toEmail: contact?.email ?? senderEmail,
      ccEmail: "",
      bccEmail: "",
      subject,
      body: `\n\n---\n${message.from} wrote:\n${message.body}`,
      attachment: "",
      scheduleDate: "",
      scheduleTime: "09:00",
      contactId: contact?.id ?? message.contactId ?? demo.defaultContactId,
    });
    setReplyingToMessageId(message.id);
    setEditingOutboundId(null);
    setActiveMailFolder("new-mail");
    setMailNotice(`Replying to "${message.subject}".`);
  }

  function openOutboundForEdit(mail: DemoOutboundMail) {
    setReplyingToMessageId(null);
    setEditingOutboundId(mail.id);
    setComposeDraft({
      toName: mail.to,
      toEmail: mail.toEmail,
      ccEmail: "",
      bccEmail: "",
      subject: mail.subject,
      body: mail.body,
      attachment: mail.attachment ?? "",
      scheduleDate: "",
      scheduleTime: "09:00",
      contactId: mail.contactId ?? demo.defaultContactId,
    });
    setActiveMailFolder("new-mail");
  }

  function moveOutboundToTrash(
    mail: DemoOutboundMail,
    bucket: "drafts" | "outbox" | "scheduled",
  ) {
    removeEditingOutboundFromBuckets(mail.id);
    setTrash((current) => [
      {
        id: newId(`${demo.useCaseId}-trash`),
        kind: "outbound",
        sourceFolder: bucket,
        outboundBucket: bucket,
        deletedAt: "Just now",
        outboundMail: mail,
      },
      ...current,
    ]);
    if (selectedOutboundId === mail.id) setSelectedOutboundId(null);
    setMailNotice(`"${mail.subject}" moved to trash.`);
  }

  function deleteInboxMessage(messageId: string) {
    const message = messages.find((entry) => entry.id === messageId);
    if (!message) return;
    setMessages((current) => current.filter((entry) => entry.id !== messageId));
    setTrash((current) => [
      {
        id: newId(`${demo.useCaseId}-trash`),
        kind: "inbox",
        sourceFolder: "inbox",
        deletedAt: "Just now",
        inboxMessage: message,
      },
      ...current,
    ]);
    if (selectedMessageId === messageId) setSelectedMessageId(messages.find((entry) => entry.id !== messageId)?.id ?? "");
    setMailNotice(`"${message.subject}" moved to trash.`);
  }

  function selectInboxMessage(messageId: string) {
    setSelectedMessageId(messageId);
    setMessages((current) =>
      current.map((entry) => (entry.id === messageId ? { ...entry, unread: false } : entry)),
    );
  }

  function markInboxMessageUnread(messageId: string) {
    setMessages((current) =>
      current.map((entry) => (entry.id === messageId ? { ...entry, unread: true } : entry)),
    );
    setMailNotice("Message marked as unread.");
  }

  function restoreTrashItem(trashId: string) {
    const item = trash.find((entry) => entry.id === trashId);
    if (!item) return;

    if (item.kind === "inbox" && item.inboxMessage) {
      setMessages((current) => [item.inboxMessage!, ...current]);
      setSelectedMessageId(item.inboxMessage.id);
      setActiveMailFolder("inbox");
    } else if (item.kind === "outbound" && item.outboundMail) {
      const mail = item.outboundMail;
      if (mail.status === "draft" || item.outboundBucket === "drafts") setDrafts((current) => [mail, ...current]);
      else if (mail.status === "scheduled" || item.outboundBucket === "scheduled")
        setScheduled((current) => [mail, ...current]);
      else setOutbox((current) => [mail, ...current]);
      setSelectedOutboundId(mail.id);
      setActiveMailFolder(
        mail.status === "draft" ? "drafts" : mail.status === "scheduled" ? "scheduled" : "outbox",
      );
    }

    setTrash((current) => current.filter((entry) => entry.id !== trashId));
    setSelectedTrashId(null);
    setMailNotice("Item restored.");
  }

  function deleteTrashForever(trashId: string) {
    setTrash((current) => current.filter((entry) => entry.id !== trashId));
    if (selectedTrashId === trashId) setSelectedTrashId(null);
    setMailNotice("Item permanently deleted.");
  }

  function sendScheduledNow(mailId: string) {
    const mail = scheduled.find((entry) => entry.id === mailId);
    if (!mail) return;
    const sent: DemoOutboundMail = {
      ...mail,
      status: "sent",
      time: "Sent just now",
      scheduledFor: undefined,
      openTracking: defaultOpenTracking(),
    };
    setScheduled((current) => current.filter((entry) => entry.id !== mailId));
    setOutbox((current) => [sent, ...current]);
    setSelectedOutboundId(sent.id);
    setActiveMailFolder("outbox");
    setMailNotice(`Scheduled message sent to ${sent.to}.`);
  }

  function simulateRecipientOpen(mailId: string) {
    setOutbox((current) =>
      current.map((item) => {
        if (item.id !== mailId || item.status !== "sent" || !item.openTracking?.enabled) return item;
        const openCount = item.openTracking.openCount + 1;
        const now = "Just now";
        return {
          ...item,
          openTracking: {
            ...item.openTracking,
            openCount,
            firstOpenedAt: item.openTracking.firstOpenedAt ?? now,
            lastOpenedAt: now,
          },
        };
      }),
    );
    setMailNotice("Recipient open recorded for this message.");
  }

  function openMessageFromDocuments(messageId: string, isInbox: boolean) {
    if (isInbox) {
      const message = messages.find((entry) => entry.id === messageId);
      if (!message) return;
      setActiveMailFolder("inbox");
      selectInboxMessage(message.id);
      setExpandedSenderEmail(extractSenderEmail(message.from));
      return;
    }

    const mail =
      outbox.find((entry) => entry.id === messageId) ??
      scheduled.find((entry) => entry.id === messageId) ??
      drafts.find((entry) => entry.id === messageId);
    if (!mail) return;
    setSelectedOutboundId(mail.id);
    setActiveMailFolder(
      mail.status === "draft" ? "drafts" : mail.status === "scheduled" ? "scheduled" : "outbox",
    );
  }

  function toggleSenderGroup(senderEmail: string) {
    setExpandedSenderEmail((current) => (current === senderEmail ? null : senderEmail));
  }

  function openContactWorkspace(contactId: string) {
    setSelectedContactId(contactId);
    setWorkspace("contacts");
  }

  function openSenderInInbox(senderEmail: string, messageId?: string) {
    setWorkspace("inbox");
    setExpandedSenderEmail(senderEmail);
    if (messageId) selectInboxMessage(messageId);
    else {
      const group = senderGroups.find((entry) => entry.senderEmail === senderEmail);
      if (group?.messages[0]) selectInboxMessage(group.messages[0].id);
    }
  }

  function openContactFromMessage(contactId?: string) {
    if (!contactId) return;
    if (!crmContacts.some((contact) => contact.id === contactId)) return;
    setSelectedContactId(contactId);
    setWorkspace("crm");
  }

  function updateContact(field: keyof DemoCrmContact, value: string) {
    setCrmContacts((current) =>
      current.map((contact) =>
        contact.id === selectedContactId ? { ...contact, [field]: value, lastActivity: "Just now" } : contact,
      ),
    );
  }

  function addContact(event: FormEvent) {
    event.preventDefault();
    if (!newContact.name.trim() || !newContact.email.trim()) return;

    const contact: DemoCrmContact = {
      id: newId(`${demo.useCaseId}-c`),
      name: newContact.name.trim(),
      email: newContact.email.trim().toLowerCase(),
      phone: newContact.phone.trim(),
      organization: newContact.organization.trim() || "New record",
      stage: newContact.stage,
      notes: "",
      lastActivity: "Just now",
    };

    setCrmContacts((current) => [contact, ...current]);
    setSelectedContactId(contact.id);
    setNewContact({
      name: "",
      email: "",
      phone: "",
      organization: "",
      stage: demo.crmStageOptions[0],
    });
  }

  function addReminder(event: FormEvent) {
    event.preventDefault();
    if (!newReminder.title.trim()) return;

    const reminder: DemoReminder = {
      id: newId(`${demo.useCaseId}-r`),
      title: newReminder.title.trim(),
      dueAt: formatDueDisplay(newReminder.date, newReminder.time),
      contactId: newReminder.contactId || undefined,
      status: "pending",
      channel: newReminder.channel,
    };

    setReminders((current) => [reminder, ...current]);
    setNewReminder({
      title: "",
      date: "",
      time: "09:00",
      contactId: selectedContactId,
      channel: "email",
    });
  }

  function toggleReminderDone(reminderId: string) {
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === reminderId
          ? { ...reminder, status: reminder.status === "pending" ? "done" : "pending" }
          : reminder,
      ),
    );
  }

  function deleteReminder(reminderId: string) {
    setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
  }

  function addCalendarEvent(event: FormEvent) {
    event.preventDefault();
    if (!newCalendarEvent.title.trim() || !newCalendarEvent.date) return;

    const calendarEvent: DemoCalendarEvent = {
      id: newId(`${demo.useCaseId}-cal`),
      title: newCalendarEvent.title.trim(),
      date: newCalendarEvent.date,
      time: newCalendarEvent.time || "09:00",
      contactId: newCalendarEvent.contactId || demo.defaultContactId,
      status: "scheduled",
      syncSource: "local",
    };

    setCalendarEvents((current) => {
      const next = [calendarEvent, ...current];
      setCalendarEnterprise((enterprise) => {
        setReminders((reminderRows) => applyReminderSequences(enterprise.reminderSequences, next, reminderRows));
        return enterprise;
      });
      return next;
    });
    setCalendarEnterprise((current) => {
      if (current.googleConnected || current.microsoftConnected) {
        setCalendarNotice("Local event saved and pushed to connected calendars.");
        return { ...current, lastSyncAt: new Date().toISOString() };
      }
      return current;
    });
    setNewCalendarEvent({
      title: "",
      date: "",
      time: "09:00",
      contactId: selectedContactId,
    });
  }

  function toggleCalendarEventDone(eventId: string) {
    setCalendarEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, status: event.status === "scheduled" ? "done" : "scheduled" } : event,
      ),
    );
  }

  function deleteCalendarEvent(eventId: string) {
    setCalendarEvents((current) => current.filter((event) => event.id !== eventId));
  }

  function moveCalendarPeriod(direction: -1 | 1) {
    const cursor = new Date(`${calendarCursorDate}T00:00:00`);
    if (calendarViewMode === "week") cursor.setDate(cursor.getDate() + direction * 7);
    else cursor.setMonth(cursor.getMonth() + direction);
    setCalendarCursorDate(cursor.toISOString().slice(0, 10));
  }

  function showPaidFeatureNotice(feature: string, slug = "bespoke-workspace") {
    setPaidAddonNotice({ feature, slug });
  }

  function openMailWorkspace() {
    setActiveTool(null);
    setWorkspace("inbox");
  }

  function runMailSearch(query: string, scope: MailSearchScope) {
    setMailSearchQuery(query);
    setMailSearchScope(scope);
    setMailSearchActive(true);
    setMailSearchSelectedId(null);
    setWorkspace("inbox");
    setActiveTool(null);
  }

  function clearMailSearch() {
    setMailSearchQuery("");
    setMailSearchActive(false);
    setMailSearchScope("all");
    setMailSearchSelectedId(null);
  }

  function selectSearchResult(result: MailSearchResultItem) {
    setMailSearchSelectedId(result.id);
    if (result.inboxMessageId) {
      setActiveMailFolder("inbox");
      const inboxMessage = messages.find((entry) => entry.id === result.inboxMessageId);
      if (inboxMessage) {
        setExpandedSenderEmail(extractSenderEmail(inboxMessage.from));
      }
      selectInboxMessage(result.inboxMessageId);
      setSelectedOutboundId(null);
      setSelectedTrashId(null);
      return;
    }
    if (result.outboundId) {
      setSelectedOutboundId(result.outboundId);
      setSelectedMessageId("");
      setSelectedTrashId(null);
      if (result.folder === "sent") setActiveMailFolder("outbox");
      if (result.folder === "drafts") setActiveMailFolder("drafts");
      if (result.folder === "scheduled") setActiveMailFolder("scheduled");
      return;
    }
    if (result.trashId) {
      setActiveMailFolder("trash");
      setSelectedTrashId(result.trashId);
      setSelectedMessageId("");
      setSelectedOutboundId(null);
    }
  }

  function openWorkspaceTool(nextWorkspace: Exclude<Workspace, "inbox" | "industry">, feature: string) {
    if (workspaceToolsGated) {
      showPaidFeatureNotice(feature, "bespoke-workspace");
      return;
    }
    setWorkspace(nextWorkspace);
    setActiveTool(null);
  }

  function requestCalendarFullAddEvent() {
    if (!calendarEnterpriseEnabled) {
      showPaidFeatureNotice("Full calendar quick add", "full-calendar-functionality");
      return;
    }
    setCalendarFullView(false);
  }

  function openCalendarEnterprisePanel(panel: "sync" | "reminder-sequences" | "capacity") {
    if (!calendarEnterpriseEnabled) {
      showPaidFeatureNotice(
        panel === "sync"
          ? "Two-way Google/Microsoft calendar sync"
          : panel === "reminder-sequences"
            ? "Automated client reminder sequences"
            : "Team capacity and coverage view",
        "full-calendar-functionality",
      );
      return;
    }
    setCalendarEnterprisePanel((current) => (current === panel ? null : panel));
  }

  function connectCalendarProvider(provider: "google" | "microsoft") {
    setCalendarEnterprise((current) => ({
      ...current,
      googleConnected: provider === "google" ? true : current.googleConnected,
      microsoftConnected: provider === "microsoft" ? true : current.microsoftConnected,
    }));
    setCalendarNotice(`${provider === "google" ? "Google" : "Microsoft"} calendar connected.`);
    runCalendarSync();
  }

  function disconnectCalendarProvider(provider: "google" | "microsoft") {
    setCalendarEnterprise((current) => ({
      ...current,
      googleConnected: provider === "google" ? false : current.googleConnected,
      microsoftConnected: provider === "microsoft" ? false : current.microsoftConnected,
    }));
    setCalendarEvents((current) => current.filter((event) => event.syncSource !== provider));
    setCalendarNotice(`${provider === "google" ? "Google" : "Microsoft"} calendar disconnected.`);
  }

  function runCalendarSync() {
    setCalendarEnterprise((enterprise) => {
      const connectedGoogle = enterprise.googleConnected;
      const connectedMicrosoft = enterprise.microsoftConnected;
      if (!connectedGoogle && !connectedMicrosoft) {
        setCalendarNotice("Connect Google or Microsoft to start two-way sync.");
        return enterprise;
      }

      let importedCount = 0;
      setCalendarEvents((current) => {
        let imported: DemoCalendarEvent[] = [];
        if (connectedGoogle) {
          imported = [...imported, ...buildSyncedExternalEvents("google", demo.defaultContactId, current)];
        }
        if (connectedMicrosoft) {
          imported = [
            ...imported,
            ...buildSyncedExternalEvents("microsoft", demo.defaultContactId, [...current, ...imported]),
          ];
        }
        importedCount = imported.length;
        const next = imported.length ? [...imported, ...current] : current;
        setReminders((reminderRows) => applyReminderSequences(enterprise.reminderSequences, next, reminderRows));
        return next;
      });

      setCalendarNotice(
        importedCount
          ? `Two-way sync complete. Imported ${importedCount} external event${importedCount === 1 ? "" : "s"}.`
          : "Two-way sync complete. Local changes pushed to connected calendars.",
      );

      return { ...enterprise, lastSyncAt: new Date().toISOString() };
    });
  }

  function toggleReminderSequence(sequenceId: string) {
    setCalendarEnterprise((current) => {
      const next = {
        ...current,
        reminderSequences: current.reminderSequences.map((sequence) =>
          sequence.id === sequenceId ? { ...sequence, active: !sequence.active } : sequence,
        ),
      };
      setReminders((reminderRows) => applyReminderSequences(next.reminderSequences, calendarEvents, reminderRows));
      return next;
    });
  }

  function queueReminderSequences() {
    setCalendarEnterprise((enterprise) => {
      setReminders((current) => applyReminderSequences(enterprise.reminderSequences, calendarEvents, current));
      return enterprise;
    });
    setCalendarNotice("Automated client reminder sequences queued for upcoming calendar events.");
  }

  async function requestMailToPdf(subject: string) {
    if (!mailToPdfEnabled) {
      showPaidFeatureNotice(`Mail 2 PDF converter for "${subject}"`, "mail2pdf-functionality");
      return;
    }
    const inbound = selectedMessage;
    const outbound = selectedOutbound;
    const source = inbound ?? outbound;
    if (!source) {
      setMailNotice("Select a message before exporting to PDF.");
      return;
    }
    if (!onMailToPdfExport) {
      setMailNotice(`Mail 2 PDF export prepared for "${subject}".`);
      return;
    }
    try {
      await onMailToPdfExport({
        subject: source.subject,
        from: inbound ? inbound.from : displayEmail,
        to: inbound ? displayEmail : outbound!.toEmail,
        date: inbound?.time,
        body: source.body,
        attachments: inbound?.attachments ?? (inbound?.attachment ? [inbound.attachment] : undefined),
      });
      setMailNotice(`PDF downloaded for "${subject}".`);
    } catch (err) {
      setMailNotice(err instanceof Error ? err.message : "Could not export PDF.");
    }
  }

  function printMailDetail() {
    window.print();
  }

  async function requestComposeWhatsappSend() {
    if (!whatsappEnabled) {
      showPaidFeatureNotice("Send email to WhatsApp-enabled phone number", "whatsapp-functionality");
      return;
    }
    const contact = crmContacts.find((entry) => entry.id === composeDraft.contactId);
    if (!contact?.phone.trim()) {
      setMailNotice("Choose a recipient with a WhatsApp-enabled phone number before sending to WhatsApp.");
      return;
    }
    if (!onWhatsappSend) {
      setMailNotice(`WhatsApp delivery queued for ${contact.name} at ${contact.phone}.`);
      return;
    }
    try {
      await onWhatsappSend({
        toPhone: contact.phone,
        body: composeDraft.body,
        subject: composeDraft.subject,
      });
      setMailNotice(`WhatsApp sent to ${contact.name} at ${contact.phone}.`);
    } catch (err) {
      setMailNotice(err instanceof Error ? err.message : "Could not send WhatsApp message.");
    }
  }

  function openOrganizationThread(member: { id: string; email: string; displayName: string }) {
    const threadId = `org-${member.id}`;
    setMessagingThreads((current) => {
      if (current.some((thread) => thread.id === threadId)) return current;
      return [
        ...current,
        {
          id: threadId,
          participantName: member.displayName,
          participantEmail: member.email,
          participantPhone: "",
          participantType: "organization",
          lastActiveAt: new Date().toISOString(),
          messages: [],
        },
      ];
    });
    setActiveThreadId(threadId);
    setMessageDraft((current) => ({ ...current, channel: "internal" }));
  }

  function openWhatsappThread(contact: DemoCrmContact) {
    if (!contact.phone.trim()) return;
    const threadId = `wa-${contact.id}`;
    setMessagingThreads((current) => {
      if (current.some((thread) => thread.id === threadId)) return current;
      return [
        ...current,
        {
          id: threadId,
          participantName: contact.name,
          participantEmail: contact.email,
          participantPhone: contact.phone,
          participantType: "contact",
          lastActiveAt: new Date().toISOString(),
          messages: [],
        },
      ];
    });
    setActiveThreadId(threadId);
    setMessageDraft((current) => ({ ...current, channel: "whatsapp" }));
  }

  function sendWorkspaceMessage(event: FormEvent) {
    event.preventDefault();
    if (!activeMessagingThread) return;
    if (!messageDraft.body.trim()) return;
    if (messageDraft.channel === "whatsapp" && !canUseWhatsappThread) return;

    const createdAt = new Date().toISOString();
    setMessagingThreads((current) =>
      current.map((thread) =>
        thread.id === activeMessagingThread.id
          ? {
              ...thread,
              lastActiveAt: createdAt,
              messages: [
                ...thread.messages,
                {
                  id: newId(`${demo.useCaseId}-chat`),
                  author: displayName,
                  channel: messageDraft.channel,
                  body: messageDraft.body.trim(),
                  createdAt,
                },
              ],
            }
          : thread,
      ),
    );
    setMessageDraft({ body: "", channel: activeMessagingThread.participantType === "contact" ? "whatsapp" : "internal" });
  }

  function contactName(contactId?: string) {
    if (!contactId) return "Unlinked";
    return crmContacts.find((contact) => contact.id === contactId)?.name ?? "Unknown contact";
  }

  function startEditAutoReply(replyId: string) {
    const reply = autoReplies.find((entry) => entry.id === replyId);
    if (!reply) return;
    setEditingAutoReplyId(replyId);
    setAutoReplyDraft({ name: reply.name, subject: reply.subject, body: reply.body });
  }

  function startNewAutoReply() {
    if (!autoReplyEntitled) return;
    setEditingAutoReplyId("new");
    setAutoReplyDraft({
      name: "",
      subject: `Re: {{subject}} — ${demo.brandName}`,
      body: "",
    });
  }

  async function saveAutoReply(event: FormEvent) {
    event.preventDefault();
    if (!autoReplyDraft.name.trim() || !autoReplyDraft.subject.trim() || !autoReplyDraft.body.trim()) return;

    const draft = {
      name: autoReplyDraft.name.trim(),
      subject: autoReplyDraft.subject.trim(),
      body: autoReplyDraft.body.trim(),
    };

    if (onAutoReplyTemplateSave) {
      try {
        const result = await onAutoReplyTemplateSave({
          mode: editingAutoReplyId === "new" ? "create" : "update",
          id: editingAutoReplyId !== "new" ? (editingAutoReplyId ?? undefined) : undefined,
          ...draft,
        });
        if (result?.id) {
          setActiveAutoReplyId(result.id);
          persistAutoReplySettings({ activeAutoReplyId: result.id });
        }
        setSettingsNotice(
          editingAutoReplyId === "new" ? `Custom auto-reply "${draft.name}" created.` : "Auto-reply template updated.",
        );
      } catch {
        setSettingsNotice("Could not save auto-reply template.");
        return;
      }
    } else if (editingAutoReplyId === "new") {
      const reply: DemoAutoReply = {
        id: newId(`${demo.useCaseId}-ar`),
        ...draft,
        isCustom: true,
      };
      setAutoReplies((current) => [...current, reply]);
      setActiveAutoReplyId(reply.id);
      setSettingsNotice(`Custom auto-reply "${reply.name}" created.`);
    } else if (editingAutoReplyId) {
      setAutoReplies((current) =>
        current.map((reply) => (reply.id === editingAutoReplyId ? { ...reply, ...draft } : reply)),
      );
      setSettingsNotice("Auto-reply template updated.");
    }

    setEditingAutoReplyId(null);
    setAutoReplyDraft({ name: "", subject: "", body: "" });
  }

  function startEditSignature(signatureId: string) {
    const signature = signatures.find((entry) => entry.id === signatureId);
    if (!signature) return;
    setEditingSignatureId(signatureId);
    setSignatureDraft({
      name: signature.name,
      body: signature.body,
      avatarUrl: resolveSignatureAvatarUrl(signature),
    });
  }

  function startNewSignature() {
    setEditingSignatureId("new");
    setSignatureDraft(emptySignatureDraft());
  }

  async function handleSignatureAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const avatarUrl = await readImageFileAsDataUrl(file);
      setSignatureDraft((current) => ({ ...current, avatarUrl }));
      setSettingsNotice("Avatar image loaded. Save signature to apply.");
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : "Could not upload image.");
    }
  }

  function resetSignatureAvatar() {
    const label = signatureDraft.name.trim() || signatureDraft.body.split("\n")[0]?.trim() || "Signature";
    setSignatureDraft((current) => ({
      ...current,
      avatarUrl: buildDefaultAvatarDataUrl(label),
    }));
    setSettingsNotice("Avatar reset to default initials.");
  }

  function saveSignature(event: FormEvent) {
    event.preventDefault();
    if (!signatureDraft.name.trim() || !signatureDraft.body.trim()) return;

    const avatarUrl =
      signatureDraft.avatarUrl ||
      buildDefaultAvatarDataUrl(signatureDraft.name.trim() || "Signature");

    if (editingSignatureId === "new") {
      const signature: DemoSignature = {
        id: newId(`${demo.useCaseId}-sig`),
        name: signatureDraft.name.trim(),
        body: signatureDraft.body.trim(),
        avatarUrl,
        isCustom: true,
      };
      setSignatures((current) => [...current, signature]);
      setActiveSignatureId(signature.id);
      setSettingsNotice(`Signature "${signature.name}" saved with avatar.`);
    } else if (editingSignatureId) {
      setSignatures((current) =>
        current.map((signature) =>
          signature.id === editingSignatureId
            ? {
                ...signature,
                name: signatureDraft.name.trim(),
                body: signatureDraft.body.trim(),
                avatarUrl,
              }
            : signature,
        ),
      );
      setSettingsNotice("Signature and avatar saved.");
    }

    setEditingSignatureId(null);
    setSignatureDraft(emptySignatureDraft());
  }

  function persistAutoReplySettings(next: { autoReplyOn?: boolean; activeAutoReplyId?: string }) {
    if (!onAutoReplySettingsPersist) return;
    void onAutoReplySettingsPersist({
      autoReplyOn: next.autoReplyOn ?? autoReplyOn,
      activeAutoReplyId: next.activeAutoReplyId ?? activeAutoReplyId,
    });
  }

  function handleAutoReplyToggle(enabled: boolean) {
    setAutoReplyOn(enabled);
    persistAutoReplySettings({ autoReplyOn: enabled });
  }

  function handleSelectActiveAutoReply(replyId: string) {
    setActiveAutoReplyId(replyId);
    persistAutoReplySettings({ activeAutoReplyId: replyId });
  }

  function openAutoReplyModal() {
    setAutoReplyModalOpen(true);
  }

  function saveSenderName(event: FormEvent) {
    event.preventDefault();
    if (!senderName.trim()) return;
    setSettingsNotice(`Outbound sender name set to "${senderName.trim()}".`);
  }

  async function handleReferFriend() {
    setReferBusy(true);
    try {
      if (onReferFriend) {
        const result = await onReferFriend();
        const message = result.rewardToast ?? result.message ?? REFERRAL_REWARD_TOAST;
        if (result.rewardToast) {
          setReferralToast(message);
        } else {
          setMailNotice(message);
        }
        return;
      }

      const localCompose = buildDemoReferralCompose({
        inboxMessages: messages,
        outboundMail: allOutboundMail,
        userEmail: displayEmail,
        userName: displayName,
        signatureFooter: activeSignature?.body?.trim() || displayName,
      });

      if (localCompose.recipientCount === 0) {
        setMailNotice("No contacts found in your inbox or sent mail to invite.");
        return;
      }

      setMailNotice("Demo preview only — sign in to PMail+ to send real invitations.");
    } catch (err) {
      setMailNotice(err instanceof Error ? err.message : "Could not send referral invitations.");
    } finally {
      setReferBusy(false);
    }
  }

  if (!workspaceReady) {
    return (
      <div className="bespoke-demo bespoke-demo--loading">
        <p className="muted">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="bespoke-demo">
      <header className="bespoke-demo-topbar">
        <div className="bespoke-demo-topbar-left">
          <div>
            <p className="bespoke-demo-kicker">PMail+ Workspace</p>
            <strong className="bespoke-demo-brand">Welcome back, {displayName}</strong>
          </div>
        </div>
        <div className="bespoke-demo-topbar-center">
          <MailSearchBar
            ref={mailSearchRef}
            query={mailSearchQuery}
            active={mailSearchActive}
            scope={mailSearchScope}
            contacts={crmContacts.map((contact) => ({ name: contact.name, email: contact.email }))}
            onQueryChange={setMailSearchQuery}
            onScopeChange={setMailSearchScope}
            onSearch={runMailSearch}
            onClear={clearMailSearch}
          />
        </div>
        <div className="bespoke-demo-topbar-right">
          <div className="bespoke-demo-topbar-actions">
            <button
              type="button"
              className="bespoke-demo-topbar-btn"
              onClick={() => void handleReferFriend()}
              disabled={referBusy}
            >
              <TopbarIcon>
                <path
                  fill="currentColor"
                  d="M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm-9 8.5a5 5 0 0 1 10 0V19H6v-2.5zM19 8.5V7h2V5h-2V3h-2v2h-2v2h2v1.5a3.5 3.5 0 1 1-2 0z"
                />
              </TopbarIcon>
              <span>{referBusy ? "Sending invitations…" : "Refer a friend"}</span>
            </button>
            <Link to={addonsHref} className="bespoke-demo-topbar-btn">
              <TopbarIcon>
                <path
                  fill="currentColor"
                  d="M4 4h7l2 2h7a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm8 3.5L9.5 6H5v12h14V7.5H12z"
                />
              </TopbarIcon>
              <span>View addons</span>
            </Link>
            {onThemeChange ? (
              <button
                type="button"
                className="bespoke-demo-topbar-btn"
                onClick={() => void onThemeChange(uiThemeVersion === "light" ? "dark" : "light")}
                aria-label={uiThemeVersion === "light" ? "Switch to dark UI" : "Switch to light UI"}
              >
                <TopbarIcon>
                  {uiThemeVersion === "light" ? (
                    <path
                      fill="currentColor"
                      d="M21 12.8A7.5 7.5 0 0 1 11.2 3a6.5 6.5 0 1 0 9.8 9.8z"
                    />
                  ) : (
                    <path
                      fill="currentColor"
                      d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0 4a1 1 0 0 1-1-1v-1.1a1 1 0 1 1 2 0V21a1 1 0 0 1-1 1zm0-17.9a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.1a1 1 0 0 1-1 1zm10 8.9h-1.1a1 1 0 1 1 0-2H22a1 1 0 1 1 0 2h-1zm-17.9 0H2a1 1 0 1 1 0-2h1.1a1 1 0 1 1 0 2zm14.7 6.7a1 1 0 0 1-1.4 0l-.8-.8a1 1 0 1 1 1.4-1.4l.8.8a1 1 0 0 1 0 1.4zm-11.3-11.3a1 1 0 0 1-1.4 0l-.8-.8a1 1 0 1 1 1.4-1.4l.8.8a1 1 0 0 1 0 1.4zm11.3-2.7a1 1 0 0 1 0 1.4l-.8.8a1 1 0 1 1-1.4-1.4l.8-.8a1 1 0 0 1 1.4 0zM7.8 16.2a1 1 0 0 1 0 1.4l-.8.8a1 1 0 1 1-1.4-1.4l.8-.8a1 1 0 0 1 1.4 0z"
                    />
                  )}
                </TopbarIcon>
                <span>{uiThemeVersion === "light" ? "Dark UI" : "Light UI"}</span>
              </button>
            ) : null}
          </div>
          <span className="bespoke-demo-user" title={displayEmail}>
            {displayName} &lt;{displayEmail}&gt;
          </span>
        </div>
      </header>

      <div className="bespoke-demo-workspace-tabs">
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${
            workspace === "inbox" ? " bespoke-demo-workspace-tab--active" : ""
          }`}
          onClick={openMailWorkspace}
        >
          <svg
            className="bespoke-demo-workspace-tab-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 3.2 4 9.5V20a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V9.5L12 3.2zm8 15.3h-4v-6H8v6H4V10.1l8-5.8 8 5.8v8.4z"
            />
          </svg>
          Workspace
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "contacts" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("contacts", "Contacts")}
        >
          Contacts
          <span className="bespoke-demo-tab-count">{crmContacts.length}</span>
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "crm" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("crm", "CRM")}
        >
          CRM
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "reminders" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("reminders", "Reminders")}
        >
          Reminders
          <span className="bespoke-demo-tab-count">{pendingReminderCount}</span>
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "calendar" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("calendar", "Calendar")}
        >
          Calendar
          <span className="bespoke-demo-tab-count">{calendarEvents.length}</span>
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "messaging" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("messaging", "Messaging")}
        >
          Messaging
          <span className="bespoke-demo-tab-count">{messagingThreads.length}</span>
        </button>
        <button
          type="button"
          className={`bespoke-demo-workspace-tab${workspace === "settings" ? " bespoke-demo-workspace-tab--active" : ""}`}
          onClick={() => openWorkspaceTool("settings", "Brand Settings")}
        >
          Brand Settings
        </button>
      </div>

      {workspace === "inbox" || workspace === "industry" ? (
        <div className="bespoke-demo-workspace-toolbar">
          <div className="bespoke-demo-workspace-toolbar-row">
            {!hideIndustryTools ? (
              INDUSTRY_DECK_HEADERS[demo.useCaseId] ? (
                <IndustryOperationsDeck
                  useCaseId={demo.useCaseId}
                  tools={demo.tools}
                  activeToolId={activeToolId}
                  onSelectTool={(toolId) => {
                    setActiveTool(toolId);
                    setWorkspace("industry");
                  }}
                />
              ) : (
                <div className="bespoke-demo-toolbar-block bespoke-demo-toolbar-block--tools">
                  <p className="bespoke-demo-toolbar-label">Industry tools</p>
                  <div className="bespoke-demo-tools-segment" role="tablist" aria-label="Industry tools">
                    {demo.tools.map((tool) => (
                      <button
                        key={tool.id}
                        type="button"
                        role="tab"
                        aria-selected={activeToolId === tool.id}
                        className={`bespoke-demo-tool-tab${
                          activeToolId === tool.id ? " bespoke-demo-tool-tab--active" : ""
                        }`}
                        onClick={() => {
                          setActiveTool(tool.id);
                          setWorkspace("industry");
                        }}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : null}

          </div>
        </div>
      ) : null}

      {mailNotice ? (
        <div className="bespoke-demo-incoming-notice bespoke-demo-mail-notice">
          <span>{mailNotice}</span>
          <button type="button" onClick={() => setMailNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      {referralToast ? (
        <div className="bespoke-demo-referral-toast" role="status" aria-live="polite">
          <div className="bespoke-demo-referral-toast-card">
            <strong>Refer a friend</strong>
            <p>{referralToast}</p>
            <button type="button" aria-label="Dismiss" onClick={() => setReferralToast(null)}>
              ×
            </button>
          </div>
        </div>
      ) : null}

      {paidAddonNotice ? (
        <div className="bespoke-demo-paid-addon-overlay" role="dialog" aria-modal="true" aria-label="Paid add-on required">
          <div className="bespoke-demo-paid-addon-card">
            <span className="bespoke-demo-paid-addon-kicker">Paid add-on</span>
            <h2>Upgrade required</h2>
            <p>{paidAddonNotice.feature} is a paid workspace feature. Start a subscription or open View Addons for details.</p>
            <div className="bespoke-demo-paid-addon-actions">
              {onStartAddonSubscription ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void onStartAddonSubscription(paidAddonNotice.slug);
                    setPaidAddonNotice(null);
                  }}
                >
                  Start subscription
                </button>
              ) : null}
              <Link to={addonsHref} className="btn btn-primary" onClick={() => setPaidAddonNotice(null)}>
                View Addons
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setPaidAddonNotice(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {workspace === "inbox" ? (
        <div
          className={`bespoke-demo-shell${
            activeMailFolder === "documents" ? " bespoke-demo-shell--documents" : ""
          }${activeMailFolder === "new-mail" ? " bespoke-demo-shell--compose" : ""}${
            mailSearchActive ? " bespoke-demo-shell--search" : ""
          }`}
        >
          <aside className="bespoke-demo-sidebar">
            <p className="bespoke-demo-sidebar-title">Mail folders</p>
            <MailFolderNav
              activeFolder={activeMailFolder}
              counts={mailFolderCounts}
              onSelect={selectMailFolder}
              onAutoReplyClick={openAutoReplyModal}
              autoReplyActive={autoReplyModalOpen || (autoReplyEntitled && autoReplyOn)}
              autoReplyStatusLabel={
                autoReplyEntitled ? (autoReplyOn ? (autoReplyDaysLeft > 0 ? `${autoReplyDaysLeft}d` : "On") : "Off") : "Paid"
              }
            />
            <button
              type="button"
              className="bespoke-demo-mail-folder bespoke-demo-mail-folder--tool"
              onClick={() => requestMailToPdf(selectedMessage?.subject ?? selectedOutbound?.subject ?? "selected mail trail")}
              title="Mail 2 PDF — convert email trail (paid)"
            >
              <span>Mail 2 PDF</span>
              <span className="bespoke-demo-mail-folder-count">Paid</span>
            </button>
            {onLogout ? (
              <div className="bespoke-demo-sidebar-actions">
                <button type="button" className="bespoke-demo-sidebar-logout" onClick={onLogout}>
                  Log out
                </button>
              </div>
            ) : null}
          </aside>

          {activeMailFolder === "documents" ? (
            <MailDocumentsTable
              rows={documentRows}
              page={documentsPage}
              onPageChange={setDocumentsPage}
              onOpenMessage={openMessageFromDocuments}
            />
          ) : (
            <>
              <section className="bespoke-demo-list-pane">
                {mailSearchActive ? (
                  <MailSearchResults
                    query={mailSearchQuery}
                    scope={mailSearchScope}
                    results={mailSearchResults}
                    selectedId={mailSearchSelectedId}
                    onScopeChange={(nextScope) => {
                      setMailSearchScope(nextScope);
                      runMailSearch(mailSearchQuery, nextScope);
                    }}
                    onSelect={selectSearchResult}
                    onClear={clearMailSearch}
                  />
                ) : (
                  <>
                <div className="bespoke-demo-list-head">
                  <div>
                    <h2>{mailFolderLabel}</h2>
                    <p className="bespoke-demo-grouping-note">
                      {activeMailFolder === "inbox" || activeMailFolder === "new-mail"
                        ? "Grouped by sender ID (email)"
                        : `Standard Outlook-style ${mailFolderLabel.toLowerCase()} folder`}
                    </p>
                  </div>
                  <span>
                    {activeMailFolder === "inbox" || activeMailFolder === "new-mail"
                      ? `${senderGroups.length} senders · ${filteredInboxMessages.length} messages`
                      : activeMailFolder === "drafts"
                        ? `${drafts.length} drafts`
                        : activeMailFolder === "outbox"
                          ? `${outbox.length} sent`
                          : activeMailFolder === "scheduled"
                            ? `${scheduled.length} scheduled`
                            : activeMailFolder === "trash"
                              ? `${trash.length} deleted`
                              : null}
                  </span>
                </div>

                {activeMailFolder === "inbox" || activeMailFolder === "new-mail" ? (
                  <div className="bespoke-demo-message-list">
                    {senderGroups.map((group) => {
                      const isExpanded = expandedSenderEmail === group.senderEmail;
                      return (
                        <div
                          key={group.senderEmail}
                          className={`bespoke-demo-sender-group${
                            isExpanded ? " bespoke-demo-sender-group--expanded" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className={`bespoke-demo-sender-head${
                              selectedSenderEmail === group.senderEmail ? " bespoke-demo-sender-head--active" : ""
                            }`}
                            aria-expanded={isExpanded}
                            onClick={() => toggleSenderGroup(group.senderEmail)}
                          >
                            <span className="bespoke-demo-sender-avatar">{contactInitials(group.senderName)}</span>
                            <div className="bespoke-demo-sender-meta">
                              <strong>{group.senderName}</strong>
                              <small>{group.senderEmail}</small>
                            </div>
                            <span className="bespoke-demo-sender-count">{group.messages.length}</span>
                            {group.unreadCount > 0 ? (
                              <span className="bespoke-demo-sender-unread">{group.unreadCount} new</span>
                            ) : null}
                            <span className="bespoke-demo-sender-chevron">{isExpanded ? "▾" : "▸"}</span>
                          </button>
                          {isExpanded
                            ? group.messages.map((message) => (
                                <button
                                  key={message.id}
                                  type="button"
                                  className={`bespoke-demo-message bespoke-demo-message--grouped${
                                    selectedMessageId === message.id ? " bespoke-demo-message--active" : ""
                                  }${message.unread ? " bespoke-demo-message--unread" : ""}`}
                                  onClick={() => selectInboxMessage(message.id)}
                                >
                                  <div className="bespoke-demo-message-top">
                                    <strong>{message.subject}</strong>
                                    <span>{message.time}</span>
                                  </div>
                                  <p className="bespoke-demo-message-preview">{message.preview}</p>
                                </button>
                              ))
                            : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {activeMailFolder === "outbox" ? (
                  <MailOutboundList
                    items={outbox}
                    selectedId={selectedOutboundId}
                    emptyLabel="Outbox is empty. Send a message from New Mail."
                    showOpenTracking
                    onSelect={setSelectedOutboundId}
                    onDelete={(id) => {
                      const mail = outbox.find((entry) => entry.id === id);
                      if (mail) moveOutboundToTrash(mail, "outbox");
                    }}
                  />
                ) : null}

                {activeMailFolder === "drafts" ? (
                  <MailOutboundList
                    items={drafts}
                    selectedId={selectedOutboundId}
                    emptyLabel="No drafts yet. Save a message from New Mail."
                    onSelect={setSelectedOutboundId}
                    onEdit={(id) => {
                      const mail = drafts.find((entry) => entry.id === id);
                      if (mail) openOutboundForEdit(mail);
                    }}
                    onDelete={(id) => {
                      const mail = drafts.find((entry) => entry.id === id);
                      if (mail) moveOutboundToTrash(mail, "drafts");
                    }}
                  />
                ) : null}

                {activeMailFolder === "scheduled" ? (
                  <MailOutboundList
                    items={scheduled}
                    selectedId={selectedOutboundId}
                    emptyLabel="No scheduled messages."
                    onSelect={setSelectedOutboundId}
                    onEdit={(id) => {
                      const mail = scheduled.find((entry) => entry.id === id);
                      if (mail) openOutboundForEdit(mail);
                    }}
                    onSendNow={sendScheduledNow}
                    onDelete={(id) => {
                      const mail = scheduled.find((entry) => entry.id === id);
                      if (mail) moveOutboundToTrash(mail, "scheduled");
                    }}
                  />
                ) : null}

                {activeMailFolder === "trash" ? (
                  <MailTrashList
                    items={trash}
                    selectedId={selectedTrashId}
                    onSelect={setSelectedTrashId}
                    onRestore={restoreTrashItem}
                    onDeleteForever={deleteTrashForever}
                  />
                ) : null}
                  </>
                )}
              </section>

              <section className="bespoke-demo-detail-pane">
                {activeMailFolder === "new-mail" ? (
                  <>
                    <div className="bespoke-demo-detail-head">
                      <div>
                        <h3>{replyingToMessageId ? "Reply to mail" : "New Mail"}</h3>
                        <p className="muted">
                          {replyingToMessageId
                            ? "Your reply uses the sender identity and signature below."
                            : "Gmail-style editor is open. Your signature is appended on send."}
                        </p>
                      </div>
                    </div>
                    <div className="bespoke-demo-compose-preview">
                      <p className="bespoke-demo-sidebar-title">Reply identity</p>
                      <p className="bespoke-demo-compose-from">{outboundFromHeader}</p>
                      {activeSignature ? (
                        <>
                          <p className="bespoke-demo-compose-sig-label">
                            Active signature — {activeSignature.name}
                          </p>
                          <SignaturePreview signature={activeSignature} />
                        </>
                      ) : null}
                      {autoReplyEntitled && autoReplyOn && activeAutoReply ? (
                        <p className="bespoke-demo-compose-auto">
                          Auto-reply on: <strong>{activeAutoReply.name}</strong>
                        </p>
                      ) : null}
                      <button type="button" className="bespoke-demo-link-btn" onClick={openAutoReplyModal}>
                        Edit auto-reply templates →
                      </button>
                      <button type="button" className="bespoke-demo-link-btn" onClick={() => setWorkspace("settings")}>
                        Edit sender name & signatures →
                      </button>
                    </div>
                  </>
                ) : null}

                {activeMailFolder === "inbox" && selectedMessage ? (
                  <>
                    <div className="bespoke-demo-detail-head">
                      <div className="bespoke-demo-detail-head-main">
                        <div>
                          <p className="bespoke-demo-detail-from">{selectedMessage.from}</p>
                          <h3>{selectedMessage.subject}</h3>
                          <p className="bespoke-demo-sender-id-line">
                            Sender ID: <code>{selectedSenderEmail}</code>
                          </p>
                        </div>
                        <div className="bespoke-demo-detail-toolbar">
                          <button
                            type="button"
                            className="bespoke-demo-detail-icon-btn"
                            title="Mail 2 PDF — convert mail trail (paid)"
                            aria-label="Mail 2 PDF — convert mail trail"
                            onClick={() => requestMailToPdf(selectedMessage.subject)}
                          >
                            <DetailPdfIcon />
                          </button>
                          <button
                            type="button"
                            className="bespoke-demo-detail-icon-btn"
                            title="Print"
                            aria-label="Print message"
                            onClick={printMailDetail}
                          >
                            <DetailPrintIcon />
                          </button>
                          <button
                            type="button"
                            className="bespoke-demo-detail-icon-btn"
                            title={selectedMessage.unread ? "Already unread" : "Mark as unread"}
                            aria-label="Mark as unread"
                            disabled={Boolean(selectedMessage.unread)}
                            onClick={() => markInboxMessageUnread(selectedMessage.id)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path
                                fill="currentColor"
                                d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="bespoke-demo-detail-icon-btn bespoke-demo-detail-icon-btn--danger"
                            title="Delete"
                            aria-label="Delete message"
                            onClick={() => deleteInboxMessage(selectedMessage.id)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <path
                                fill="currentColor"
                                d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="bespoke-demo-insights">
                        {demo.insights.map((insight) => (
                          <div
                            key={insight.label}
                            className={`bespoke-demo-insight${
                              insight.tone ? ` bespoke-demo-insight--${insight.tone}` : ""
                            }`}
                          >
                            <span>{insight.label}</span>
                            <strong>{insight.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bespoke-demo-detail-body">
                      <p>{selectedMessage.body}</p>
                      {selectedMessage.attachment ? (
                        <div className="bespoke-demo-attachment">
                          <span>Attachment</span>
                          <strong>{selectedMessage.attachment}</strong>
                        </div>
                      ) : null}
                      {selectedMessage.attachments?.map((file) => (
                        <div key={file} className="bespoke-demo-attachment">
                          <span>Attachment</span>
                          <strong>{file}</strong>
                        </div>
                      ))}
                      <div className="bespoke-demo-detail-actions">
                        <button
                          type="button"
                          className="bespoke-demo-link-btn"
                          onClick={() => startReplyToMessage(selectedMessage)}
                        >
                          Reply to mail →
                        </button>
                        {selectedMessage.contactId ? (
                          <button
                            type="button"
                            className="bespoke-demo-link-btn"
                            onClick={() => openContactFromMessage(selectedMessage.contactId)}
                          >
                            Open CRM record →
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="bespoke-demo-link-btn"
                          onClick={() => {
                            const contact =
                              crmContacts.find((entry) => entry.id === selectedMessage.contactId) ??
                              crmContacts.find((entry) => entry.email.toLowerCase() === selectedSenderEmail);
                            if (contact) openContactWorkspace(contact.id);
                          }}
                        >
                          View contact →
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {activeMailFolder === "outbox" && selectedOutbound ? (
                  <OutboundDetail
                    mail={selectedOutbound}
                    onDelete={() => moveOutboundToTrash(selectedOutbound, "outbox")}
                    onSimulateOpen={() => simulateRecipientOpen(selectedOutbound.id)}
                    onPrint={printMailDetail}
                    onMailToPdf={() => requestMailToPdf(selectedOutbound.subject)}
                  />
                ) : null}

                {activeMailFolder === "drafts" && selectedOutbound ? (
                  <OutboundDetail
                    mail={selectedOutbound}
                    onEdit={() => openOutboundForEdit(selectedOutbound)}
                    onDelete={() => moveOutboundToTrash(selectedOutbound, "drafts")}
                    onPrint={printMailDetail}
                    onMailToPdf={() => requestMailToPdf(selectedOutbound.subject)}
                  />
                ) : null}

                {activeMailFolder === "scheduled" && selectedOutbound ? (
                  <OutboundDetail
                    mail={selectedOutbound}
                    onEdit={() => openOutboundForEdit(selectedOutbound)}
                    onSendNow={() => sendScheduledNow(selectedOutbound.id)}
                    onDelete={() => moveOutboundToTrash(selectedOutbound, "scheduled")}
                    onPrint={printMailDetail}
                    onMailToPdf={() => requestMailToPdf(selectedOutbound.subject)}
                  />
                ) : null}

                {activeMailFolder === "trash" && selectedTrashItem ? (
                  <div className="bespoke-demo-detail-body">
                    <h3>
                      {selectedTrashItem.inboxMessage?.subject ??
                        selectedTrashItem.outboundMail?.subject ??
                        "Deleted item"}
                    </h3>
                    <p>
                      {selectedTrashItem.inboxMessage?.body ?? selectedTrashItem.outboundMail?.body ?? ""}
                    </p>
                    <div className="bespoke-demo-detail-actions">
                      <button
                        type="button"
                        className="bespoke-demo-link-btn"
                        onClick={() => restoreTrashItem(selectedTrashItem.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="bespoke-demo-link-btn"
                        onClick={() => deleteTrashForever(selectedTrashItem.id)}
                      >
                        Delete forever
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeMailFolder === "inbox" ? (
                  <div className="bespoke-demo-tool-panel">
                    <p className="bespoke-demo-tool-panel-title">{toolPanel.title}</p>
                    <ul>
                      {toolPanel.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            </>
          )}

        </div>
      ) : null}

      {workspace === "industry" ? (
        <div className="bespoke-demo-industry-shell">
          {industryToolContent ?? (
            <div className="bespoke-demo-tool-panel bespoke-demo-tool-panel--expanded">
              <p className="bespoke-demo-tool-panel-title">{toolPanel.title}</p>
              <ul>
                {toolPanel.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {workspace === "contacts" ? (
        <div className="bespoke-demo-crm-shell">
          <section className="bespoke-demo-crm-list">
            <div className="bespoke-demo-module-head">
              <div>
                <h2>Contacts</h2>
                <p className="muted">Address book synced with sender IDs. Mail auto-groups by contact email.</p>
              </div>
              <input
                className="bespoke-demo-search"
                type="search"
                placeholder="Search contacts…"
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
              />
            </div>
            <div className="bespoke-demo-crm-cards">
              {filteredAddressBook.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={`bespoke-demo-crm-card${selectedContactId === contact.id ? " bespoke-demo-crm-card--active" : ""}`}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <div className="bespoke-demo-contact-card-top">
                    <span className="bespoke-demo-sender-avatar">{contactInitials(contact.name)}</span>
                    <div>
                      <strong>{contact.name}</strong>
                      <p>{contact.email}</p>
                    </div>
                  </div>
                  <p>{contact.organization}</p>
                  <div className="bespoke-demo-contact-card-meta">
                    <span className="bespoke-demo-tag">{contact.stage}</span>
                    <span className="muted">{messageCountForContact(contact, messages)} emails</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bespoke-demo-crm-detail">
            {selectedContact ? (
              <>
                <div className="bespoke-demo-module-head">
                  <div>
                    <h2>{selectedContact.name}</h2>
                    <p className="muted">Sender ID: {selectedContact.email}</p>
                  </div>
                </div>

                <label className="bespoke-demo-field">
                  <span>Phone</span>
                  <input
                    value={selectedContact.phone}
                    onChange={(event) => updateContact("phone", event.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </label>

                <label className="bespoke-demo-field">
                  <span>Organization</span>
                  <input
                    value={selectedContact.organization}
                    onChange={(event) => updateContact("organization", event.target.value)}
                  />
                </label>

                <label className="bespoke-demo-field">
                  <span>Contact notes</span>
                  <textarea
                    rows={4}
                    value={selectedContact.notes}
                    onChange={(event) => updateContact("notes", event.target.value)}
                    placeholder="Relationship context, preferences, or handoff notes…"
                  />
                </label>

                <div className="bespoke-demo-contact-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openSenderInInbox(selectedContact.email.toLowerCase())}
                  >
                    View sender group ({messageCountForContact(selectedContact, messages)})
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setWorkspace("crm")}>
                    Open in CRM
                  </button>
                </div>

                <div className="bespoke-demo-linked-reminders">
                  <p className="bespoke-demo-sidebar-title">Emails from this sender</p>
                  <ul>
                    {messages
                      .filter((message) => extractSenderEmail(message.from) === selectedContact.email.toLowerCase())
                      .map((message) => (
                        <li key={message.id}>
                          <button type="button" onClick={() => openSenderInInbox(selectedContact.email.toLowerCase(), message.id)}>
                            <strong>{message.subject}</strong>
                            <span>{message.time}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </>
            ) : null}

            <form className="bespoke-demo-form" onSubmit={addContact}>
              <p className="bespoke-demo-sidebar-title">Add contact</p>
              <div className="bespoke-demo-form-grid">
                <label className="bespoke-demo-field">
                  <span>Name</span>
                  <input
                    value={newContact.name}
                    onChange={(event) => setNewContact((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Email (sender ID)</span>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(event) => setNewContact((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Phone</span>
                  <input
                    value={newContact.phone}
                    onChange={(event) => setNewContact((current) => ({ ...current, phone: event.target.value }))}
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Organization</span>
                  <input
                    value={newContact.organization}
                    onChange={(event) =>
                      setNewContact((current) => ({ ...current, organization: event.target.value }))
                    }
                  />
                </label>
              </div>
              <button type="submit" className="btn btn-primary">
                Save contact
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {workspace === "crm" ? (
        <div className="bespoke-demo-crm-shell">
          <section className="bespoke-demo-crm-list">
            <div className="bespoke-demo-module-head">
              <div>
                <h2>{demo.crmLabel}</h2>
                <p className="muted">Pipeline stages and deal notes linked to contacts.</p>
              </div>
              <input
                className="bespoke-demo-search"
                type="search"
                placeholder="Search CRM…"
                value={crmSearch}
                onChange={(event) => setCrmSearch(event.target.value)}
              />
            </div>
            <div className="bespoke-demo-crm-cards">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={`bespoke-demo-crm-card${selectedContactId === contact.id ? " bespoke-demo-crm-card--active" : ""}`}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <div className="bespoke-demo-crm-card-top">
                    <strong>{contact.name}</strong>
                    <span>{contact.lastActivity}</span>
                  </div>
                  <p>{contact.organization}</p>
                  <span className="bespoke-demo-tag">{contact.stage}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bespoke-demo-crm-detail">
            {selectedContact ? (
              <>
                <div className="bespoke-demo-module-head">
                  <div>
                    <h2>{selectedContact.name}</h2>
                    <p className="muted">{selectedContact.email}</p>
                  </div>
                  <span className="bespoke-demo-tag">{selectedContact.organization}</span>
                </div>

                <label className="bespoke-demo-field">
                  <span>Pipeline stage</span>
                  <select
                    value={selectedContact.stage}
                    onChange={(event) => updateContact("stage", event.target.value)}
                  >
                    {demo.crmStageOptions.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="bespoke-demo-field">
                  <span>CRM notes</span>
                  <textarea
                    rows={5}
                    value={selectedContact.notes}
                    onChange={(event) => updateContact("notes", event.target.value)}
                    placeholder="Add context, next steps, or matter details…"
                  />
                </label>

                <div className="bespoke-demo-linked-reminders">
                  <p className="bespoke-demo-sidebar-title">Linked reminders</p>
                  <ul>
                    {reminders
                      .filter((reminder) => reminder.contactId === selectedContact.id)
                      .map((reminder) => (
                        <li key={reminder.id}>
                          <strong>{reminder.title}</strong>
                          <span>
                            {reminder.dueAt} · {reminder.status}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {workspace === "reminders" ? (
        <div className="bespoke-demo-reminders-shell">
          <section className="bespoke-demo-reminders-main">
            <div className="bespoke-demo-module-head">
              <div>
                <h2>Reminder system</h2>
                <p className="muted">Schedule follow-ups tied to contacts. Mark complete when done.</p>
              </div>
              <div className="bespoke-demo-filter-tabs">
                {(["pending", "done", "all"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`bespoke-demo-filter-tab${reminderFilter === filter ? " bespoke-demo-filter-tab--active" : ""}`}
                    onClick={() => setReminderFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="bespoke-demo-reminder-list">
              {filteredReminders.length === 0 ? (
                <p className="muted bespoke-demo-empty">No reminders in this view.</p>
              ) : (
                filteredReminders.map((reminder) => (
                  <article
                    key={reminder.id}
                    className={`bespoke-demo-reminder${reminder.status === "done" ? " bespoke-demo-reminder--done" : ""}`}
                  >
                    <div>
                      <h3>{reminder.title}</h3>
                      <p className="muted">
                        Due {reminder.dueAt} · {contactName(reminder.contactId)} · {reminder.channel}
                      </p>
                    </div>
                    <div className="bespoke-demo-reminder-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => toggleReminderDone(reminder.id)}>
                        {reminder.status === "pending" ? "Mark done" : "Reopen"}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => deleteReminder(reminder.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="bespoke-demo-reminders-side">
            <form className="bespoke-demo-form" onSubmit={addReminder}>
              <p className="bespoke-demo-sidebar-title">New reminder</p>
              <label className="bespoke-demo-field">
                <span>Title</span>
                <input
                  value={newReminder.title}
                  onChange={(event) => setNewReminder((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Follow up on filing package"
                  required
                />
              </label>
              <div className="bespoke-demo-form-grid">
                <label className="bespoke-demo-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={newReminder.date}
                    onChange={(event) => setNewReminder((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Time</span>
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(event) => setNewReminder((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
              </div>
              <label className="bespoke-demo-field">
                <span>Linked contact</span>
                <select
                  value={newReminder.contactId}
                  onChange={(event) => setNewReminder((current) => ({ ...current, contactId: event.target.value }))}
                >
                  {crmContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bespoke-demo-field">
                <span>Channel</span>
                <select
                  value={newReminder.channel}
                  onChange={(event) =>
                    setNewReminder((current) => ({
                      ...current,
                      channel: event.target.value as DemoReminder["channel"],
                    }))
                  }
                >
                  <option value="email">Email reminder</option>
                  <option value="in-app">In-app alert</option>
                </select>
              </label>
              <button type="submit" className="btn btn-primary btn-block">
                Schedule reminder
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {workspace === "calendar" ? (
        <div className={`bespoke-demo-calendar-shell${calendarFullView ? " bespoke-demo-calendar-shell--full" : ""}`}>
          <section className="bespoke-demo-calendar-main">
            <div className="bespoke-demo-module-head">
              <div>
                <h2>Calendar</h2>
                <p className="muted">
                  {calendarFullView
                    ? `${calendarPeriodLabel} · ${calendarViewMode === "month" ? "Month view" : "Week view"}`
                    : "Basic scheduling is free. Enterprise sync, automation, and team capacity require an active subscription."}
                </p>
              </div>
              <div className="bespoke-demo-calendar-head-actions">
                <span className="bespoke-demo-feature-badge bespoke-demo-feature-badge--on">Basic included</span>
                {calendarFullView ? (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={() => moveCalendarPeriod(-1)}>
                      Previous
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setCalendarCursorDate(new Date().toISOString().slice(0, 10))}>
                      Today
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => moveCalendarPeriod(1)}>
                      Next
                    </button>
                    <select
                      className="bespoke-demo-calendar-view-select"
                      value={calendarViewMode}
                      onChange={(event) => setCalendarViewMode(event.target.value as "month" | "week")}
                    >
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                    </select>
                    <button type="button" className="btn btn-primary" onClick={requestCalendarFullAddEvent}>
                      Add event
                    </button>
                  </>
                ) : null}
                <button type="button" className="btn btn-secondary" onClick={() => setCalendarFullView((open) => !open)}>
                  {calendarFullView ? "Agenda view" : "Full view"}
                </button>
              </div>
            </div>

            {calendarFullView ? (
              <div className="bespoke-demo-calendar-grid-view">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <strong key={day} className="bespoke-demo-calendar-weekday">{day}</strong>
                ))}
                {calendarVisibleDays.map((day) => (
                  <article key={day.key} className="bespoke-demo-calendar-day-card">
                    <span>{day.day}</span>
                    {day.events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="bespoke-demo-calendar-day-event"
                        onClick={() => toggleCalendarEventDone(event.id)}
                      >
                        {event.time} · {event.title}
                      </button>
                    ))}
                  </article>
                ))}
              </div>
            ) : (
              <div className="bespoke-demo-calendar-list">
                {calendarEvents.length === 0 ? (
                  <p className="muted bespoke-demo-empty">No calendar events yet.</p>
                ) : (
                  calendarEvents.map((event) => (
                    <article
                      key={event.id}
                      className={`bespoke-demo-calendar-event${
                        event.status === "done" ? " bespoke-demo-calendar-event--done" : ""
                      }`}
                    >
                      <div className="bespoke-demo-calendar-date">
                        <strong>{new Date(`${event.date}T${event.time || "09:00"}`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
                        <span>{event.time}</span>
                      </div>
                      <div>
                        <h3>{event.title}</h3>
                        {event.syncSource && event.syncSource !== "local" ? (
                          <p className="muted bespoke-demo-calendar-sync-badge">
                            Synced from {event.syncSource === "google" ? "Google" : "Microsoft"}
                          </p>
                        ) : null}
                        <p className="muted">{contactName(event.contactId)} · {event.status}</p>
                      </div>
                      <div className="bespoke-demo-reminder-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => toggleCalendarEventDone(event.id)}>
                          {event.status === "scheduled" ? "Mark done" : "Reopen"}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => deleteCalendarEvent(event.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <aside className="bespoke-demo-calendar-side">
            <form className="bespoke-demo-form" onSubmit={addCalendarEvent}>
              <p className="bespoke-demo-sidebar-title">New calendar event</p>
              <label className="bespoke-demo-field">
                <span>Title</span>
                <input
                  value={newCalendarEvent.title}
                  onChange={(event) => setNewCalendarEvent((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Client filing review"
                  required
                />
              </label>
              <div className="bespoke-demo-form-grid">
                <label className="bespoke-demo-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={newCalendarEvent.date}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Time</span>
                  <input
                    type="time"
                    value={newCalendarEvent.time}
                    onChange={(event) => setNewCalendarEvent((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
              </div>
              <label className="bespoke-demo-field">
                <span>Linked contact</span>
                <select
                  value={newCalendarEvent.contactId}
                  onChange={(event) => setNewCalendarEvent((current) => ({ ...current, contactId: event.target.value }))}
                >
                  {crmContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn-primary btn-block">
                Add event
              </button>
            </form>

            <section className="bespoke-demo-calendar-enterprise">
              <p className="bespoke-demo-sidebar-title">Enterprise calendar</p>
              {[
                { id: "sync" as const, label: "Two-way Google/Microsoft calendar sync" },
                { id: "reminder-sequences" as const, label: "Automated client reminder sequences" },
                { id: "capacity" as const, label: "Team capacity and coverage view" },
              ].map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={`bespoke-demo-enterprise-action${
                    calendarEnterprisePanel === feature.id ? " bespoke-demo-enterprise-action--active" : ""
                  }`}
                  disabled={!calendarEnterpriseEnabled}
                  title={calendarEnterpriseEnabled ? feature.label : "Requires active workspace subscription"}
                  onClick={() => openCalendarEnterprisePanel(feature.id)}
                >
                  <span>{feature.label}</span>
                  <small>{calendarEnterpriseEnabled ? "Available" : "Requires subscription"}</small>
                </button>
              ))}

              {calendarNotice ? <p className="bespoke-demo-calendar-notice">{calendarNotice}</p> : null}

              {calendarEnterpriseEnabled && calendarEnterprisePanel === "sync" ? (
                <div className="bespoke-demo-calendar-enterprise-panel">
                  <p className="bespoke-demo-calendar-enterprise-panel-title">Calendar sync</p>
                  <div className="bespoke-demo-calendar-sync-actions">
                    <button
                      type="button"
                      className={`btn btn-secondary btn-block${calendarEnterprise.googleConnected ? " btn-secondary--connected" : ""}`}
                      onClick={() =>
                        calendarEnterprise.googleConnected
                          ? disconnectCalendarProvider("google")
                          : connectCalendarProvider("google")
                      }
                    >
                      {calendarEnterprise.googleConnected ? "Disconnect Google" : "Connect Google"}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-block${calendarEnterprise.microsoftConnected ? " btn-secondary--connected" : ""}`}
                      onClick={() =>
                        calendarEnterprise.microsoftConnected
                          ? disconnectCalendarProvider("microsoft")
                          : connectCalendarProvider("microsoft")
                      }
                    >
                      {calendarEnterprise.microsoftConnected ? "Disconnect Microsoft" : "Connect Microsoft"}
                    </button>
                  </div>
                  <button type="button" className="btn btn-primary btn-block" onClick={() => runCalendarSync()}>
                    Run two-way sync
                  </button>
                  <p className="muted bespoke-demo-calendar-sync-meta">
                    {calendarEnterprise.lastSyncAt
                      ? `Last sync ${new Date(calendarEnterprise.lastSyncAt).toLocaleString()}`
                      : "No sync run yet"}
                    {syncedEventCount ? ` · ${syncedEventCount} external events` : ""}
                  </p>
                </div>
              ) : null}

              {calendarEnterpriseEnabled && calendarEnterprisePanel === "reminder-sequences" ? (
                <div className="bespoke-demo-calendar-enterprise-panel">
                  <p className="bespoke-demo-calendar-enterprise-panel-title">Reminder sequences</p>
                  {calendarEnterprise.reminderSequences.map((sequence) => (
                    <article key={sequence.id} className="bespoke-demo-reminder-sequence-card">
                      <div className="bespoke-demo-reminder-sequence-head">
                        <strong>{sequence.name}</strong>
                        <button type="button" className="btn btn-ghost" onClick={() => toggleReminderSequence(sequence.id)}>
                          {sequence.active ? "Active" : "Paused"}
                        </button>
                      </div>
                      <ul className="bespoke-demo-reminder-sequence-triggers">
                        {sequence.triggers.map((trigger) => (
                          <li key={trigger.id}>
                            {trigger.label} · {trigger.channel}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                  <button type="button" className="btn btn-primary btn-block" onClick={() => queueReminderSequences()}>
                    Queue reminders for upcoming events
                  </button>
                  <p className="muted bespoke-demo-calendar-sync-meta">
                    {automatedReminderCount} automated reminder{automatedReminderCount === 1 ? "" : "s"} queued
                  </p>
                </div>
              ) : null}

              {calendarEnterpriseEnabled && calendarEnterprisePanel === "capacity" ? (
                <div className="bespoke-demo-calendar-enterprise-panel">
                  <p className="bespoke-demo-calendar-enterprise-panel-title">Team capacity</p>
                  <div className="bespoke-demo-team-capacity-list">
                    {teamCapacityRows.map((row) => (
                      <article key={row.member.id} className={`bespoke-demo-team-capacity-card bespoke-demo-team-capacity-card--${row.coverage}`}>
                        <div className="bespoke-demo-team-capacity-top">
                          <strong>{row.member.displayName}</strong>
                          <span>{row.utilization}%</span>
                        </div>
                        <div className="bespoke-demo-team-capacity-bar" aria-hidden="true">
                          <span style={{ width: `${row.utilization}%` }} />
                        </div>
                        <p className="muted">
                          {row.eventCount} event{row.eventCount === 1 ? "" : "s"} · {row.hoursBooked}h booked / {row.hoursAvailable}h
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      ) : null}

      {workspace === "messaging" ? (
        <div className="bespoke-demo-messaging-shell">
          <aside className="bespoke-demo-messaging-directory">
            <div className="bespoke-demo-module-head">
              <div>
                <h2>Messaging</h2>
                <p className="muted">Internal workspace chat is included. WhatsApp chat is paid and uses synced contacts with phone numbers.</p>
              </div>
            </div>

            <section className="bespoke-demo-messaging-section">
              <p className="bespoke-demo-sidebar-title">Organization users</p>
              <button
                type="button"
                className={`bespoke-demo-thread-chip${
                  activeThreadId === `${demo.useCaseId}-org-general` ? " bespoke-demo-thread-chip--active" : ""
                }`}
                onClick={() => {
                  setActiveThreadId(`${demo.useCaseId}-org-general`);
                  setMessageDraft((current) => ({ ...current, channel: "internal" }));
                }}
              >
                <span>{demo.brandName} Team</span>
                <small>Shared organization room</small>
              </button>
              {organizationChatUsers.length === 0 ? (
                <p className="muted bespoke-demo-empty-note">No additional tenant users found yet.</p>
              ) : (
                organizationChatUsers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={`bespoke-demo-thread-chip${activeThreadId === `org-${member.id}` ? " bespoke-demo-thread-chip--active" : ""}`}
                    onClick={() => openOrganizationThread(member)}
                  >
                    <span>{member.displayName}</span>
                    <small>{member.email}</small>
                  </button>
                ))
              )}
            </section>

            <section className="bespoke-demo-messaging-section">
              <p className="bespoke-demo-sidebar-title">WhatsApp synced contacts</p>
              <button
                type="button"
                className={`bespoke-demo-whatsapp-upgrade${whatsappEnabled ? " bespoke-demo-whatsapp-upgrade--enabled" : ""}`}
                onClick={() => {
                  if (!whatsappEnabled) showPaidFeatureNotice("WhatsApp workspace chat");
                }}
              >
                <span aria-hidden="true">
                  <WhatsAppIcon />
                </span>
                <strong>{whatsappEnabled ? "WhatsApp enabled" : "WhatsApp paid add-on"}</strong>
                <small>{whatsappEnabled ? "Phone contacts can be messaged" : "Click to view upgrade requirement"}</small>
              </button>
              {whatsappContacts.length === 0 ? (
                <p className="muted bespoke-demo-empty-note">Contacts with telephone numbers will appear here automatically.</p>
              ) : (
                whatsappContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={`bespoke-demo-thread-chip${activeThreadId === `wa-${contact.id}` ? " bespoke-demo-thread-chip--active" : ""}`}
                    onClick={() => openWhatsappThread(contact)}
                  >
                    <span>{contact.name}</span>
                    <small>{contact.phone} · {contact.email}</small>
                  </button>
                ))
              )}
            </section>
          </aside>

          <section className="bespoke-demo-chat-panel">
            {activeMessagingThread ? (
              <>
                <header className="bespoke-demo-chat-head">
                  <div>
                    <h2>{activeMessagingThread.participantName}</h2>
                    <p className="muted">
                      {activeMessagingThread.participantType === "contact"
                        ? `WhatsApp contact · ${activeMessagingThread.participantPhone}`
                        : `Internal organization chat · ${activeMessagingThread.participantEmail}`}
                    </p>
                  </div>
                  <span className={`bespoke-demo-feature-badge${
                    activeMessagingThread.participantType === "contact" && !whatsappEnabled
                      ? " bespoke-demo-feature-badge--locked"
                      : " bespoke-demo-feature-badge--on"
                  }`}>
                    {activeMessagingThread.participantType === "contact"
                      ? whatsappEnabled ? "WhatsApp paid" : "WhatsApp locked"
                      : "Internal included"}
                  </span>
                </header>

                <div className="bespoke-demo-chat-history">
                  {activeMessagingThread.messages.length === 0 ? (
                    <p className="muted bespoke-demo-empty">No messages yet. Start the conversation below.</p>
                  ) : (
                    activeMessagingThread.messages.map((message) => (
                      <article key={message.id} className="bespoke-demo-chat-message">
                        <div>
                          <strong>{message.author}</strong>
                          <span>{message.channel === "whatsapp" ? "WhatsApp" : "Internal"} · {new Date(message.createdAt).toLocaleString()}</span>
                        </div>
                        <p>{message.body}</p>
                      </article>
                    ))
                  )}
                </div>

                <form className="bespoke-demo-chat-composer" onSubmit={sendWorkspaceMessage}>
                  <div className="bespoke-demo-form-grid">
                    <label className="bespoke-demo-field">
                      <span>Channel</span>
                      <select
                        value={messageDraft.channel}
                        onChange={(event) =>
                          setMessageDraft((current) => ({
                            ...current,
                            channel: event.target.value as "internal" | "whatsapp",
                          }))
                        }
                      >
                        <option value="internal">Workspace chat</option>
                        <option value="whatsapp" disabled={!canUseWhatsappThread}>
                          WhatsApp chat {canUseWhatsappThread ? "" : "(paid contact only)"}
                        </option>
                      </select>
                    </label>
                  </div>
                  <label className="bespoke-demo-field">
                    <span>Message</span>
                    <textarea
                      rows={4}
                      value={messageDraft.body}
                      onChange={(event) => setMessageDraft((current) => ({ ...current, body: event.target.value }))}
                      placeholder="Type a workspace message or WhatsApp reply"
                    />
                  </label>
                  {messageDraft.channel === "whatsapp" && !canUseWhatsappThread ? (
                    <p className="bespoke-demo-feature-gate-note">WhatsApp chat is a paid workspace add-on. Internal organization chat remains free.</p>
                  ) : null}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={messageDraft.channel === "whatsapp" && !canUseWhatsappThread}
                  >
                    Send message
                  </button>
                </form>

              </>
            ) : (
              <p className="muted bespoke-demo-empty">Select an organization user or synced phone contact to start messaging.</p>
            )}
          </section>
        </div>
      ) : null}

      {workspace === "settings" ? (
        <div className="bespoke-demo-settings-shell">
          <div className="bespoke-demo-module-head">
            <div>
              <h2>Brand Settings</h2>
              <p className="muted">
                Custom sender name and email signatures for {demo.brandName}. Auto Reply lives under Mail folders.
              </p>
            </div>
          </div>

          {settingsNotice ? (
            <div className="bespoke-demo-incoming-notice bespoke-demo-settings-notice">
              <span>{settingsNotice}</span>
              <button type="button" onClick={() => setSettingsNotice(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="bespoke-demo-settings-grid">
            <section className="bespoke-demo-settings-card">
              <div className="bespoke-demo-settings-card-head">
                <h3>Custom sender name</h3>
                <span className="bespoke-demo-feature-badge bespoke-demo-feature-badge--on">Included</span>
              </div>
              <p className="muted">
                Set how your name appears on outbound mail. The mailbox address stays on your business domain.
              </p>
              <form className="bespoke-demo-form" onSubmit={saveSenderName}>
                <label className="bespoke-demo-field">
                  <span>Display name</span>
                  <input
                    value={senderName}
                    onChange={(event) => setSenderName(event.target.value)}
                    placeholder={composeSeed.defaultSenderName}
                    required
                  />
                </label>
                <label className="bespoke-demo-field">
                  <span>Sender email (mailbox)</span>
                  <input value={composeSeed.defaultSenderEmail} readOnly />
                </label>
                <p className="bespoke-demo-compose-preview-inline">
                  Preview: <strong>{outboundFromHeader}</strong>
                </p>
                <button type="submit" className="btn btn-primary">
                  Save sender name
                </button>
              </form>
            </section>

            <section className="bespoke-demo-settings-card bespoke-demo-settings-card--wide">
              <div className="bespoke-demo-settings-card-head">
                <h3>Email signatures</h3>
                <span className="bespoke-demo-feature-badge bespoke-demo-feature-badge--on">Included</span>
              </div>
              <p className="muted">Two sample signatures are preloaded per business. Edit them, upload an avatar, or create your own.</p>

              <ul className="bespoke-demo-template-list">
                {signatures.map((signature) => (
                  <li
                    key={signature.id}
                    className={`bespoke-demo-template-item${
                      activeSignatureId === signature.id ? " bespoke-demo-template-item--active" : ""
                    }`}
                  >
                    <label className="bespoke-demo-template-select">
                      <input
                        type="radio"
                        name="active-signature"
                        checked={activeSignatureId === signature.id}
                        onChange={() => setActiveSignatureId(signature.id)}
                      />
                      <div>
                        <strong>
                          {signature.name}
                          {signature.isCustom ? " (custom)" : ""}
                        </strong>
                        <SignaturePreview signature={signature} />
                      </div>
                    </label>
                    <button type="button" className="btn btn-ghost" onClick={() => startEditSignature(signature.id)}>
                      Edit
                    </button>
                  </li>
                ))}
              </ul>

              <button type="button" className="btn btn-secondary" onClick={startNewSignature}>
                Create new signature
              </button>

              {editingSignatureId ? (
                <form className="bespoke-demo-form bespoke-demo-inline-editor" onSubmit={saveSignature}>
                  <p className="bespoke-demo-sidebar-title">
                    {editingSignatureId === "new" ? "New signature" : "Edit signature"}
                  </p>
                  <label className="bespoke-demo-field">
                    <span>Signature name</span>
                    <input
                      value={signatureDraft.name}
                      onChange={(event) =>
                        setSignatureDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      required
                    />
                  </label>

                  <div className="bespoke-demo-signature-avatar-editor">
                    <img
                      src={signatureDraft.avatarUrl}
                      alt=""
                      className="bespoke-demo-signature-avatar bespoke-demo-signature-avatar--editor"
                    />
                    <div className="bespoke-demo-signature-avatar-actions">
                      <p className="bespoke-demo-sidebar-title">Signature avatar</p>
                      <p className="muted">Upload a photo from your device or reset to default initials.</p>
                      <div className="bespoke-demo-editor-actions">
                        <label className="btn btn-secondary bespoke-demo-upload-btn">
                          Upload image
                          <input
                            type="file"
                            accept="image/*"
                            className="bespoke-demo-hidden-file"
                            onChange={handleSignatureAvatarUpload}
                          />
                        </label>
                        <button type="button" className="btn btn-ghost" onClick={resetSignatureAvatar}>
                          Reset avatar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bespoke-demo-signature-live-preview">
                    <p className="bespoke-demo-sidebar-title">Preview</p>
                    <SignaturePreview
                      signature={{
                        id: "draft",
                        name: signatureDraft.name,
                        body: signatureDraft.body || "Your signature text will appear here.",
                        avatarUrl: signatureDraft.avatarUrl,
                      }}
                    />
                  </div>

                  <label className="bespoke-demo-field">
                    <span>Signature body</span>
                    <textarea
                      rows={6}
                      value={signatureDraft.body}
                      onChange={(event) =>
                        setSignatureDraft((current) => ({ ...current, body: event.target.value }))
                      }
                      placeholder={"Your Name\nTitle | Company\nPhone | Email"}
                      required
                    />
                  </label>
                  <div className="bespoke-demo-editor-actions">
                    <button type="submit" className="btn btn-primary">
                      Save signature
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setEditingSignatureId(null);
                        setSignatureDraft(emptySignatureDraft());
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {activeMailFolder === "new-mail" ? (
        <div
          className="gmail-compose-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) discardComposeMail();
          }}
        >
          <MailComposeForm
            draft={composeDraft}
            contacts={crmContacts}
            fromHeader={outboundFromHeader}
            whatsappEnabled={whatsappEnabled}
            centered
            onChange={setComposeDraft}
            onSaveDraft={saveDraftMail}
            onSend={sendComposeMail}
            onSchedule={scheduleComposeMail}
            onSendWhatsapp={requestComposeWhatsappSend}
            onDiscard={discardComposeMail}
          />
        </div>
      ) : null}

      <AutoReplyModal
        open={autoReplyModalOpen}
        entitled={autoReplyEntitled}
        daysLeft={autoReplyDaysLeft}
        autoReplyOn={autoReplyOn}
        autoReplies={autoReplies}
        activeAutoReplyId={activeAutoReplyId}
        editingAutoReplyId={editingAutoReplyId}
        autoReplyDraft={autoReplyDraft}
        addonsHref={addonsHref}
        gatePlanLabel="Platform workspace bundle"
        onClose={() => setAutoReplyModalOpen(false)}
        onToggleEnabled={handleAutoReplyToggle}
        onSelectActive={handleSelectActiveAutoReply}
        onStartEdit={startEditAutoReply}
        onStartNew={startNewAutoReply}
        onDraftChange={setAutoReplyDraft}
        onCancelEdit={() => {
          setEditingAutoReplyId(null);
          setAutoReplyDraft({ name: "", subject: "", body: "" });
        }}
        onSaveReply={saveAutoReply}
        onStartSubscription={
          onStartAddonSubscription ? () => void onStartAddonSubscription("auto-reply-functionality") : undefined
        }
      />

    </div>
  );
}
