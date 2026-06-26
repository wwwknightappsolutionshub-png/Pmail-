import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAutoMailPush } from "../hooks/useAutoMailPush";
import { useRegisterBespokeCompose } from "../context/BespokeComposeBridge";
import { useOptionalMailFooterNavBridge, useRegisterMailFooterNav } from "../context/MailFooterNavBridge";
import { useAddons } from "../context/AddonContext";
import { AddonUpsellPanel } from "../components/AddonUpsellPanel";
import { ComposeModal, type ComposeInitial } from "../components/ComposeModal";
import { UndoSendToast, type PendingUndoSend } from "../components/UndoSendToast";
import { CvScannerToast } from "../components/CvScannerToast";
import type { CareerScannerPreload } from "../components/CareerScannerPanel";
import {
  canShowCvScannerToast,
  recordCvScannerToastShown,
  setCvScannerDontAskAgain,
} from "../lib/cvScannerToastPrefs";
import { InboxSwitcher, type InboxSwitcherHandle } from "../components/InboxSwitcher";
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
import { AttachmentCategoryBadges } from "../components/AttachmentCategoryBadges";
import { SendForSignatureButton } from "../components/SendForSignatureButton";
import {
  isMultiInboxPromptDismissed,
  setMultiInboxPromptDismissed,
} from "../lib/multiInboxPromptPrefs";
import { resolveInboxPath } from "../components/DocumentsPanel";
import { FolderNav, folderDisplayLabel, resolveFolderKind, sortFolders } from "../components/FolderNav";
import { MailBespokeChrome } from "../components/MailBespokeChrome";
import { HMailLogo } from "../components/HMailLogo";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { MailBulkActions } from "../components/MailBulkActions";
import { MailFilterBar } from "../components/MailFilterBar";
import { MailOrderBar } from "../components/MailOrderBar";
import { MailPaginationBar } from "../components/MailPaginationBar";
import { GmailMailSearch, isGmailStyleQuery } from "../components/GmailMailSearch";
import { NewFolderModal } from "../components/NewFolderModal";
import { renderProductionVirtualView } from "../components/ProductionVirtualViews";
import { SenderGroupedMessageList, senderLabel } from "../components/SenderGroupedMessageList";
import { MailBottomNavButton } from "../components/MailBottomNavButton";
import {
  MobileDrawerTooltip,
  mobileDrawerTooltipHandlers,
  type MobileDrawerTooltipState,
} from "../components/MobileDrawerTooltip";
import { Folder, Inbox, SquarePen, X } from "lucide-react";
import { isMobileScreen } from "../utils/pwaPlatform";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useForegroundRefresh } from "../hooks/useForegroundRefresh";
import { toolAddonSlug } from "../constants/addonTools";
import {
  folderSupportsBulkActions,
  isVirtualView,
  virtualViewTitle,
  VIEW_CONTACTS,
  VIEW_CAREER_SCANNER,
  type MailSearchState,
  type MailStatusFilter,
} from "../constants/mailViews";
import type { MailFolder, MailMessageDetail, MailMessageSummary, MailSortField, MailSortOrder } from "../types/mail";
import "./MailPage.css";
import "../components/ContactsPanel.css";

const PAGE_SIZE = 30;
const MAIL_SIDEBAR_COLLAPSED_KEY = "pmail-mail-sidebar-collapsed-v3";

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

function defaultSidebarCollapsed(): boolean {
  return true;
}

