import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import { AddonUpsellPanel } from "../components/AddonUpsellPanel";
import { ComposeModal, type ComposeInitial } from "../components/ComposeModal";
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
} from "../components/FeaturePanels";
import { FolderNav, folderDisplayLabel, resolveFolderKind, sortFolders } from "../components/FolderNav";
import { HMailLogo } from "../components/HMailLogo";
import { MailBulkActions } from "../components/MailBulkActions";
import { MailFilterBar } from "../components/MailFilterBar";
import { MailOrderBar } from "../components/MailOrderBar";
import { MailPaginationBar } from "../components/MailPaginationBar";
import { ContactsPanel } from "../components/ContactsPanel";
import { MailSearchPanel } from "../components/MailSearchPanel";
import { NewFolderModal } from "../components/NewFolderModal";
import { toolAddonSlug } from "../constants/addonTools";
import {
  folderSupportsBulkActions,
  isVirtualView,
  virtualViewTitle,
  VIEW_AUTO_RESPONSE,
  VIEW_CASE_LINKED,
  VIEW_CHECKLISTS,
  VIEW_COMPLIANCE,
  VIEW_CONTACTS,
  VIEW_DEADLINES,
  VIEW_DESK,
  VIEW_IRCC_INTEL,
  VIEW_PORTAL,
  VIEW_SCHEDULED,
  type MailSearchState,
  type MailStatusFilter,
} from "../constants/mailViews";
import type { MailFolder, MailMessageDetail, MailMessageSummary, MailSortField, MailSortOrder } from "../types/mail";
import "./MailPage.css";
import "../components/ContactsPanel.css";

const PAGE_SIZE = 30;

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
};

function renderGatedView(
  view: string,
  hasAddon: (slug: string) => boolean,
  panel: React.ReactNode,
) {
  const slug = toolAddonSlug(view);
  if (slug && !hasAddon(slug)) {
    const copy = ADDON_UPSELL_COPY[slug];
    return (
      <AddonUpsellPanel
        addonSlug={slug}
        addonName={copy?.name ?? "Add-on"}
        description={copy?.description ?? "Start a free trial from the marketplace."}
      />
    );
  }
  return panel;
}

