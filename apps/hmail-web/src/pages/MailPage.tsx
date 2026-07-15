import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAutoMailPush } from "../hooks/useAutoMailPush";
import { useRegisterBespokeCompose } from "../context/BespokeComposeBridge";
import { useOptionalMailFooterNavBridge, useRegisterMailFooterNav } from "../context/MailFooterNavBridge";
import { useAddons } from "../context/AddonContext";
import { AddonUpsellPanel } from "../components/AddonUpsellPanel";
import type { ComposeInitial } from "../components/ComposeModal";
import { sanitizeMailHtml } from "../lib/sanitizeHtml";
import { UndoSendToast, type PendingUndoSend } from "../components/UndoSendToast";
import { SentMessageToast } from "../components/SentMessageToast";
import { OpenTrackingOpenToast } from "../components/OpenTrackingOpenToast";
import { useOpenTrackingNotifications } from "../hooks/useOpenTrackingNotifications";
import { CvScannerToast } from "../components/CvScannerToast";
import type { CareerScannerPreload } from "../components/CareerScannerPanel";
import {
  canShowCvScannerToast,
  recordCvScannerToastShown,
  setCvScannerDontAskAgain,
} from "../lib/cvScannerToastPrefs";
import { InboxSwitcher, type InboxSwitcherHandle, type MailAccountSummary } from "../components/InboxSwitcher";
import { InboxConnectResultToast } from "../components/InboxConnectResultToast";
import { InboxSwitchSuccessToast } from "../components/InboxSwitchSuccessToast";
import { MultiInboxConnectToast } from "../components/MultiInboxConnectToast";
import { PaidAddonToast } from "../components/PaidAddonToast";
import { MessageUnsubscribeButton } from "../components/MessageUnsubscribeButton";
import {
  DeleteIcon,
  ForwardIcon,
  MarkUnreadIcon,
  PdfIcon,
  PrintIcon,
  ReadActionButton,
  ReplyAllIcon,
  ReplyIcon,
  TrashIcon,
  WhatsAppIcon,
} from "../components/ReadActionButton";
import { MessageAttachmentsSection } from "../components/MessageAttachmentsSection";
import {
  isMultiInboxPromptDismissed,
  setMultiInboxPromptDismissed,
} from "../lib/multiInboxPromptPrefs";
import { resolveInboxPath } from "../components/DocumentsPanel";
import { FolderNav, folderDisplayLabel, resolveFolderKind, sortFolders } from "../components/FolderNav";
import { MailBespokeChrome } from "../components/MailBespokeChrome";
import { resolveTenantUi } from "../utils/tenantUi";
import { HMailLogo } from "../components/HMailLogo";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { MailBulkActions } from "../components/MailBulkActions";
import { MailOrderBar } from "../components/MailOrderBar";
import { MailListLoadMore } from "../components/MailListLoadMore";
import { GmailMailSearch, isGmailStyleQuery } from "../components/GmailMailSearch";
import { NewFolderModal } from "../components/NewFolderModal";
import { isDeferredProductionVirtualView } from "../components/deferredProductionVirtualViews";
import { LazyProductionVirtualView } from "../components/LazyProductionVirtualView";
import { renderProductionVirtualView } from "../components/ProductionVirtualViews";
import { SenderGroupedMessageList, senderLabel } from "../components/SenderGroupedMessageList";
import { encodeSenderKey } from "../utils/senderAvatar";
import { MessageTableHead } from "../components/MessageTableHead";
import { useMailListPaneResize } from "../hooks/useMailListPaneResize";
import { extractEmailFromHeader } from "../utils/senderAvatar";
import { MailBottomNavButton } from "../components/MailBottomNavButton";
import {
  MobileDrawerTooltip,
  mobileDrawerTooltipHandlers,
  type MobileDrawerTooltipState,
} from "../components/MobileDrawerTooltip";
import { Folder, Inbox, PanelRight, SquarePen, X } from "lucide-react";
import { isIosTabletMailLayout, isMobileScreen } from "../utils/pwaPlatform";
import { useMailListChromeViewport } from "../hooks/useMailListChromeViewport";
import { useMessageListAtEnd } from "../hooks/useMessageListAtEnd";
import { useMessageListHeadReveal } from "../hooks/useMessageListHeadReveal";
import { useReadPaneHeadReveal } from "../hooks/useReadPaneHeadReveal";
import { useMobileReadBodyFit } from "../hooks/useMobileReadBodyFit";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { JobHunterPromoToast } from "../components/JobHunterPromoToast";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import { toolAddonSlug } from "../constants/addonTools";
import {
  folderSupportsBulkActions,
  folderUsesCollapsibleListHead,
  folderUsesSenderGrouping,
  senderGroupByForList,
  EMPTY_MAIL_SEARCH,
  isVirtualView,
  virtualViewTitle,
  VIEW_CONTACTS,
  VIEW_CAREER_SCANNER,
  VIEW_OPEN_TRACKING,
  type MailSearchState,
  type MailStatusFilter,
} from "../constants/mailViews";
import type { MailFolder, MailMessageDetail, MailMessageSummary, MailSortField, MailSortOrder } from "../types/mail";
import "./MailPage.css";
import "../components/ContactsPanel.css";

const PAGE_SIZE = 30;

function mergeMessagePages(
  previous: MailMessageSummary[],
  incoming: MailMessageSummary[],
): MailMessageSummary[] {
  if (incoming.length === 0) return previous;
  const seen = new Set(previous.map((message) => message.uid));
  const merged = [...previous];
  for (const message of incoming) {
    if (seen.has(message.uid)) continue;
    seen.add(message.uid);
    merged.push(message);
  }
  return merged;
}
const MAIL_SIDEBAR_COLLAPSED_KEY = "pmail-mail-sidebar-collapsed-v3";
/** Desktop/tablet/laptop only: Gmail-style list without a permanent right reading pane. */
const MAIL_READING_PANE_KEY = "pmail-mail-reading-pane-enabled-v1";

function readSidebarCollapsedPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(MAIL_SIDEBAR_COLLAPSED_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    /* ignore */
  }
  return null;
}

function readReadingPaneEnabledPreference(): boolean {
  try {
    return localStorage.getItem(MAIL_READING_PANE_KEY) === "1";
  } catch {
    return false;
  }
}

function defaultSidebarCollapsed(): boolean {
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
    return false;
  }
  return true;
}

type MobilePane = "list" | "read" | "menu";

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFolderTitle(activeFolder: string, folderMeta: MailFolder | undefined): string {
  if (isVirtualView(activeFolder)) return virtualViewTitle(activeFolder);
  return folderMeta ? folderDisplayLabel(folderMeta) : "Mailbox";
}

const ADDON_UPSELL_COPY: Record<string, { name: string; description: string }> = {
  "scheduled-send": {
    name: "Scheduled Send",
    description: "Queue messages to send at a later date and time.",
  },
  "immigration-templates": {
    name: "Immigration Template Pack",
    description: "Canada-specific email templates with merge fields.",
  },
  "immigration-desk": {
    name: "Immigration Desk",
    description: "Client and matter CRM with UCI and program tracking.",
  },
  "program-checklists": {
    name: "Program Checklists",
    description: "IMM forms and supporting document checklists per matter.",
  },
  "compliance-pack": {
    name: "Compliance Pack",
    description: "Audit trail for regulated immigration practice.",
  },
  "ircc-mail-intel": {
    name: "IRCC Mail Intelligence",
    description: "Auto-classify IRCC correspondence and priority items.",
  },
  "case-linked-mail": {
    name: "Case-Linked Mail",
    description: "Link email threads to client matters.",
  },
  "deadline-guard": {
    name: "Deadline Guard",
    description: "Track IRCC deadlines and document expiry dates.",
  },
  "client-portal": {
    name: "Client Portal",
    description: "Secure document requests and portal links per matter.",
  },
  "bespoke-workspace": {
    name: "Bespoke Workspace",
    description: "CRM pipeline, reminders, and industry tools in one workspace.",
  },
  "open-tracking": {
    name: "Open Tracking",
    description: "Track when recipients open your sent messages.",
  },
  "file-vault-functionality": {
    name: "File Vault",
    description: "Send large files via secure download links and manage your vault.",
  },
  "multi-inbox-functionality": {
    name: "Multiple Inboxes",
    description: "Connect additional mailboxes and switch between them in your workspace.",
  },
  "inbox-cleanup-functionality": {
    name: "Inbox Cleanup",
    description: "Bulk clean high-volume senders and one-click unsubscribe from marketing mail.",
  },
  "attachment-categorize-functionality": {
    name: "Attachment Categories",
    description: "Auto-classify inbox attachments and export categorized files to vault for compose.",
  },
  "esign-from-email-functionality": {
    name: "E-Sign from Email",
    description: "Send PDF and Word attachments for e-signature via Dropbox Sign with secure download links.",
  },
  "email-sla-tracker-functionality": {
    name: "Email SLA Tracker",
    description: "Track inbound thread response times with at-risk and breach alerts, plus compose reply handoff.",
  },
  "full-calendar-functionality": {
    name: "Full Calendar",
    description: "Month and week calendar views with workspace events.",
  },
  "whatsapp-functionality": {
    name: "WhatsApp",
    description: "Send message summaries to WhatsApp from the read pane.",
  },
  "mail2pdf-functionality": {
    name: "Mail 2 PDF",
    description: "Export mailbox messages to PDF from the sidebar tool or the read-pane action.",
  },
  "re-listing-board": {
    name: "Listing Board",
    description: "Manage property listings and buyer interest.",
  },
  "re-showing-scheduler": {
    name: "Showing Scheduler",
    description: "Schedule and confirm property showings.",
  },
  "re-quick-replies": {
    name: "Quick Replies",
    description: "Real-estate reply templates with merge fields.",
  },
  "re-deal-room": {
    name: "Deal Room",
    description: "Track offers and deal notes per listing.",
  },
};