function extractEmailFromHeader(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
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
};

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
}: MailPageProps = {}) {
  const { user, logout, refresh } = useAuth();
  const { hasAddon, hasJobHunterAccess, panelWorkspaceTrial } = useAddons();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const branding = user?.tenant.branding;
  const productName = branding?.productName ?? "PMail+";
  const tenantName = user?.tenant.name ?? "Prohost Cloud";

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messagePage, setMessagePage] = useState(1);
  const messagePageRef = useRef(1);
  const fetchGenerationRef = useRef(0);
  const selectedUidRef = useRef<number | null>(null);
  const loadMessagesRef = useRef<((options?: { silent?: boolean; page?: number }) => Promise<void>) | null>(null);
  const resetMessagePage = useCallback(() => {
    messagePageRef.current = 1;
    setMessagePage(1);
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
  const [cvScannerToastFile, setCvScannerToastFile] = useState<File | null>(null);
  const [careerScannerPreload, setCareerScannerPreload] = useState<CareerScannerPreload | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readSidebarCollapsedPreference() ?? defaultSidebarCollapsed(),
  );
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const [closeDrawerTooltip, setCloseDrawerTooltip] = useState<MobileDrawerTooltipState>(null);
  const [expandedSenderEmail, setExpandedSenderEmail] = useState<string | null>(null);
  const [uiThemeVersion, setUiThemeVersion] = useState<"dark" | "light">(
    (user?.uiThemeVersion as "dark" | "light" | undefined) ?? "dark",
  );
  const activeThemeVersion = embedded && shellThemeVersion ? shellThemeVersion : uiThemeVersion;
  const mobileDrawerMenuOpen = mobilePane === "menu";
  const closeDrawerTooltipProps = mobileDrawerMenuOpen
    ? mobileDrawerTooltipHandlers("Close", setCloseDrawerTooltip)
    : {};
  const [platformNotice, setPlatformNotice] = useState("");
  const [careerNavUnlocked, setCareerNavUnlocked] = useState(false);
  const [referBusy, setReferBusy] = useState(false);
  const [paidAddonGate, setPaidAddonGate] = useState<{ slug: string; name: string } | null>(null);
  const [multiInboxPromptOpen, setMultiInboxPromptOpen] = useState(false);
  const [mailAccountCount, setMailAccountCount] = useState<number | null>(null);
  const inboxSwitcherRef = useRef<InboxSwitcherHandle>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [mobileMailViewport, setMobileMailViewport] = useState(() => isMobileScreen());
  const hasMultiInboxAddon = hasAddon("multi-inbox-functionality");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileMailViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useAutoMailPush(user?.id);

  useEffect(() => {
    if (mobilePane !== "menu") {
      setCloseDrawerTooltip(null);
    }
  }, [mobilePane]);

  useEffect(() => {
    if (!platformNotice) return;
    const timer = window.setTimeout(() => setPlatformNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [platformNotice]);

  const openPaidAddonGate = useCallback((slug: string, label?: string) => {
    const copy = ADDON_UPSELL_COPY[slug];
    setPaidAddonGate({ slug, name: copy?.name ?? label ?? "Add-on" });
  }, []);

  const openAddonMarketplace = useCallback(
    (highlightSlug?: string) => {
      navigate(highlightSlug ? `/addons?highlight=${highlightSlug}` : "/addons");
    },
    [navigate],
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
  const useSenderGrouping =
    !isVirtualView(activeFolder) &&
    inboxPath === activeFolder &&
    !appliedSearch.query &&
    mailFilter === "all";

  const sortedFolders = useMemo(() => sortFolders(folders), [folders]);
  const isVirtual = isVirtualView(activeFolder);

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
  const activeFolderLabel = getFolderTitle(activeFolder, activeFolderMeta);
  const listUserDisplayName = user?.displayName?.trim() || user?.email?.split("@")[0] || "User";
  const showBulkBar = activeFolderKind ? folderSupportsBulkActions(activeFolderKind) : false;
  const showInboxSwitcher = !isVirtual && hasMultiInboxAddon;

  useEffect(() => {
    if (requestedFolder === undefined) return;
    const target = requestedFolder ?? inboxPath ?? "INBOX";
    setActiveFolder(target);
    setSelectedUid(null);
    setSelectedMessage(null);
    setMobilePane("list");
    onRequestedFolderHandled?.();
  }, [requestedFolder, inboxPath, onRequestedFolderHandled]);

  useEffect(() => {
    onActiveFolderChange?.(activeFolder);
  }, [activeFolder, onActiveFolderChange]);

  useEffect(() => {
    if (!showInboxSwitcher || !hasMultiInboxAddon) return;
    if (mailAccountCount === null || mailAccountCount > 1) return;
    if (isMultiInboxPromptDismissed()) return;
    setMultiInboxPromptOpen(true);
  }, [showInboxSwitcher, hasMultiInboxAddon, mailAccountCount]);
  const contentPane = isVirtual || !selectedUid ? "list" : "read";

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
  }, [activeFolder]);

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
        onCareerNavUnlockedChange?.(res.settings.careerNavUnlocked);
      })
      .catch(() => {
        setCareerNavUnlocked(false);
        onCareerNavUnlockedChange?.(false);
      });
  }, [onCareerNavUnlockedChange]);

  const refreshCareerNav = useCallback(() => {
    api
      .getJobHunterSettings()
      .then((res) => {
        setCareerNavUnlocked(res.settings.careerNavUnlocked);
        onCareerNavUnlockedChange?.(res.settings.careerNavUnlocked);
      })
      .catch(() => {
        setCareerNavUnlocked(false);
        onCareerNavUnlockedChange?.(false);
      });
  }, [onCareerNavUnlockedChange]);

  const handleMailboxSwitch = useCallback(async () => {
    setActiveFolder("INBOX");
    setSelectedUid(null);
    setSelectedMessage(null);
    setSelectedUids([]);
    resetMessagePage();
    setAppliedSearch({ field: "subject", query: "" });
    setSearchDraft({ field: "subject", query: "" });
    setMailFilter("all");
    await refresh();
    await loadFolders();
  }, [refresh, loadFolders, resetMessagePage, setAppliedSearch, setSearchDraft]);

  const loadMessages = useCallback(async (options?: { silent?: boolean; page?: number }) => {
    if (isVirtualView(activeFolder)) return;

    const targetPage = options?.page ?? messagePageRef.current;
    const generation = ++fetchGenerationRef.current;
    const silent = options?.silent === true;
    const isPaging = options?.page != null;

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
      setMessagePage(targetPage);
      setMessages(result.messages);
      setMessageTotal(result.total);
      const normalizedFolder = activeFolder.trim().toLowerCase();
      if (normalizedFolder === "inbox" || normalizedFolder === "sent") {
        refreshCareerNav();
      }
      setSelectedUids((prev) => prev.filter((uid) => result.messages.some((m) => m.uid === uid)));
      if (selectedUidRef.current && !result.messages.some((m) => m.uid === selectedUidRef.current)) {
        setSelectedUid(null);
        setSelectedMessage(null);
        setMobilePane("list");
      }
    } catch (err) {
      if (generation === fetchGenerationRef.current) {
        setListError(err instanceof Error ? err.message : "Failed to load messages");
      }
    } finally {
      if (generation === fetchGenerationRef.current) {
        if (isPaging) {
          setPagingMessages(false);
        } else if (silent) {
          setListRefreshing(false);
        } else {
          setLoadingMessages(false);
        }
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

  const refreshAfterSend = useCallback(
    async (sentFolderPath?: string) => {
      const sentPath = sentFolderPath ?? sortedFolders.find((f) => resolveFolderKind(f) === "sent")?.path;

      await loadFolders();

      if (sentPath) {
        setActiveFolder(sentPath);
        setSelectedUid(null);
        setSelectedMessage(null);
        setMobilePane("list");
        setLoadingMessages(true);
        try {
          const result = await api.messages(sentPath, {
            filter: mailFilter,
            page: 1,
            pageSize: PAGE_SIZE,
            sortBy,
            sortOrder,
          });
          setMessages(result.messages);
          setMessageTotal(result.total);
          setMessagePage(1);
        } catch (err) {
          setListError(err instanceof Error ? err.message : "Failed to load sent messages");
        } finally {
          setLoadingMessages(false);
        }
      } else {
        await loadMessages();
      }
    },
    [sortedFolders, loadFolders, mailFilter, sortBy, sortOrder, loadMessages],
  );

  useEffect(() => {
    const inboxPath = folders.find((f) => resolveFolderKind(f) === "inbox")?.path;
    if (isVirtualView(activeFolder) || !inboxPath || activeFolder !== inboxPath || messages.length === 0) {
      setContactSuggestions([]);
      return;
    }
    const emails = messages.map((m) => extractEmailFromHeader(m.from)).filter(Boolean);
    api
      .suggestContacts(emails)
      .then((res) => setContactSuggestions(res.suggestions))
      .catch(() => setContactSuggestions([]));
  }, [messages, activeFolder, folders]);

  const loadMessage = useCallback(
    async (uid: number) => {
      setLoadingMessage(true);
      setMessageError("");
      try {
        const { message } = await api.message(activeFolder, uid);
        setSelectedMessage(message);
        setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
      } catch (err) {
        setMessageError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        setLoadingMessage(false);
      }
    },
    [activeFolder],
  );

  const refreshMailInbox = useCallback(async () => {
    await loadFolders();
    await loadMessages({ silent: true });
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
    if (selectedUid && !isVirtual) loadMessage(selectedUid);
  }, [selectedUid, loadMessage, isVirtual]);

  const selectFolder = (path: string) => {
    messagePageRef.current = 1;
    setActiveFolder(path);
    setSelectedUid(null);
    setSelectedMessage(null);
    setSelectedUids([]);
    setExpandedSenderEmail(null);
    setMailFilter("all");
    setMessagePage(1);
    setSearchDraft({ field: "subject", query: "" });
    setAppliedSearch({ field: "subject", query: "" });
    setMobilePane(isVirtualView(path) ? "list" : "list");
  };

  const selectMessage = (uid: number) => {
    setSelectedUid(uid);
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

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const totalPages = Math.max(1, Math.ceil(messageTotal / PAGE_SIZE));
      if (nextPage < 1 || nextPage > totalPages || nextPage === messagePageRef.current) return;

      messagePageRef.current = nextPage;
      setMessagePage(nextPage);
      setSelectedUid(null);
      setSelectedMessage(null);
      setSelectedUids([]);
      setMobilePane("list");
      messageListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      void loadMessages({ page: nextPage });
    },
    [loadMessages, messageTotal],
  );

  const mobileGoBack = () => {
    if (mobilePane === "read") {
      setMobilePane("list");
      return;
    }
    if (mobilePane === "menu") {
      setMobilePane("list");
    }
  };

  const activateEmbeddedShell = useCallback(() => {
    if (embedded) onEmbeddedShellActivate?.();
  }, [embedded, onEmbeddedShellActivate]);

  const openMobileFolders = useCallback(() => {
    activateEmbeddedShell();
    setMobilePane("menu");
  }, [activateEmbeddedShell]);

  const openMobileMessages = useCallback(() => {
    activateEmbeddedShell();
    if (mobilePane === "read") {
      setSelectedUid(null);
      setSelectedMessage(null);
      setMessageError("");
    }
    setMobilePane("list");

    const targetInbox = inboxPath || "INBOX";
    if (isVirtualView(activeFolder) || activeFolder !== targetInbox) {
      selectFolder(targetInbox);
      return;
    }

    if (canRefreshMailList) {
      messageListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      void refreshMailInbox();
    }
  }, [mobilePane, activeFolder, inboxPath, canRefreshMailList, refreshMailInbox, activateEmbeddedShell]);

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
    setComposeInitial(initial);
    setComposeOpen(true);
  }, []);

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
    } catch (err) {
      setPlatformNotice(err instanceof Error ? err.message : "Referral failed");
    } finally {
      setReferBusy(false);
    }
  };

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
    const virtualView = renderProductionVirtualView(activeFolder, {
      renderGatedView: (view, panel) => renderGatedView(view, hasAddon, panel, panelWorkspaceTrial),
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
    });
    if (virtualView) return virtualView;

    const visibleSuggestions = contactSuggestions.filter((e) => !dismissedSuggestions.includes(e));
    const usePortaledPagination = embedded && mobileMailViewport;
    const showPagination = messageTotal > PAGE_SIZE && mobilePane !== "read";
    const listPrimaryColumnLabel = selectedUid ? "Subject" : "Sender";
    const mailPagination =
      showPagination ? (
        <MailPaginationBar
          page={messagePage}
          pageSize={PAGE_SIZE}
          total={messageTotal}
          loading={pagingMessages}
          onPageChange={handlePageChange}
        />
      ) : null;

    return (
      <>
        {!embedded ? (
        <div className="mail-list-search">
          <GmailMailSearch
            value={searchDraft}
            onChange={setSearchDraft}
            onSearch={() => {
              setAppliedSearch(searchDraft);
              setMessagePage(1);
            }}
            onClear={() => {
              const empty = { field: "subject" as const, query: "", scope: "all" as const };
              setSearchDraft(empty);
              setAppliedSearch(empty);
              setMessagePage(1);
            }}
          />
        </div>
        ) : null}

        {!embedded ? (
          <>
            <MailFilterBar
              value={mailFilter}
              onChange={(value) => {
                setMailFilter(value);
                setMessagePage(1);
              }}
            />

            <MailOrderBar
              sortBy={sortBy}
              sortOrder={sortOrder}
              onChange={(nextSortBy, nextSortOrder) => {
                setSortBy(nextSortBy);
                setSortOrder(nextSortOrder);
                setMessagePage(1);
              }}
            />
          </>
        ) : null}

        {statusMessage ? <div className="pane-status">{statusMessage}</div> : null}

        {!embedded && visibleSuggestions.length > 0 ? (
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
            onDelete={() => runBulkAction("delete")}
            deleteLabel={isTrashFolder ? "Delete permanently" : "Delete"}
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

          <div className="message-list message-list--table" ref={messageListRef}>
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
                  expandedSenderEmail={expandedSenderEmail}
                  onToggleSender={(email) =>
                    setExpandedSenderEmail((current) => (current === email ? null : email))
                  }
                  onSelectMessage={selectMessage}
                  showBulkBar={showBulkBar}
                  selectedUids={selectedUids}
                  onToggleSelectUid={toggleSelectUid}
                  onToggleSelectAll={toggleSelectAll}
                  formatDate={formatDate}
                  primaryColumnLabel={listPrimaryColumnLabel}
                />
              ) : (
                <>
                  <div className="message-table-head">
                    <span>{showBulkBar ? (
                      <input
                        type="checkbox"
                        checked={messages.length > 0 && selectedUids.length === messages.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all messages"
                      />
                    ) : null}</span>
                    <span>{listPrimaryColumnLabel}</span>
                    <span>Excerpt</span>
                    <span>Received</span>
                  </div>
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
          </div>
          {!usePortaledPagination ? mailPagination : null}
        </div>
        {usePortaledPagination && mailPagination
          ? createPortal(
              <div
                className={`mail-pagination-portal${
                  activeThemeVersion === "light" ? " mail-pagination-portal--light" : ""
                }`}
              >
                {mailPagination}
              </div>,
              document.body,
            )
          : null}
      </>
    );
  };

  return (
    <div
      className={`mail-app ${activeThemeVersion === "light" ? "mail-app--light" : ""}${
        embedded ? " mail-app--embedded-in-bespoke" : ""
      }`}
      data-mobile-pane={mobilePane}
      data-virtual-view={isVirtual ? "true" : "false"}
      data-content-pane={contentPane}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      style={
        !embedded && branding
          ? ({
              "--brand-primary": branding.primaryColor,
              "--brand-accent": branding.accentColor,
            } as React.CSSProperties)
          : undefined
      }
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
          displayName={user?.displayName?.trim() || user?.email?.split("@")[0] || "User"}
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
            setMessagePage(1);
          }}
          onSearchClear={() => {
            setSearchDraft({ field: "subject", query: "" });
            setAppliedSearch({ field: "subject", query: "" });
            setMessagePage(1);
          }}
          onSelectView={(view) => {
            setActiveFolder(view);
            setSelectedUid(null);
            setMobilePane("list");
          }}
          onOpenCareer={() => navigate("/career")}
          onOpenAddons={(highlightSlug) =>
            navigate(highlightSlug ? `/addons?highlight=${highlightSlug}` : "/addons")
          }
          onReferFriend={() => void onReferFriend()}
          onThemeToggle={() => void onThemeToggle()}
        />
      </div>
      ) : null}

      <div className="mail-layout">
        <div className="mail-sidebar-backdrop" onClick={() => setMobilePane("list")} aria-hidden="true" />

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
              loading={loadingFolders}
              businessVertical={businessVertical}
              onSelect={selectFolder}
              onNewFolder={() => setNewFolderOpen(true)}
              onCompose={() => openCompose({ mode: "new" })}
              hasAddon={hasAddon}
              hideIndustryTools={embedded}
              iconOnlyRail={mobileDrawerMenuOpen}
              tooltipTheme={activeThemeVersion}
              onPaidAddonGate={openPaidAddonGate}
              onOpenAddons={(highlightSlug) => openAddonMarketplace(highlightSlug)}
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
            <p className="mail-list-breadcrumb" aria-label={`Welcome back, ${listUserDisplayName}. You are: ${activeFolderLabel}`}>
              <span className="mail-list-breadcrumb-welcome">Welcome back, {listUserDisplayName}</span>
              <span className="mail-list-breadcrumb-sep" aria-hidden="true">
                |
              </span>
              <span className="mail-list-breadcrumb-current">You are: {activeFolderLabel}</span>
            </p>
          ) : null}
          <header className={`list-header ${isVirtual ? "list-header--virtual" : ""}`}>
            <div className="list-header-main">
              <h2>{activeFolderLabel}</h2>
            </div>
            {showInboxSwitcher ? (
              <div className="list-header-switcher">
                <InboxSwitcher
                  ref={inboxSwitcherRef}
                  variant="header"
                  activeAccount={user?.activeMailAccount ?? null}
                  onSwitched={() => void handleMailboxSwitch()}
                  onPaidAddonGate={() => openPaidAddonGate("multi-inbox-functionality", "Multiple Inboxes")}
                  onAccountCountChange={setMailAccountCount}
                />
              </div>
            ) : null}
            <div className="list-header-actions">
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

        {!isVirtual ? (
        <section className="mail-read-pane">
          {!selectedMessage ? (
            <div className="read-empty">
              <h3>Select a message</h3>
              <p>Choose a message from your inbox to read it here.</p>
            </div>
          ) : loadingMessage ? (
            <PmailLoadingScreen
              className="pmail-loading-screen--read-pane"
              heading="Centralizing your experience"
              productName={productName}
            />
          ) : (
            <>
              {messageError ? <div className="pane-error">{messageError}</div> : null}
              <header className="read-header">
                <div>
                  <button type="button" className="read-back-btn" onClick={clearSelectedMessage}>
                    ← Back to messages
                  </button>
                  <h2>{selectedMessage.subject}</h2>
                  <p>
                    <strong>From:</strong> {selectedMessage.from}
                  </p>
                  <p>
                    <strong>To:</strong> {selectedMessage.to}
                  </p>
                  <p className="read-date">{formatDate(selectedMessage.date)}</p>
                </div>
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
              </header>

              {selectedMessage.attachments.length > 0 ? (
                <div className="attachments">
                  {selectedMessage.attachments.map((att) => (
                    <span key={att.partId} className="attachment-row">
                      <a
                        href={api.attachmentUrl(activeFolder, selectedMessage.uid, att.partId)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {att.filename} ({Math.round(att.size / 1024)} KB)
                      </a>
                      <SendForSignatureButton
                        folder={activeFolder}
                        uid={selectedMessage.uid}
                        messageSubject={selectedMessage.subject}
                        attachment={{ partId: att.partId, filename: att.filename, contentType: att.contentType }}
                        enabled={hasAddon("esign-from-email-functionality")}
                        onCreated={(handoff) =>
                          openCompose({
                            mode: "new",
                            to: handoff.to,
                            subject: handoff.subject,
                            html: handoff.html,
                            text: handoff.text,
                          })
                        }
                      />
                    </span>
                  ))}
                  <AttachmentCategoryBadges
                    folder={activeFolder}
                    uid={selectedMessage.uid}
                    enabled={hasAddon("attachment-categorize-functionality")}
                    attachments={selectedMessage.attachments}
                    onVaultExported={(vaultFileId) =>
                      openCompose({ mode: "new", vaultFileIds: [vaultFileId] })
                    }
                  />
                </div>
              ) : null}

              <article className="read-body">
                {selectedMessage.html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedMessage.html }} />
                ) : (
                  <pre>{selectedMessage.text}</pre>
                )}
              </article>
            </>
          )}
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
          activeAccount={user?.activeMailAccount ?? null}
          onSwitched={() => void handleMailboxSwitch()}
          onPaidAddonGate={() => openPaidAddonGate("multi-inbox-functionality", "Multiple Inboxes")}
          onAccountCountChange={setMailAccountCount}
        />
        <MailBottomNavButton
          label="New mail"
          icon={SquarePen}
          onClick={() => openCompose({ mode: "new" })}
        />
      </nav>
      ) : null}

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
          await refreshAfterSend(result?.sentFolder);
        }}
        initial={composeInitial}
        jobHunterEnabled={hasJobHunterAddon}
        themeVersion={activeThemeVersion}
        onCvAttachmentAdded={handleCvAttachmentAdded}
      />

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

      {pendingUndoSend ? (
        <UndoSendToast
          pending={pendingUndoSend}
          onUndone={() => setPendingUndoSend(null)}
          onSent={(sentFolderPath) => {
            setPendingUndoSend(null);
            void refreshAfterSend(sentFolderPath);
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
            inboxSwitcherRef.current?.openWithAddForm();
          }}
          onDismiss={() => setMultiInboxPromptOpen(false)}
          onDontAskAgain={() => {
            setMultiInboxPromptDismissed();
            setMultiInboxPromptOpen(false);
          }}
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