export function MailPage() {
  const { user, logout } = useAuth();
  const { hasAddon } = useAddons();
  const navigate = useNavigate();
  const branding = user?.tenant.branding;
  const productName = branding?.productName ?? "PMail+";
  const tenantName = user?.tenant.name ?? "Prohost Cloud";

  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState("INBOX");
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [messagePage, setMessagePage] = useState(1);
  const [sortBy, setSortBy] = useState<MailSortField>("date");
  const [sortOrder, setSortOrder] = useState<MailSortOrder>("desc");
  const [contactSuggestions, setContactSuggestions] = useState<string[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [contactsPrefillEmail, setContactsPrefillEmail] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [selectedUids, setSelectedUids] = useState<number[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessageDetail | null>(null);
  const [mailFilter, setMailFilter] = useState<MailStatusFilter>("all");
  const [searchDraft, setSearchDraft] = useState<MailSearchState>({ field: "subject", query: "" });
  const [appliedSearch, setAppliedSearch] = useState<MailSearchState>({ field: "subject", query: "" });
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitial, setComposeInitial] = useState<ComposeInitial | undefined>();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");

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
  const showBulkBar = activeFolderKind ? folderSupportsBulkActions(activeFolderKind) : false;
  const activeFolderLabel = getFolderTitle(activeFolder, activeFolderMeta);
  const contentPane = isVirtual || !selectedUid ? "list" : "read";

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const { folders: data } = await api.folders();
      setFolders(data);
      if (!isVirtualView(activeFolder) && !data.some((f) => f.path === activeFolder) && data[0]) {
        setActiveFolder(data[0].path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  }, [activeFolder]);

  const loadMessages = useCallback(async () => {
    if (isVirtualView(activeFolder)) return;

    setLoadingMessages(true);
    setError("");
    try {
      const result = await api.messages(activeFolder, {
        page: messagePage,
        pageSize: PAGE_SIZE,
        searchField: appliedSearch.query ? appliedSearch.field : undefined,
        searchQuery: appliedSearch.query || undefined,
        filter: mailFilter,
        sortBy,
        sortOrder,
      });
      setMessages(result.messages);
      setMessageTotal(result.total);
      setSelectedUids((prev) => prev.filter((uid) => result.messages.some((m) => m.uid === uid)));
      if (selectedUid && !result.messages.some((m) => m.uid === selectedUid)) {
        setSelectedUid(null);
        setSelectedMessage(null);
        setMobilePane("list");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, [activeFolder, appliedSearch, mailFilter, selectedUid, messagePage, sortBy, sortOrder]);

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
      try {
        const { message } = await api.message(activeFolder, uid);
        setSelectedMessage(message);
        setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load message");
      } finally {
        setLoadingMessage(false);
      }
    },
    [activeFolder],
  );

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (selectedUid && !isVirtual) loadMessage(selectedUid);
  }, [selectedUid, loadMessage, isVirtual]);

  const selectFolder = (path: string) => {
    setActiveFolder(path);
    setSelectedUid(null);
    setSelectedMessage(null);
    setSelectedUids([]);
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

  const mobileGoBack = () => {
    if (mobilePane === "read") {
      setMobilePane("list");
      return;
    }
    if (mobilePane === "menu") {
      setMobilePane("list");
    }
  };

  const junkFolder = folders.find((f) => resolveFolderKind(f) === "junk");

  const runBulkAction = async (
    action: "markRead" | "markUnread" | "delete" | "move" | "reportSpam",
    targetFolder?: string,
  ) => {
    if (selectedUids.length === 0) return;
    await api.bulkAction(activeFolder, selectedUids, action, targetFolder);
    setSelectedUids([]);
    setSelectedUid(null);
    setSelectedMessage(null);
    setMobilePane("list");
    await loadMessages();
    await loadFolders();
  };

  const onDelete = async () => {
    if (!selectedUid) return;
    await api.deleteMessage(activeFolder, selectedUid);
    setSelectedUid(null);
    setSelectedMessage(null);
    setMobilePane("list");
    await loadMessages();
    await loadFolders();
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

  const openCompose = (initial?: ComposeInitial) => {
    setComposeInitial(initial);
    setComposeOpen(true);
  };

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

  const handleCreateFolder = async (name: string) => {
    const inbox = folders.find((f) => resolveFolderKind(f) === "inbox");
    const { folder } = await api.createFolder(name, inbox?.path);
    await loadFolders();
    setActiveFolder(folder.path);
  };

  const renderMainContent = () => {
    if (activeFolder === VIEW_SCHEDULED) {
      return renderGatedView(activeFolder, hasAddon, <ScheduledPanelFeature />);
    }
    if (activeFolder === VIEW_AUTO_RESPONSE) {
      return renderGatedView(
        activeFolder,
        hasAddon,
        <TemplatesPanel onUseTemplate={(template) => openCompose({ mode: "new", subject: template.subject, html: template.html })} />,
      );
    }
    if (activeFolder === VIEW_DESK) {
      return renderGatedView(activeFolder, hasAddon, <ImmigrationDeskPanel />);
    }
    if (activeFolder === VIEW_CHECKLISTS) {
      return renderGatedView(activeFolder, hasAddon, <ChecklistsPanel />);
    }
    if (activeFolder === VIEW_COMPLIANCE) {
      return renderGatedView(activeFolder, hasAddon, <CompliancePanel />);
    }
    if (activeFolder === VIEW_IRCC_INTEL) {
      return renderGatedView(activeFolder, hasAddon, <IrccIntelPanel />);
    }
    if (activeFolder === VIEW_CASE_LINKED) {
      return renderGatedView(activeFolder, hasAddon, <CaseLinkedPanel />);
    }
    if (activeFolder === VIEW_DEADLINES) {
      return renderGatedView(activeFolder, hasAddon, <DeadlinesPanel />);
    }
    if (activeFolder === VIEW_PORTAL) {
      return renderGatedView(activeFolder, hasAddon, <ClientPortalPanel />);
    }
    if (activeFolder === VIEW_CONTACTS) {
      return (
        <ContactsPanel
          initialEmail={contactsPrefillEmail}
          onMessage={(msg) => setStatusMessage(msg)}
        />
      );
    }

    const visibleSuggestions = contactSuggestions.filter((e) => !dismissedSuggestions.includes(e));

    return (
      <>
        <MailSearchPanel
          value={searchDraft}
          onChange={setSearchDraft}
          onSearch={() => {
            setAppliedSearch(searchDraft);
            setMessagePage(1);
          }}
          onClear={() => {
            setSearchDraft({ field: "subject", query: "" });
            setAppliedSearch({ field: "subject", query: "" });
            setMessagePage(1);
          }}
        />

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

        {statusMessage ? <div className="pane-status">{statusMessage}</div> : null}

        {visibleSuggestions.length > 0 ? (
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
                setError("Spam folder not found on this mailbox.");
                return;
              }
              runBulkAction("reportSpam", junkFolder.path);
            }}
            onDelete={() => runBulkAction("delete")}
            onMove={(targetFolder) => runBulkAction("move", targetFolder)}
            onClearSelection={() => setSelectedUids([])}
          />
        ) : null}

        {error ? <div className="pane-error">{error}</div> : null}

        <div className="message-list message-list--table">
          {loadingMessages ? (
            <div className="muted pad">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="muted pad">No messages in this folder.</div>
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
                <span>Subject</span>
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
                    <span className="message-subject-text">{msg.subject || "(No subject)"}</span>
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
              <MailPaginationBar
                page={messagePage}
                pageSize={PAGE_SIZE}
                total={messageTotal}
                onPageChange={setMessagePage}
              />
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div
      className="mail-app"
      data-mobile-pane={mobilePane}
      data-virtual-view={isVirtual ? "true" : "false"}
      data-content-pane={contentPane}
      style={
        branding
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

      <div className="mail-layout">
        <div className="mail-sidebar-backdrop" onClick={() => setMobilePane("list")} aria-hidden="true" />

        <aside className="mail-sidebar">
          <div className="mail-sidebar-head">
            <HMailLogo size="sm" showWordmark subtitle={tenantName} productName={productName} className="mail-brand-logo" />
            <button type="button" className="mail-sidebar-close" onClick={() => setMobilePane("list")}>
              Close
            </button>
          </div>

          <FolderNav
            folders={folders}
            activeFolder={activeFolder}
            loading={loadingFolders}
            onSelect={selectFolder}
            onNewFolder={() => setNewFolderOpen(true)}
            onCompose={() => openCompose({ mode: "new" })}
            hasAddon={hasAddon}
            onOpenAddons={(highlightSlug) =>
              navigate(highlightSlug ? `/addons?highlight=${highlightSlug}` : "/addons")
            }
          />

          <div className="sidebar-footer">
            <div className="user-chip">
              <span>{user?.email}</span>
            </div>
            <button type="button" className="ghost-btn" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </aside>

        <section className="mail-list-pane">
          <header className={`list-header ${isVirtual ? "list-header--virtual" : ""}`}>
            <h2>{activeFolderLabel}</h2>
            <div className="list-header-actions">
              <button type="button" className="free-addon-btn" onClick={() => navigate("/addons")}>
                Free Addon
              </button>
              <button type="button" className="signout-btn" onClick={() => logout()}>
                Sign out
              </button>
            </div>
          </header>
          {renderMainContent()}
        </section>

        {!isVirtual ? (
        <section className="mail-read-pane">
          {!selectedMessage ? (
            <div className="read-empty">
              <h3>Select a message</h3>
              <p>Your imported and new Hostinger mail appears here.</p>
            </div>
          ) : loadingMessage ? (
            <div className="muted pad">Loading message…</div>
          ) : (
            <>
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
                  <button type="button" onClick={onReply}>
                    Reply
                  </button>
                  <button type="button" onClick={onReplyAll}>
                    Reply all
                  </button>
                  <button type="button" onClick={onForward}>
                    Forward
                  </button>
                  <button type="button" onClick={onMoveToTrash}>
                    Trash
                  </button>
                  <button type="button" className="danger" onClick={onDelete}>
                    Delete
                  </button>
                </div>
              </header>

              {selectedMessage.attachments.length > 0 ? (
                <div className="attachments">
                  {selectedMessage.attachments.map((att) => (
                    <a
                      key={att.partId}
                      href={api.attachmentUrl(activeFolder, selectedMessage.uid, att.partId)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {att.filename} ({Math.round(att.size / 1024)} KB)
                    </a>
                  ))}
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

      <nav className="mail-bottom-nav" aria-label="Mobile navigation">
        <button
          type="button"
          className={mobilePane === "menu" ? "is-active" : ""}
          onClick={() => setMobilePane("menu")}
        >
          <span>Folders</span>
        </button>
        <button
          type="button"
          className={mobilePane === "list" ? "is-active" : ""}
          onClick={() => setMobilePane("list")}
        >
          <span>Messages</span>
        </button>
        <button type="button" onClick={() => openCompose({ mode: "new" })}>
          <span>New mail</span>
        </button>
        <button type="button" className="mail-bottom-nav-signout" onClick={() => logout()}>
          <span>Sign out</span>
        </button>
      </nav>

      <ComposeModal
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setComposeInitial(undefined);
        }}
        onSent={async (sentFolderPath) => {
          const sentPath =
            sentFolderPath ?? sortedFolders.find((f) => resolveFolderKind(f) === "sent")?.path;

          await loadFolders();

          if (sentPath) {
            setActiveFolder(sentPath);
            setSelectedUid(null);
            setSelectedMessage(null);
            setMobilePane("list");
            setLoadingMessages(true);
            try {
              const result = await api.messages(sentPath, { filter: mailFilter, page: 1, pageSize: PAGE_SIZE, sortBy, sortOrder });
              setMessages(result.messages);
              setMessageTotal(result.total);
              setMessagePage(1);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to load sent messages");
            } finally {
              setLoadingMessages(false);
            }
          } else {
            await loadMessages();
          }
        }}
        initial={composeInitial}
      />

      <NewFolderModal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}