function renderGatedView(
  view: string,
  hasAddon: (slug: string) => boolean,
  panel: React.ReactNode,
  panelWorkspaceTrial?: import("../types/addon").PanelWorkspaceTrialStatus | null,
) {
  const slug = toolAddonSlug(view);
  if (slug && !hasAddon(slug)) {
    const copy = ADDON_UPSELL_COPY[slug];
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

export type MailPageProps = {
  embedded?: boolean;
  shellThemeVersion?: "dark" | "light";
  searchDraft?: MailSearchState;
  onSearchDraftChange?: (next: MailSearchState) => void;
  appliedSearch?: MailSearchState;
  onAppliedSearchChange?: (next: MailSearchState) => void;
  /** When set, navigates mail to this folder/view (`null` = return to inbox). */
  requestedFolder?: string | null;
  onRequestedFolderHandled?: () => void;
  onActiveFolderChange?: (folder: string) => void;
  onCareerNavUnlockedChange?: (unlocked: boolean) => void;
  /** When embedded in the bespoke shell, return to the inbox workspace before footer actions. */
  onEmbeddedShellActivate?: () => void;
  /** When embedded, use shell navigation (full page) to reach the add-ons marketplace. */
  onOpenAddons?: (highlightSlug?: string) => void;
};

const ComposeModal = lazy(() =>
  import("../components/ComposeModal").then((module) => ({ default: module.ComposeModal })),
);

export function MailPage({
  embedded = false,
  shellThemeVersion,
  searchDraft: externalSearchDraft,
  onSearchDraftChange,
  appliedSearch: externalAppliedSearch,
  onAppliedSearchChange,
  requestedFolder,
  onRequestedFolderHandled,
  onActiveFolderChange,
  onCareerNavUnlockedChange,
  onEmbeddedShellActivate,
  onOpenAddons: onOpenAddonsExternal,
}: MailPageProps = {}) {
  const { user, logout } = useAuth();
  const { hasAddon, hasJobHunterAccess, panelWorkspaceTrial, refresh: refreshAddons } = useAddons();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const referFriendDeepLinkHandled = useRef(false);
  const branding = user?.tenant.branding;
  const productName = branding?.productName ?? "PMail+";
  const tenantName = user?.tenant.name ?? "Prohost Cloud";

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const messagePageRef = useRef(1);
  const fetchGenerationRef = useRef(0);
  const selectedUidRef = useRef<number | null>(null);
  const loadMessagesRef = useRef<
    ((options?: { silent?: boolean; page?: number; append?: boolean }) => Promise<void>) | null
  >(null);
  const resetMessagePage = useCallback(() => {
    messagePageRef.current = 1;
  }, []);
  const [sortBy, setSortBy] = useState<MailSortField>("date");
  const [sortOrder, setSortOrder] = useState<MailSortOrder>("desc");
  const [contactSuggestions, setContactSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [contactsPrefillEmail, setContactsPrefillEmail] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  selectedUidRef.current = selectedUid;
  const [selectedUids, setSelectedUids] = useState<number[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessageDetail | null>(null);
  const [mailFilter, setMailFilter] = useState<MailStatusFilter>("all");
  const [internalSearchDraft, setInternalSearchDraft] = useState<MailSearchState>({ field: "subject", query: "" });
  const [internalAppliedSearch, setInternalAppliedSearch] = useState<MailSearchState>({ field: "subject", query: "" });
  const searchDraft = externalSearchDraft ?? internalSearchDraft;
  const setSearchDraft = onSearchDraftChange ?? setInternalSearchDraft;
  const appliedSearch = externalAppliedSearch ?? internalAppliedSearch;
  const setAppliedSearch = onAppliedSearchChange ?? setInternalAppliedSearch;
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pagingMessages, setPagingMessages] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [listError, setListError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<ComposeInitial | undefined>();
  const [pendingUndoSend, setPendingUndoSend] = useState<PendingUndoSend | null>(null);
  const [showSentMessageToast, setShowSentMessageToast] = useState(false);
  const [cvScannerToastFile, setCvScannerToastFile] = useState<File | null>(null);
  const [careerScannerPreload, setCareerScannerPreload] = useState<CareerScannerPreload | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readSidebarCollapsedPreference() ?? defaultSidebarCollapsed(),
  );
  /** When false (default), desktop/tablet/laptop show Gmail-style full-width list until a message opens. */
  const [readingPaneEnabled, setReadingPaneEnabled] = useState(readReadingPaneEnabledPreference);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [closeDrawerTooltip, setCloseDrawerTooltip] = useState<MobileDrawerTooltipState>(null);
  const [expandedSenderEmails, setExpandedSenderEmails] = useState<Set<string>>(() => new Set());
  const [uiThemeVersion, setUiThemeVersion] = useState<"dark" | "light">(
    (user?.uiThemeVersion as "dark" | "light" | undefined) ?? "light",
  );
  const messageLoadGenerationRef = useRef(0);
  const activeThemeVersion = embedded && shellThemeVersion ? shellThemeVersion : uiThemeVersion;
  const mobileDrawerMenuOpen = mobilePane === "menu";
  const closeDrawerTooltipProps = mobileDrawerMenuOpen
    ? mobileDrawerTooltipHandlers("Close", setCloseDrawerTooltip)
    : {};
  const [platformNotice, setPlatformNotice] = useState("");
  const [careerNavUnlocked, setCareerNavUnlocked] = useState(false);
  const [showJobHunterPromoToast, setShowJobHunterPromoToast] = useState(false);
  const [referBusy, setReferBusy] = useState(false);
  const [paidAddonGate, setPaidAddonGate] = useState<{ slug: string; name: string } | null>(null);
  const [multiInboxPromptOpen, setMultiInboxPromptOpen] = useState(false);
  const [inboxConnectToast, setInboxConnectToast] = useState<"success" | "error" | null>(null);
  const [inboxSwitchToast, setInboxSwitchToast] = useState<MailAccountSummary | null>(null);
  const [mailAccountCount, setMailAccountCount] = useState<number | null>(null);
  const inboxSwitcherRef = useRef<InboxSwitcherHandle>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const readPaneRef = useRef<HTMLElement>(null);
  const readBodyContentRef = useRef<HTMLDivElement>(null);
  const [mobileMailViewport, setMobileMailViewport] = useState(() => isMobileScreen());
  const [iosTabletMailLayout, setIosTabletMailLayout] = useState(() => isIosTabletMailLayout());
  const mailListChromeViewport = useMailListChromeViewport();
  const hasOpenTrackingAddon = hasAddon("open-tracking");
  const { notification: openTrackingNotification, dismissNotification: dismissOpenTrackingNotification } =
    useOpenTrackingNotifications(hasOpenTrackingAddon);
  const hasMultiInboxAddon = hasAddon("multi-inbox-functionality");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileMailViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1099px)");
    const sync = () => setIosTabletMailLayout(isIosTabletMailLayout());
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useAutoMailPush(user?.id);

  useEffect(() => {
    if (paidAddonGate && panelWorkspaceTrial?.active) {
      setPaidAddonGate(null);
    }
  }, [paidAddonGate, panelWorkspaceTrial?.active]);

  useEffect(() => {
    if (mobilePane !== "menu") {
      setCloseDrawerTooltip(null);
    }
  }, [mobilePane]);

  useEffect(() => {
    if (!platformNotice) return;
    const timer = window.setTimeout(() => setPlatformNotice(""), 2000);
    return () => window.clearTimeout(timer);
  }, [platformNotice]);

  const openPaidAddonGate = useCallback((slug: string, label?: string) => {
    const copy = ADDON_UPSELL_COPY[slug];
    setPaidAddonGate({ slug, name: copy?.name ?? label ?? "Add-on" });
  }, []);

  const openAddonMarketplace = useCallback(
    (highlightSlug?: string) => {
      setMobilePane("list");
      if (onOpenAddonsExternal) {
        onOpenAddonsExternal(highlightSlug);
        return;
      }
      navigate(highlightSlug ? `/addons?highlight=${highlightSlug}` : "/addons");
    },
    [navigate, onOpenAddonsExternal],
  );

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(MAIL_SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const businessVertical = user?.businessVertical ?? null;
  const hasJobHunterAddon = hasJobHunterAccess();
  const inboxPath = useMemo(() => resolveInboxPath(folders), [folders]);

  const sortedFolders = useMemo(() => sortFolders(folders), [folders]);
  const isVirtual = isVirtualView(activeFolder);
  const desktopSplitResizeEnabled = !embedded && !isVirtual && readingPaneEnabled;
  const { listPaneWidth, isResizing, startResize } = useMailListPaneResize(desktopSplitResizeEnabled);

  const activeFolderMeta =
    sortedFolders.find((f) => f.path === activeFolder) ??
    ({
      path: activeFolder,
      name: getFolderTitle(activeFolder, undefined),
      delimiter: "/",
      flags: [],
      listed: true,
    } as MailFolder);

  const activeFolderKind = isVirtual ? null : resolveFolderKind(activeFolderMeta);
  const useSenderGrouping =
    !isVirtualView(activeFolder) && folderUsesSenderGrouping(activeFolderKind, mailFilter);
  const senderGroupBy = senderGroupByForList(activeFolderKind, mailFilter);
  const listHeadRevealEnabled = folderUsesCollapsibleListHead(activeFolderKind, mailFilter);
  const listHeadResetKey = `${activeFolder}:${mailFilter}`;
  const listHeadRevealed = useMessageListHeadReveal(messageListRef, listHeadRevealEnabled, listHeadResetKey);
  const readHeadResetKey = `${activeFolder}:${selectedUid ?? "none"}`;
  const readHeadRevealEnabled = mailListChromeViewport && Boolean(selectedUid && selectedMessage);
  const readHeadRevealed = useReadPaneHeadReveal(readPaneRef, readHeadRevealEnabled, readHeadResetKey);
  useMobileReadBodyFit(
    readBodyContentRef,
    mailListChromeViewport && Boolean(selectedMessage?.html),
    readHeadResetKey,
  );
  const activeFolderLabel = getFolderTitle(activeFolder, activeFolderMeta);
  const listPaneTitle = mailFilter === "starred" ? "Starred" : activeFolderLabel;
  const activeMailboxEmail = user?.activeMailAccount?.email ?? user?.email ?? "";
  const listWelcomeMailbox = activeMailboxEmail || "User";
  const tenantUi = resolveTenantUi(user);
  const contactsWorkspaceHidden = tenantUi.hiddenWorkspaces.includes("contacts");
  const showBulkBar = activeFolderKind ? folderSupportsBulkActions(activeFolderKind) : false;
  /** Match mobile footer: always expose mailboxes control (entitlement gated inside InboxSwitcher). */
  const showInboxSwitcher = !isVirtual;

  const clearMailSearch = useCallback(() => {
    setSearchDraft(EMPTY_MAIL_SEARCH);
    setAppliedSearch(EMPTY_MAIL_SEARCH);
    messagePageRef.current = 1;
  }, [setAppliedSearch, setSearchDraft]);

  const selectFolder = useCallback(
    (path: string) => {
      messagePageRef.current = 1;
      setMailFilter("all");
      setActiveFolder(path);
      setSelectedUid(null);
      setSelectedMessage(null);
      setSelectedUids([]);
      clearMailSearch();
      setMobilePane("list");
    },
    [clearMailSearch],
  );

  const openStarredView = useCallback(() => {
    if (embedded) onEmbeddedShellActivate?.();
    messagePageRef.current = 1;
    const inbox =
      folders.find((folder) => resolveFolderKind(folder) === "inbox")?.path ??
      sortedFolders.find((folder) => resolveFolderKind(folder) === "inbox")?.path ??
      "INBOX";
    // Starred is a filter over Inbox so Trash ↔ Starred never shares incompatible state.
    setActiveFolder(inbox);
    setMailFilter("starred");
    setSelectedUid(null);
    setSelectedMessage(null);
    setSelectedUids([]);
    clearMailSearch();
    setMobilePane("list");
  }, [clearMailSearch, embedded, folders, onEmbeddedShellActivate, sortedFolders]);

  useEffect(() => {
    if (requestedFolder === undefined) return;
    const target = requestedFolder ?? inboxPath ?? "INBOX";
    selectFolder(target);
    onRequestedFolderHandled?.();
  }, [requestedFolder, inboxPath, onRequestedFolderHandled, selectFolder]);

  useEffect(() => {
    onActiveFolderChange?.(activeFolder);
  }, [activeFolder, onActiveFolderChange]);

  useEffect(() => {
    if (!useSenderGrouping) {
      setExpandedSenderEmails(new Set());
      return;
    }
    setExpandedSenderEmails(new Set());
  }, [activeFolder, useSenderGrouping]);

  useEffect(() => {
    if (!showInboxSwitcher || !hasMultiInboxAddon) return;
    if (mailAccountCount === null || mailAccountCount > 1) return;
    if (isMultiInboxPromptDismissed()) return;
    setMultiInboxPromptOpen(true);
  }, [showInboxSwitcher, hasMultiInboxAddon, mailAccountCount]);
  const toggleReadingPane = useCallback(() => {
    setReadingPaneEnabled((current) => {
      const next = !current;
      try {
        localStorage.setItem(MAIL_READING_PANE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const contentPane = isVirtual || !selectedUid ? "list" : "read";
  const isLoadingSelectedMessage = Boolean(
    selectedUid &&
      (loadingMessage || !selectedMessage || selectedMessage.uid !== selectedUid),
  );
  const listInfiniteScrollEnabled =
    !isVirtual &&
    messages.length > 0 &&
    messages.length < messageTotal &&
    mobilePane !== "read" &&
    mobilePane !== "menu";
  const messageListAtEnd = useMessageListAtEnd(
    messageListRef,
    listInfiniteScrollEnabled,
    `${activeFolder}-${messages.length}-${messageTotal}`,
  );
  const hasMoreMessages = messages.length < messageTotal;

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const { folders: data } = await api.folders();
      setFolders(data);
      setListError("");
      if (!isVirtualView(activeFolder) && !data.some((f) => f.path === activeFolder) && data[0]) {
        setActiveFolder(data[0].path);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  }, [activeFolder, user?.activeMailAccount?.id]);

  useEffect(() => {
    const mailFolder = searchParams.get("mailFolder");
    const uidParam = searchParams.get("uid");
    const view = searchParams.get("view");

    if (mailFolder && uidParam) {
      const uid = Number(uidParam);
      if (Number.isFinite(uid)) {
        setActiveFolder(mailFolder);
        setSelectedUid(uid);
        setMobilePane("read");
      }
    } else if (view && isVirtualView(view)) {
      setActiveFolder(view);
    }

    if (mailFolder || uidParam || view) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    api
      .getJobHunterSettings()
      .then((res) => {
        setCareerNavUnlocked(res.settings.careerNavUnlocked);
        setShowJobHunterPromoToast(Boolean(res.settings.showJobHunterPromoToast));
        onCareerNavUnlockedChange?.(res.settings.careerNavUnlocked);
      })
      .catch(() => {
        setCareerNavUnlocked(false);
        setShowJobHunterPromoToast(false);
        onCareerNavUnlockedChange?.(false);
      });
  }, [onCareerNavUnlockedChange]);

  const refreshCareerNav = useCallback(() => {
    api
      .getJobHunterSettings()
      .then((res) => {
        setCareerNavUnlocked(res.settings.careerNavUnlocked);
        setShowJobHunterPromoToast(Boolean(res.settings.showJobHunterPromoToast));
        onCareerNavUnlockedChange?.(res.settings.careerNavUnlocked);
      })
      .catch(() => {
        setCareerNavUnlocked(false);
        setShowJobHunterPromoToast(false);
        onCareerNavUnlockedChange?.(false);
      });
  }, [onCareerNavUnlockedChange]);

  const handleMailboxSwitch = useCallback(() => {
    setActiveFolder("INBOX");
    setSelectedUid(null);
    setSelectedMessage(null);
    setSelectedUids([]);
    resetMessagePage();
    setAppliedSearch({ field: "subject", query: "", scope: "all" });
    setSearchDraft({ field: "subject", query: "", scope: "all" });
    setMailFilter("all");
  }, [resetMessagePage, setAppliedSearch, setSearchDraft]);

  const activeMailAccountId = user?.activeMailAccount?.id ?? null;
  const previousMailAccountIdRef = useRef<string | null>(activeMailAccountId);

  useEffect(() => {
    const previousId = previousMailAccountIdRef.current;
    previousMailAccountIdRef.current = activeMailAccountId;
    if (!previousId || !activeMailAccountId || previousId === activeMailAccountId) return;
    handleMailboxSwitch();
  }, [activeMailAccountId, handleMailboxSwitch]);

  const loadMessages = useCallback(async (options?: { silent?: boolean; page?: number; append?: boolean }) => {
    if (isVirtualView(activeFolder)) return;

    const append = options?.append === true;
    const targetPage = options?.page ?? (append ? messagePageRef.current + 1 : messagePageRef.current);
    const generation = ++fetchGenerationRef.current;
    const silent = options?.silent === true;
    const isPaging = append || options?.page != null;

    // Reset all list-loading flags so a superseded request cannot leave a spinner stuck.
    setLoadingMessages(false);
    setPagingMessages(false);
    setListRefreshing(false);
    if (isPaging) {
      setPagingMessages(true);
    } else if (silent) {
      setListRefreshing(true);
    } else {
      setLoadingMessages(true);
    }
    setListError("");
    try {
      const searchText = appliedSearch.query.trim();
      const gmailSearch =
        isGmailStyleQuery(searchText) ||
        (appliedSearch.scope != null && appliedSearch.scope !== "all");
      const result = await api.messages(activeFolder, {
        page: targetPage,
        pageSize: PAGE_SIZE,
        searchField: searchText && !gmailSearch ? appliedSearch.field : undefined,
        searchQuery: searchText || undefined,
        filter: mailFilter,
        sortBy,
        sortOrder,
      });
      if (generation !== fetchGenerationRef.current) return;

      messagePageRef.current = targetPage;
      setMessages((prev) => {
        const next = append ? mergeMessagePages(prev, result.messages) : result.messages;
        setSelectedUids((uids) => uids.filter((uid) => next.some((message) => message.uid === uid)));
        if (selectedUidRef.current && !next.some((message) => message.uid === selectedUidRef.current)) {
          setSelectedUid(null);
          setSelectedMessage(null);
          setMobilePane("list");
        }
        return next;
      });
      setMessageTotal(result.total);
      const normalizedFolder = activeFolder.trim().toLowerCase();
      if (normalizedFolder === "inbox" || normalizedFolder === "sent") {
        refreshCareerNav();
      }
      if (silent && targetPage === 1) {
        void api.presenceHeartbeat().catch(() => undefined);
      }
    } catch (err) {
      if (generation === fetchGenerationRef.current) {
        setListError(err instanceof Error ? err.message : "Failed to load messages");
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoadingMessages(false);
        setPagingMessages(false);
        setListRefreshing(false);
      }
    }
  }, [activeFolder, appliedSearch, mailFilter, sortBy, sortOrder, refreshCareerNav]);

  loadMessagesRef.current = loadMessages;

  const listQueryRevision = useMemo(
    () =>
      [
        activeFolder,
        appliedSearch.field,
        appliedSearch.query,
        appliedSearch.scope ?? "all",
        mailFilter,
        sortBy,
        sortOrder,
      ].join("|"),
    [activeFolder, appliedSearch, mailFilter, sortBy, sortOrder],
  );

  const refreshInboxAfterSend = useCallback(async () => {
    await loadFolders();
    const inboxPath = sortedFolders.find((f) => resolveFolderKind(f) === "inbox")?.path ?? "INBOX";
    setActiveFolder(inboxPath);
    setSelectedUid(null);
    setSelectedMessage(null);
    setMobilePane("list");
    setLoadingMessages(true);
    try {
      messagePageRef.current = 1;
      const result = await api.messages(inboxPath, {
        filter: mailFilter,
        page: 1,
        pageSize: PAGE_SIZE,
        sortBy,
        sortOrder,
      });
      setMessages(result.messages);
      setMessageTotal(result.total);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setLoadingMessages(false);
    }
  }, [sortedFolders, loadFolders, mailFilter, sortBy, sortOrder]);

  useEffect(() => {
    const inboxPath = folders.find((f) => resolveFolderKind(f) === "inbox")?.path;
    if (
      contactsWorkspaceHidden ||
      isVirtualView(activeFolder) ||
      !inboxPath ||
      activeFolder !== inboxPath ||
      messages.length === 0
    ) {
      setContactSuggestions([]);
      return;
    }
    const emails = messages.map((m) => extractEmailFromHeader(m.from)).filter(Boolean);
    api
      .suggestContacts(emails)
      .then((res) => setContactSuggestions(res.suggestions))
      .catch(() => setContactSuggestions([]));
  }, [messages, activeFolder, folders, contactsWorkspaceHidden]);

  const loadMessage = useCallback(
    async (uid: number) => {
      const generation = ++messageLoadGenerationRef.current;
      setLoadingMessage(true);
      setMessageError("");
      setSelectedMessage((current) => (current?.uid === uid ? current : null));
      try {
        const { message } = await api.message(activeFolder, uid);
        if (generation !== messageLoadGenerationRef.current) return;
        setSelectedMessage(message);
        setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
      } catch (err) {
        if (generation !== messageLoadGenerationRef.current) return;
        setMessageError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        if (generation === messageLoadGenerationRef.current) {
          setLoadingMessage(false);
        }
      }
    },
    [activeFolder],
  );

  const refreshMailInbox = useCallback(async () => {
    await loadFolders();
    messagePageRef.current = 1;
    await loadMessages({ silent: true, page: 1 });
    if (selectedUid && !isVirtualView(activeFolder)) {
      await loadMessage(selectedUid);
    }
  }, [loadFolders, loadMessages, loadMessage, selectedUid, activeFolder]);

  const canRefreshMailList = !isVirtualView(activeFolder);
  const enablePullToRefresh = canRefreshMailList && isMobileScreen();

  useForegroundRefresh(refreshMailInbox, canRefreshMailList);

  const { pullDistance, isRefreshing: pullRefreshing, threshold: pullThreshold } = usePullToRefresh(
    messageListRef,
    refreshMailInbox,
    enablePullToRefresh,
  );

  const showPullIndicator = enablePullToRefresh && (pullDistance > 0 || pullRefreshing || listRefreshing);
  const pullIndicatorHeight = pullRefreshing || listRefreshing ? pullThreshold : pullDistance;
  const pullIndicatorLabel = pullRefreshing || listRefreshing
    ? "Refreshing…"
    : pullDistance >= pullThreshold
      ? "Release to refresh"
      : "Pull to refresh";

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    resetMessagePage();
    void loadMessagesRef.current?.({ page: 1 });
  }, [listQueryRevision, resetMessagePage]);

  useEffect(() => {
    if (!listInfiniteScrollEnabled || !messageListAtEnd || !hasMoreMessages || pagingMessages || loadingMessages) {
      return;
    }
    void loadMessages({ append: true });
  }, [
    hasMoreMessages,
    listInfiniteScrollEnabled,
    loadMessages,
    loadingMessages,
    messageListAtEnd,
    pagingMessages,
  ]);

  useEffect(() => {
    if (selectedUid && !isVirtual) loadMessage(selectedUid);
  }, [selectedUid, loadMessage, isVirtual]);

  const selectMessage = (uid: number) => {
    setSelectedUid(uid);
    setSelectedMessage((current) => (current?.uid === uid ? current : null));
    setLoadingMessage(true);
    setMessageError("");
    setMobilePane("read");
  };

  const clearSelectedMessage = () => {
    setSelectedUid(null);
    setSelectedMessage(null);
    setMessageError("");
    setMobilePane("list");
  };

  const toggleSelectUid = (uid: number) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid],
    );
  };

  const toggleSelectAll = () => {
    if (selectedUids.length === messages.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(messages.map((m) => m.uid));
    }
  };

  const toggleSelectSenderGroup = (uids: number[]) => {
    setSelectedUids((prev) => {
      const allSelected = uids.length > 0 && uids.every((uid) => prev.includes(uid));
      if (allSelected) {
        return prev.filter((uid) => !uids.includes(uid));
      }
      return [...new Set([...prev, ...uids])];
    });
  };

  const [deletingSenderEmail, setDeletingSenderEmail] = useState<string | null>(null);

  const onDeleteSenderGroup = async (email: string, uids: number[], fromHeader: string) => {
    const label = senderLabel(fromHeader);
    const visibleCount = uids.length;
    const usesFolderCleanup = hasAddon("inbox-cleanup-functionality");
    const prompt = usesFolderCleanup
      ? `Delete all messages from ${label} in this folder?`
      : `Delete ${visibleCount} message${visibleCount === 1 ? "" : "s"} from ${label}?`;

    if (!window.confirm(prompt)) return;

    setListError("");
    setDeletingSenderEmail(email);
    try {
      if (usesFolderCleanup) {
        await api.runSenderCleanup({
          folder: activeFolder,
          senderKey: encodeSenderKey(email),
          action: "delete",
        });
      } else {
        await api.bulkAction(activeFolder, uids, "delete");
      }

      if (selectedUid && uids.includes(selectedUid)) {
        setSelectedUid(null);
        setSelectedMessage(null);
        setMobilePane("list");
      }

      setSelectedUids((prev) => prev.filter((uid) => !uids.includes(uid)));
      await loadMessages();
      await loadFolders();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not delete sender messages");
    } finally {
      setDeletingSenderEmail(null);
    }
  };

  const mobileGoBack = () => {
    if (mobilePane === "read") {
      clearSelectedMessage();
      return;
    }
    if (mobilePane === "menu") {
      setMobilePane("list");
    }
  };

  const swipeBackEnabled = mailListChromeViewport && (mobilePane === "read" || mobilePane === "menu");
  const swipeBackHandlers = useSwipeBack(mobileGoBack, swipeBackEnabled);

  const activateEmbeddedShell = useCallback(() => {
    if (embedded) onEmbeddedShellActivate?.();
  }, [embedded, onEmbeddedShellActivate]);

  const openMobileFolders = useCallback(() => {
    activateEmbeddedShell();
    clearMailSearch();
    setMobilePane("menu");
  }, [activateEmbeddedShell, clearMailSearch]);

  const openMobileMessages = useCallback(() => {
    activateEmbeddedShell();
    setComposeOpen(false);
    setComposeInitial(undefined);
    setNewFolderOpen(false);
    setCvScannerToastFile(null);
    setCareerScannerPreload(null);
    setCloseDrawerTooltip(null);
    setMessageError("");
    setMailFilter("all");
    const targetInbox = inboxPath || "INBOX";
    selectFolder(targetInbox);
    requestAnimationFrame(() => {
      messageListRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });
    void loadMessagesRef.current?.({ page: 1 });
  }, [activateEmbeddedShell, inboxPath, selectFolder]);

  const footerNavBridge = useOptionalMailFooterNavBridge();
  const footerNavHandlers = useMemo(
    () => ({
      openFolders: openMobileFolders,
      openMessages: openMobileMessages,
    }),
    [openMobileFolders, openMobileMessages],
  );

  useRegisterMailFooterNav(footerNavHandlers, embedded && Boolean(footerNavBridge));

  useEffect(() => {
    if (!embedded || !footerNavBridge) return;
    footerNavBridge.setState({ mobilePane });
  }, [embedded, footerNavBridge, mobilePane]);

  const junkFolder = folders.find((f) => resolveFolderKind(f) === "junk");
  const isTrashFolder = activeFolderKind === "trash";

  const runBulkAction = async (
    action: "markRead" | "markUnread" | "delete" | "move" | "reportSpam",
    targetFolder?: string,
  ) => {
    if (selectedUids.length === 0) return;
    setListError("");
    try {
      await api.bulkAction(activeFolder, selectedUids, action, targetFolder);
      setSelectedUids([]);
      setSelectedUid(null);
      setSelectedMessage(null);
      setMobilePane("list");
      await loadMessages();
      await loadFolders();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Bulk action failed");
    }
  };

  const onDelete = async () => {
    if (!selectedUid) return;
    setListError("");
    try {
      await api.deleteMessage(activeFolder, selectedUid);
      setSelectedUid(null);
      setSelectedMessage(null);
      setMobilePane("list");
      await loadMessages();
      await loadFolders();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Could not delete message");
    }
  };

  const onMoveToTrash = async () => {
    if (!selectedUid) return;
    const trash = folders.find((f) => f.specialUse === "\\Trash");
    if (!trash) {
      await onDelete();
      return;
    }
    await api.moveMessage(activeFolder, selectedUid, trash.path);
    setSelectedUid(null);
    setSelectedMessage(null);
    setMobilePane("list");
    await loadMessages();
    await loadFolders();
  };

  const openCompose = useCallback((initial?: ComposeInitial) => {
    clearMailSearch();
    setComposeInitial(initial);
    setComposeOpen(true);
  }, [clearMailSearch]);

  useRegisterBespokeCompose(openCompose, embedded);

  const quotedBodyHtml = (message: MailMessageDetail) => {
    const body = message.html ?? `<pre>${message.text ?? ""}</pre>`;
    return `<p><br></p><hr><p><strong>On ${formatDate(message.date)}, ${message.from} wrote:</strong></p>${body}`;
  };

  const onReply = () => {
    if (!selectedMessage) return;
    openCompose({
      mode: "reply",
      to: selectedMessage.from,
      subject: selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`,
      html: quotedBodyHtml(selectedMessage),
      inReplyTo: selectedMessage.from,
    });
  };

  const onReplyAll = () => {
    if (!selectedMessage || !user) return;
    const recipients = [selectedMessage.from, selectedMessage.to, selectedMessage.cc]
      .join("; ")
      .split(/[;,]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .filter((addr) => !addr.includes(user.email));

    openCompose({
      mode: "replyAll",
      to: [...new Set(recipients)].join("; "),
      subject: selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`,
      html: quotedBodyHtml(selectedMessage),
      inReplyTo: selectedMessage.from,
    });
  };

  const onForward = () => {
    if (!selectedMessage) return;
    openCompose({
      mode: "forward",
      subject: selectedMessage.subject.startsWith("Fwd:")
        ? selectedMessage.subject
        : `Fwd: ${selectedMessage.subject}`,
      html: `<p><br></p><hr><p><strong>Forwarded message</strong></p>${quotedBodyHtml(selectedMessage)}`,
    });
  };

  const onMarkUnread = async () => {
    if (!selectedUid) return;
    await api.setFlags(activeFolder, selectedUid, { seen: false });
    setMessages((prev) => prev.map((m) => (m.uid === selectedUid ? { ...m, seen: false } : m)));
    setSelectedMessage((prev) => (prev ? { ...prev, seen: false } : prev));
    setStatusMessage("Marked as unread");
  };

  const onPrintMessage = () => {
    window.print();
  };

  const onMailToPdf = async () => {
    if (!selectedMessage) return;
    if (!hasAddon("mail2pdf-functionality")) {
      navigate("/addons?highlight=mail2pdf-functionality");
      return;
    }
    try {
      const blob = await api.mail2pdf({
        subject: selectedMessage.subject,
        from: selectedMessage.from,
        to: selectedMessage.to,
        date: selectedMessage.date,
        body: selectedMessage.html ?? selectedMessage.text ?? "",
        cc: selectedMessage.cc,
        attachments: selectedMessage.attachments.map((att) => att.filename),
      });
      const url = URL.createObjectURL(blob.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = blob.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage("PDF exported");
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "PDF export failed");
    }
  };

  const onWhatsappSend = async () => {
    if (!selectedMessage) return;
    if (!hasAddon("whatsapp-functionality")) {
      navigate("/addons?highlight=whatsapp-functionality");
      return;
    }
    const toPhone = window.prompt("Recipient WhatsApp number (E.164, e.g. +14165551234)");
    if (!toPhone?.trim()) return;
    try {
      await api.sendWhatsapp({
        toPhone: toPhone.trim(),
        subject: selectedMessage.subject,
        body: selectedMessage.text ?? selectedMessage.subject,
      });
      setStatusMessage("WhatsApp message queued");
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "WhatsApp send failed");
    }
  };

  const onReferFriend = async () => {
    setReferBusy(true);
    try {
      const result = await api.referralInvite();
      setPlatformNotice(result.rewardToast ?? result.message ?? "Referral invite sent.");
      await refreshAddons();
      if (result.rewardToast) {
        setPaidAddonGate(null);
      }
    } catch (err) {
      setPlatformNotice(err instanceof Error ? err.message : "Referral failed");
    } finally {
      setReferBusy(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("referFriend") !== "1" || referFriendDeepLinkHandled.current) return;
    referFriendDeepLinkHandled.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("referFriend");
    setSearchParams(next, { replace: true });
    void onReferFriend();
  }, [searchParams, setSearchParams]);

  const onThemeToggle = async () => {
    const next = uiThemeVersion === "dark" ? "light" : "dark";
    setUiThemeVersion(next);
    try {
      await api.updateTheme(next);
    } catch {
      setUiThemeVersion(uiThemeVersion);
    }
  };

  const openMessageFromDocuments = (folder: string, uid: number) => {
    setActiveFolder(folder);
    setSelectedUid(uid);
    setSelectedMessage(null);
    setLoadingMessage(true);
    setMessageError("");
    setMobilePane("read");
  };

  const handleCreateFolder = async (name: string) => {
    const inbox = folders.find((f) => resolveFolderKind(f) === "inbox");
    const { folder } = await api.createFolder(name, inbox?.path);
    await loadFolders();
    setActiveFolder(folder.path);
  };

  const handleCvAttachmentAdded = (file: File) => {
    if (!hasJobHunterAddon || !canShowCvScannerToast()) return;
    recordCvScannerToastShown();
    setCvScannerToastFile(file);
  };

  const openCvScannerFromToast = () => {
    if (!cvScannerToastFile) return;
    setCareerScannerPreload({ file: cvScannerToastFile, fromToastOptIn: true });
    setCvScannerToastFile(null);
    setActiveFolder(VIEW_CAREER_SCANNER);
    setMobilePane("list");
  };

  const renderMainContent = () => {
    const virtualViewCtx = {
      renderGatedView: (view: string, panel: import("react").ReactNode) =>
        renderGatedView(view, hasAddon, panel, panelWorkspaceTrial),
      openCompose,
      contactsPrefillEmail,
      onContactsMessage: setStatusMessage,
      inboxPath,
      onOpenMessage: openMessageFromDocuments,
      businessVertical,
      onSelectView: setActiveFolder,
      careerScannerPreload,
      onCareerScannerPreloadConsumed: () => setCareerScannerPreload(null),
      jobHunterEnabled: hasJobHunterAddon,
      onComposeTemplateApplied: setPlatformNotice,
    };

    if (isDeferredProductionVirtualView(activeFolder)) {
      return (
        <LazyProductionVirtualView
          activeFolder={activeFolder}
          ctx={virtualViewCtx}
          careerScannerPreloadKey={careerScannerPreload?.file?.name ?? careerScannerPreload?.file?.size ?? null}
        />
      );
    }

    const virtualView = renderProductionVirtualView(activeFolder, virtualViewCtx);
    if (virtualView) return virtualView;

    const visibleSuggestions = contactSuggestions.filter((e) => !dismissedSuggestions.includes(e));
    const listPrimaryColumnLabel = selectedUid
      ? "Subject"
      : senderGroupBy === "to"
        ? "Recipient"
        : "Sender";

    return (
      <>
        {!embedded ? (
        <div className="mail-list-search">
          <GmailMailSearch
            value={searchDraft}
            onChange={setSearchDraft}
            onSearch={() => {
              setAppliedSearch(searchDraft);
              messagePageRef.current = 1;
            }}
            onClear={() => {
              const empty = { field: "subject" as const, query: "", scope: "all" as const };
              setSearchDraft(empty);
              setAppliedSearch(empty);
              messagePageRef.current = 1;
            }}
          />
        </div>
        ) : null}

        {!embedded ? (
          <MailOrderBar
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={(nextSortBy, nextSortOrder) => {
              setSortBy(nextSortBy);
              setSortOrder(nextSortOrder);
              messagePageRef.current = 1;
            }}
          />
        ) : null}

        {statusMessage ? <div className="pane-status">{statusMessage}</div> : null}

        {!embedded && !contactsWorkspaceHidden && visibleSuggestions.length > 0 ? (
          <div className="contact-suggest-banner">
            <span>Add new senders to contacts?</span>
            {visibleSuggestions.slice(0, 3).map((email) => (
              <span key={email} className="contact-suggest-actions">
                <button
                  type="button"
                  onClick={async () => {
                    await api.createContact({ email });
                    setDismissedSuggestions((prev) => [...prev, email]);
                    setStatusMessage(`Added ${email} to contacts`);
                  }}
                >
                  Add {email}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setContactsPrefillEmail(email);
                    setActiveFolder(VIEW_CONTACTS);
                  }}
                >
                  Details
                </button>
              </span>
            ))}
            <button
              type="button"
              className="ghost"
              onClick={() => setDismissedSuggestions((prev) => [...prev, ...visibleSuggestions])}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {showBulkBar ? (
          <MailBulkActions
            selectedCount={selectedUids.length}
            folders={folders}
            currentFolder={activeFolder}
            onMarkRead={() => runBulkAction("markRead")}
            onReportSpam={() => {
              if (!junkFolder) {
                setListError("Spam folder not found on this mailbox.");
                return;
              }
              runBulkAction("reportSpam", junkFolder.path);
            }}
            onDelete={() => void runBulkAction("delete")}
            deleteLabel={isTrashFolder ? "Delete permanently" : "Delete"}
            showMarkRead={!isTrashFolder}
            showReportSpam={!isTrashFolder}
            onMove={(targetFolder) => runBulkAction("move", targetFolder)}
            onClearSelection={() => setSelectedUids([])}
          />
        ) : null}

        {listError ? <div className="pane-error">{listError}</div> : null}

        <div className="mail-list-scroll-wrap">
          {showPullIndicator ? (
            <div
              className={`mail-list-pull-indicator${pullRefreshing || listRefreshing ? " is-refreshing" : ""}${
                pullDistance >= pullThreshold ? " is-ready" : ""
              }`}
              style={{ height: `${pullIndicatorHeight}px` }}
              aria-live="polite"
            >
              <span>{pullIndicatorLabel}</span>
            </div>
          ) : null}

          <div
            className="message-list message-list--table"
            ref={messageListRef}
            data-list-head-revealed={listHeadRevealed ? "true" : "false"}
          >
          {loadingMessages && messages.length === 0 ? (
            <div className="muted pad">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="muted pad">No messages in this folder.</div>
          ) : (
            <>
              {useSenderGrouping ? (
                <SenderGroupedMessageList
                  messages={messages}
                  selectedUid={selectedUid}
                  expandedSenderEmails={expandedSenderEmails}
                  onToggleSender={(email) => {
                    setExpandedSenderEmails((current) => {
                      const next = new Set(current);
                      if (next.has(email)) next.delete(email);
                      else next.add(email);
                      return next;
                    });
                  }}
                  onSelectMessage={selectMessage}
                  showBulkBar={showBulkBar}
                  selectedUids={selectedUids}
                  onToggleSelectUid={toggleSelectUid}
                  onToggleSelectAll={toggleSelectAll}
                  onToggleSelectSenderGroup={toggleSelectSenderGroup}
                  onDeleteSenderGroup={onDeleteSenderGroup}
                  deletingSenderEmail={deletingSenderEmail}
                  formatDate={formatDate}
                  primaryColumnLabel={listPrimaryColumnLabel}
                  groupBy={senderGroupBy}
                  listHeadRevealed={listHeadRevealed}
                />
              ) : (
                <>
                  <MessageTableHead
                    showBulkBar={showBulkBar}
                    allSelected={messages.length > 0 && selectedUids.length === messages.length}
                    onToggleSelectAll={toggleSelectAll}
                    primaryColumnLabel={listPrimaryColumnLabel}
                    revealed={listHeadRevealed}
                  />
                  {messages.map((msg) => (
                    <div
                      key={msg.uid}
                      className={`message-table-row ${selectedUid === msg.uid ? "selected" : ""} ${msg.seen ? "" : "unread"}`}
                    >
                      <span className="message-table-cell message-table-cell--check">
                        {showBulkBar ? (
                          <input
                            type="checkbox"
                            checked={selectedUids.includes(msg.uid)}
                            onChange={() => toggleSelectUid(msg.uid)}
                            aria-label={`Select message ${msg.subject}`}
                          />
                        ) : null}
                      </span>
                      <button type="button" className="message-table-cell message-table-cell--subject" onClick={() => selectMessage(msg.uid)}>
                        <span className="message-subject-text">
                          {selectedUid
                            ? msg.subject || "(No subject)"
                            : senderLabel(msg.from) || msg.from || "—"}
                        </span>
                        {msg.flagged ? <span className="message-star" aria-label="Starred">★</span> : null}
                      </button>
                      <button type="button" className="message-table-cell message-table-cell--snippet" onClick={() => selectMessage(msg.uid)}>
                        {msg.snippet || msg.from || "—"}
                      </button>
                      <button type="button" className="message-table-cell message-table-cell--date" onClick={() => selectMessage(msg.uid)}>
                        <time>{formatDate(msg.date)}</time>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
          <MailListLoadMore loading={pagingMessages && messages.length > 0} />
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={`mail-app ${activeThemeVersion === "light" ? "mail-app--light" : ""}${
        embedded ? " mail-app--embedded-in-bespoke" : ""
      }${iosTabletMailLayout ? " mail-app--ios-tablet" : ""}`}
      data-mobile-pane={mobilePane}
      data-virtual-view={isVirtual ? "true" : "false"}
      data-content-pane={contentPane}
      data-reading-pane={readingPaneEnabled ? "on" : "off"}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      data-folder-kind={activeFolderKind ?? undefined}
      data-list-pane-resizing={isResizing ? "true" : "false"}
      style={{
        ...( !embedded && branding
          ? ({
              "--brand-primary": branding.primaryColor,
              "--brand-accent": branding.accentColor,
            } as React.CSSProperties)
          : {}),
        ...(desktopSplitResizeEnabled
          ? ({ "--mail-list-pane-width": `${listPaneWidth}px` } as React.CSSProperties)
          : {}),
      }}
      onTouchStart={swipeBackHandlers.onTouchStart}
      onTouchEnd={swipeBackHandlers.onTouchEnd}
      onTouchCancel={swipeBackHandlers.onTouchCancel}
    >
      <header className="mail-mobile-topbar">
        <div className="mail-mobile-topbar-start">
          {mobilePane !== "list" ? (
            <button type="button" className="mail-icon-btn" onClick={mobileGoBack} aria-label="Go back">
              ←
            </button>
          ) : (
            <button
              type="button"
              className="mail-icon-btn"
              onClick={() => setMobilePane("menu")}
              aria-label="Open folders"
            >
              ☰
            </button>
          )}
        </div>
        <div className="mail-mobile-topbar-title">
          <span className="mail-mobile-kicker">{productName}</span>
          <strong>
            {mobilePane === "read" && selectedMessage
              ? selectedMessage.subject
              : mobilePane === "menu"
                ? "Mailboxes"
                : activeFolderLabel}
          </strong>
        </div>
        <button
          type="button"
          className="mail-icon-btn mail-icon-btn--primary"
          onClick={() => openCompose({ mode: "new" })}
          aria-label="New mail"
        >
          ✎
        </button>
      </header>

      <div className="mail-app-main">
      {!embedded ? (
      <div className="mail-bespoke-chrome">
        <MailBespokeChrome
          productName={productName}
          displayName={user?.activeMailAccount?.email ?? user?.email ?? "User"}
          displayEmail={user?.activeMailAccount?.email ?? user?.email ?? ""}
          activeFolder={activeFolder}
          inboxPath={inboxPath || "INBOX"}
          businessVertical={businessVertical}
          uiThemeVersion={uiThemeVersion}
          hasAddon={hasAddon}
          careerNavUnlocked={careerNavUnlocked}
          referBusy={referBusy}
          searchDraft={searchDraft}
          onSearchDraftChange={setSearchDraft}
          onSearch={() => {
            setAppliedSearch(searchDraft);
            messagePageRef.current = 1;
          }}
          onSearchClear={() => {
            setSearchDraft({ field: "subject", query: "" });
            setAppliedSearch({ field: "subject", query: "" });
            messagePageRef.current = 1;
          }}
          onSelectView={(view) => {
            setActiveFolder(view);
            setSelectedUid(null);
            setMobilePane("list");
          }}
          onOpenCareer={() => window.location.assign("/career")}
          onOpenAddons={(highlightSlug) =>
            navigate(highlightSlug ? `/addons?highlight=${highlightSlug}` : "/addons")
          }
          onReferFriend={() => void onReferFriend()}
          onThemeToggle={() => void onThemeToggle()}
        />
      </div>
      ) : null}

      <div className="mail-layout">
        <button
          type="button"
          className="mail-sidebar-backdrop"
          onClick={() => setMobilePane("list")}
          aria-label="Close folders"
        />

        <aside className={`mail-sidebar${sidebarCollapsed ? " mail-sidebar--collapsed" : ""}`}>
          <div className="mail-sidebar-rail-head">
            <button
              type="button"
              className="mail-sidebar-toggle"
              onClick={toggleSidebarCollapsed}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expand mail folders" : "Collapse mail folders"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="folder-nav-flyout" role="tooltip">
                {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {sidebarCollapsed ? (
                  <path
                    fill="currentColor"
                    d="M10 6 8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6-6-6z"
                  />
                ) : (
                  <path
                    fill="currentColor"
                    d="M14 6 15.4 7.4 10.8 12l4.6 4.6L14 18l-6-6 6-6z"
                  />
                )}
              </svg>
            </button>
            {!embedded ? (
              <div className="mail-sidebar-head">
                <HMailLogo size="sm" showWordmark subtitle={tenantName} productName={productName} className="mail-brand-logo" />
                <button
                  type="button"
                  className="mail-sidebar-close"
                  onClick={() => setMobilePane("list")}
                  aria-label="Close"
                  {...(mobileDrawerMenuOpen ? closeDrawerTooltipProps : { "data-tooltip": "Close" })}
                >
                  <X className="mail-sidebar-close-icon" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mail-sidebar-close mail-sidebar-close--embedded"
                onClick={() => setMobilePane("list")}
                aria-label="Close"
                {...(mobileDrawerMenuOpen ? closeDrawerTooltipProps : { "data-tooltip": "Close" })}
              >
                <X className="mail-sidebar-close-icon" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mail-sidebar-body">
            <FolderNav
              folders={folders}
              activeFolder={activeFolder}
              mailFilter={mailFilter}
              loading={loadingFolders}
              businessVertical={businessVertical}
              onSelect={selectFolder}
              onSelectStarred={openStarredView}
              onNewFolder={() => setNewFolderOpen(true)}
              onCompose={() => openCompose({ mode: "new" })}
              hasAddon={hasAddon}
              hideIndustryTools={embedded}
              iconOnlyRail={sidebarCollapsed && !mobileMailViewport}
              tooltipTheme={activeThemeVersion}
              onPaidAddonGate={openPaidAddonGate}
              onOpenAddons={(highlightSlug) => openAddonMarketplace(highlightSlug)}
              platformToolsDefaultCollapsed={tenantUi.platformToolsCollapsed}
            />
          </div>

          <div className="sidebar-footer">
            {platformNotice ? <div className="pane-status">{platformNotice}</div> : null}
            {!embedded ? (
              <>
                <div className="user-chip">
                  <span>{user?.activeMailAccount?.email ?? user?.email}</span>
                </div>
                <button type="button" className="ghost-btn" onClick={() => void onReferFriend()}>
                  Refer a friend
                </button>
                <button type="button" className="ghost-btn" onClick={() => void onThemeToggle()}>
                  {uiThemeVersion === "dark" ? "Light theme" : "Dark theme"}
                </button>
                <button type="button" className="ghost-btn" onClick={() => logout()}>
                  Sign out
                </button>
              </>
            ) : null}
          </div>
        </aside>

        <section className="mail-list-pane">
          {embedded ? (
            <p className="mail-list-breadcrumb" aria-label={`Welcome back, ${listWelcomeMailbox}. You are: ${activeFolderLabel}`}>
              <span className="mail-list-breadcrumb-welcome">Welcome back, {listWelcomeMailbox}</span>
              <span className="mail-list-breadcrumb-sep" aria-hidden="true">
                |
              </span>
              <span className="mail-list-breadcrumb-current">
                You are: {listPaneTitle}
              </span>
            </p>
          ) : null}
          <header
            className={`list-header ${isVirtual ? "list-header--virtual" : ""}${
              !isVirtual && listHeadRevealEnabled && !listHeadRevealed ? " list-header--hidden" : ""
            }`}
          >
            <div className="list-header-main">
              <h2>{listPaneTitle}</h2>
            </div>
            {showInboxSwitcher ? (
              <div className="list-header-switcher">
                <InboxSwitcher
                  ref={inboxSwitcherRef}
                  variant="header"
                  themeVersion={activeThemeVersion}
                  activeAccount={user?.activeMailAccount ?? null}
                  onSwitched={() => void handleMailboxSwitch()}
                  onPaidAddonGate={() => openPaidAddonGate("multi-inbox-functionality", "Multiple Inboxes")}
                  onAccountCountChange={setMailAccountCount}
                  onAccountConnected={() => setInboxConnectToast("success")}
                  onAccountConnectFailed={() => setInboxConnectToast("error")}
                  onAccountSwitched={(account) => setInboxSwitchToast(account)}
                />
              </div>
            ) : null}
            <div className="list-header-actions">
              <button
                type="button"
                className={`ghost-btn mail-reading-pane-toggle${readingPaneEnabled ? " is-active" : ""}`}
                onClick={toggleReadingPane}
                aria-pressed={readingPaneEnabled}
                aria-label={
                  readingPaneEnabled
                    ? "Hide reading pane"
                    : "Show reading pane beside the list"
                }
                title={
                  readingPaneEnabled
                    ? "Hide reading pane (Gmail-style full-width list)"
                    : "Show reading pane beside the list"
                }
              >
                <PanelRight className="mail-reading-pane-toggle-icon" strokeWidth={2.25} aria-hidden="true" />
              </button>
              <button type="button" className="free-addon-btn" onClick={() => navigate("/addons")}>
                Free Addon
              </button>
              {!embedded ? (
                <button type="button" className="signout-btn" onClick={() => logout()}>
                  Sign out
                </button>
              ) : null}
            </div>
          </header>
          {renderMainContent()}
        </section>

        {!isVirtual && readingPaneEnabled ? (
          <div
            className="mail-list-read-splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize message list"
            onMouseDown={(event) => startResize(event.clientX)}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) startResize(touch.clientX);
            }}
          />
        ) : null}

        {!isVirtual ? (
        <section className="mail-read-pane" ref={readPaneRef}>
          {!selectedUid ? (
            <div className="read-empty">
              <h3>Select a message</h3>
              <p>Choose a message from your inbox to read it here.</p>
            </div>
          ) : isLoadingSelectedMessage ? (
            <PmailLoadingScreen
              className="pmail-loading-screen--read-pane"
              heading="Centralizing your experience"
              productName={productName}
            />
          ) : selectedMessage ? (
            <>
              {messageError ? <div className="pane-error">{messageError}</div> : null}
              <header
                className={`read-header${
                  readHeadRevealEnabled && !readHeadRevealed ? " read-header--hidden" : ""
                }`}
                data-read-head-revealed={readHeadRevealed ? "true" : "false"}
              >
                <div className="read-header-top">
                  <button type="button" className="read-back-btn" onClick={clearSelectedMessage}>
                    ← Back to messages
                  </button>
                  <div className="read-actions">
                    <ReadActionButton label="Reply" icon={ReplyIcon} onClick={onReply} />
                    <ReadActionButton label="Reply all" icon={ReplyAllIcon} onClick={onReplyAll} />
                    <ReadActionButton label="Forward" icon={ForwardIcon} onClick={onForward} />
                    <ReadActionButton label="Mark unread" icon={MarkUnreadIcon} onClick={() => void onMarkUnread()} />
                    <MessageUnsubscribeButton
                      folder={activeFolder}
                      uid={selectedMessage.uid}
                      enabled={hasAddon("inbox-cleanup-functionality")}
                      iconOnly
                    />
                    <ReadActionButton label="Print" icon={PrintIcon} onClick={onPrintMessage} />
                    <ReadActionButton label="PDF" icon={PdfIcon} onClick={() => void onMailToPdf()} />
                    <ReadActionButton label="WhatsApp" onClick={() => void onWhatsappSend()}>
                      <WhatsAppIcon width={18} height={18} />
                    </ReadActionButton>
                    {!isTrashFolder ? (
                      <ReadActionButton label="Trash" icon={TrashIcon} onClick={onMoveToTrash} />
                    ) : null}
                    <ReadActionButton
                      label={isTrashFolder ? "Delete permanently" : "Delete"}
                      icon={DeleteIcon}
                      onClick={onDelete}
                      variant="danger"
                    />
                  </div>
                </div>
                <div className="read-header-meta">
                  <h2>{selectedMessage.subject}</h2>
                  <p>
                    <strong>From:</strong> {selectedMessage.from}
                  </p>
                  <p>
                    <strong>To:</strong> {selectedMessage.to}
                  </p>
                  <p className="read-date">{formatDate(selectedMessage.date)}</p>
                </div>
              </header>

              {selectedMessage.attachments.length > 0 ? (
                <MessageAttachmentsSection
                  folder={activeFolder}
                  uid={selectedMessage.uid}
                  messageSubject={selectedMessage.subject}
                  attachments={selectedMessage.attachments}
                  categorizeEnabled={hasAddon("attachment-categorize-functionality")}
                  esignEnabled={hasAddon("esign-from-email-functionality")}
                  onComposeHandoff={(handoff) =>
                    openCompose({
                      mode: "new",
                      to: handoff.to,
                      subject: handoff.subject,
                      html: handoff.html,
                      text: handoff.text,
                    })
                  }
                  onVaultExported={(vaultFileId) =>
                    openCompose({ mode: "new", vaultFileIds: [vaultFileId] })
                  }
                />
              ) : null}

              <article className="read-body">
                {selectedMessage.html ? (
                  <div
                    ref={readBodyContentRef}
                    className="read-body-content"
                    dangerouslySetInnerHTML={{ __html: sanitizeMailHtml(selectedMessage.html) }}
                  />
                ) : (
                  <pre>{selectedMessage.text}</pre>
                )}
              </article>
            </>
          ) : messageError ? (
            <div className="pane-error read-pane-error">{messageError}</div>
          ) : null}
        </section>
        ) : null}
      </div>
      </div>

      {!embedded ? (
      <nav className="mail-bottom-nav mail-bottom-nav--with-switcher" aria-label="Mobile navigation">
        <MailBottomNavButton
          label="Folders"
          icon={Folder}
          active={mobilePane === "menu"}
          onClick={openMobileFolders}
        />
        <MailBottomNavButton
          label="Messages"
          icon={Inbox}
          active={mobilePane === "list"}
          onClick={openMobileMessages}
        />
        <InboxSwitcher
          ref={inboxSwitcherRef}
          variant="bottom-nav"
          themeVersion={activeThemeVersion}
          activeAccount={user?.activeMailAccount ?? null}
          onSwitched={() => void handleMailboxSwitch()}
          onPaidAddonGate={() => openPaidAddonGate("multi-inbox-functionality", "Multiple Inboxes")}
          onAccountCountChange={setMailAccountCount}
          onAccountConnected={() => setInboxConnectToast("success")}
          onAccountConnectFailed={() => setInboxConnectToast("error")}
          onAccountSwitched={(account) => setInboxSwitchToast(account)}
        />
        <MailBottomNavButton
          label="New mail"
          icon={SquarePen}
          onClick={() => openCompose({ mode: "new" })}
        />
      </nav>
      ) : null}

      {composeOpen ? (
        <Suspense fallback={null}>
          <ComposeModal
            open={composeOpen}
            onClose={() => {
              setComposeOpen(false);
              setComposeInitial(undefined);
            }}
            onSent={async (result) => {
              if (result?.pendingUndo) {
                setPendingUndoSend(result.pendingUndo);
                return;
              }
              setShowSentMessageToast(true);
              await refreshInboxAfterSend();
            }}
            initial={composeInitial}
            jobHunterEnabled={hasJobHunterAddon}
            themeVersion={activeThemeVersion}
            onCvAttachmentAdded={handleCvAttachmentAdded}
          />
        </Suspense>
      ) : null}

      {cvScannerToastFile ? (
        <CvScannerToast
          fileName={cvScannerToastFile.name}
          onRate={openCvScannerFromToast}
          onDismiss={() => setCvScannerToastFile(null)}
          onDontAskAgain={() => {
            setCvScannerDontAskAgain();
            setCvScannerToastFile(null);
          }}
        />
      ) : null}

      {showJobHunterPromoToast && !cvScannerToastFile ? (
        <JobHunterPromoToast
          onExplore={() => {
            setShowJobHunterPromoToast(false);
            void api.dismissJobHunterPromoToast().catch(() => undefined);
            navigate("/career");
          }}
          onDismiss={() => {
            setShowJobHunterPromoToast(false);
            void api.dismissJobHunterPromoToast().catch(() => undefined);
          }}
        />
      ) : null}

      {showSentMessageToast ? (
        <SentMessageToast
          onOpenTracking={() => {
            setShowSentMessageToast(false);
            setActiveFolder(VIEW_OPEN_TRACKING);
            setMobilePane("list");
          }}
          onDismiss={() => setShowSentMessageToast(false)}
        />
      ) : null}

      {openTrackingNotification ? (
        <OpenTrackingOpenToast
          toEmail={openTrackingNotification.toEmail}
          subject={openTrackingNotification.subject}
          onOpenTracking={() => {
            void dismissOpenTrackingNotification();
            setActiveFolder(VIEW_OPEN_TRACKING);
            setMobilePane("list");
          }}
          onDismiss={() => void dismissOpenTrackingNotification()}
        />
      ) : null}

      {pendingUndoSend ? (
        <UndoSendToast
          pending={pendingUndoSend}
          onUndone={() => setPendingUndoSend(null)}
          onSent={() => {
            setPendingUndoSend(null);
            setShowSentMessageToast(true);
            void refreshInboxAfterSend();
          }}
        />
      ) : null}

      {paidAddonGate ? (
        <PaidAddonToast
          addonName={paidAddonGate.name}
          panelWorkspaceTrial={panelWorkspaceTrial}
          onOpenMarketplace={() => {
            const slug = paidAddonGate.slug;
            setPaidAddonGate(null);
            openAddonMarketplace(slug);
          }}
          onDismiss={() => setPaidAddonGate(null)}
        />
      ) : null}

      {multiInboxPromptOpen ? (
        <MultiInboxConnectToast
          onConnectMailbox={() => {
            setMultiInboxPromptOpen(false);
            if (embedded && footerNavBridge) {
              footerNavBridge.openInboxAddForm();
              return;
            }
            inboxSwitcherRef.current?.openWithAddForm();
          }}
          onDismiss={() => setMultiInboxPromptOpen(false)}
          onDontAskAgain={() => {
            setMultiInboxPromptDismissed();
            setMultiInboxPromptOpen(false);
          }}
        />
      ) : null}

      {inboxConnectToast ? (
        <InboxConnectResultToast kind={inboxConnectToast} onDismiss={() => setInboxConnectToast(null)} />
      ) : null}

      {inboxSwitchToast ? (
        <InboxSwitchSuccessToast
          accountLabel={inboxSwitchToast.label?.trim() || inboxSwitchToast.email.split("@")[0] || "Account"}
          accountEmail={inboxSwitchToast.email}
          onDismiss={() => setInboxSwitchToast(null)}
        />
      ) : null}

      {mobileDrawerMenuOpen ? (
        <MobileDrawerTooltip state={closeDrawerTooltip} theme={activeThemeVersion} />
      ) : null}
      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
