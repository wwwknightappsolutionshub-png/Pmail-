import { useEffect, useState } from "react";
import type { DemoCrmContact } from "../../data/bespokeMailDemoData";
import type {
  ComposeMailDraft,
  DemoOutboundMail,
  DemoTrashItem,
  DocumentAttachmentRow,
  MailFolderId,
} from "../../data/demoMailClient";
import {
  DOCUMENTS_PAGE_SIZE,
  OUTLOOK_MAIL_FOLDERS,
  formatOpenTrackingSummary,
  mailIsOpened,
  paginate,
} from "../../data/demoMailClient";
import { DetailPdfIcon, DetailPrintIcon } from "./DetailToolbarIcons";

type FolderCounts = Record<MailFolderId, number>;

type MailFolderNavProps = {
  activeFolder: MailFolderId;
  counts: FolderCounts;
  onSelect: (folder: MailFolderId) => void;
  onAutoReplyClick?: () => void;
  autoReplyActive?: boolean;
  autoReplyStatusLabel?: string;
};

export function MailFolderNav({
  activeFolder,
  counts,
  onSelect,
  onAutoReplyClick,
  autoReplyActive,
  autoReplyStatusLabel,
}: MailFolderNavProps) {
  return (
    <div className="bespoke-demo-mail-folders">
      {OUTLOOK_MAIL_FOLDERS.map((folder) => (
        <div key={folder.id}>
          <button
            type="button"
            className={`bespoke-demo-mail-folder${
              activeFolder === folder.id ? " bespoke-demo-mail-folder--active" : ""
            }`}
            onClick={() => onSelect(folder.id)}
          >
            <span>{folder.label}</span>
            {folder.id !== "new-mail" && counts[folder.id] > 0 ? (
              <span className="bespoke-demo-mail-folder-count">{counts[folder.id]}</span>
            ) : null}
          </button>
          {folder.id === "trash" ? (
            <button
              type="button"
              className={`bespoke-demo-mail-folder bespoke-demo-mail-folder--tool${
                autoReplyActive ? " bespoke-demo-mail-folder--active" : ""
              }`}
              onClick={onAutoReplyClick}
              title="Auto Reply — automatic inbox acknowledgments"
            >
              <span>Auto Reply</span>
              {autoReplyStatusLabel ? (
                <span className="bespoke-demo-mail-folder-count">{autoReplyStatusLabel}</span>
              ) : null}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type MailComposeFormProps = {
  draft: ComposeMailDraft;
  contacts: DemoCrmContact[];
  fromHeader: string;
  whatsappEnabled?: boolean;
  centered?: boolean;
  onChange: (draft: ComposeMailDraft) => void;
  onSaveDraft: () => void;
  onSend: () => void;
  onSchedule: () => void;
  onSendWhatsapp?: () => void;
  onDiscard: () => void;
};

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

export function MailComposeForm({
  draft,
  contacts,
  fromHeader,
  whatsappEnabled = false,
  centered = false,
  onChange,
  onSaveDraft,
  onSend,
  onSchedule,
  onSendWhatsapp,
  onDiscard,
}: MailComposeFormProps) {
  const [showCcBcc, setShowCcBcc] = useState(Boolean(draft.ccEmail || draft.bccEmail));
  const [showSchedule, setShowSchedule] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (draft.ccEmail || draft.bccEmail) {
      setShowCcBcc(true);
    }
  }, [draft.ccEmail, draft.bccEmail]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        x: dragging.originX + event.clientX - dragging.startX,
        y: dragging.originY + event.clientY - dragging.startY,
      });
    };
    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  function fillContact(contactId: string) {
    const contact = contacts.find((entry) => entry.id === contactId);
    if (!contact) return;
    onChange({
      ...draft,
      contactId: contact.id,
      toName: contact.name,
      toEmail: contact.email,
    });
  }

  const subjectLabel = draft.subject.trim() || "New Message";

  if (minimized) {
    return (
      <div className={`gmail-compose gmail-compose--minimized${centered ? " gmail-compose--centered" : ""}`}>
        <button type="button" className="gmail-compose__restore" onClick={() => setMinimized(false)}>
          {subjectLabel}
        </button>
        <button type="button" className="gmail-compose__win-btn" onClick={onDiscard} aria-label="Discard">
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      className={`gmail-compose${maximized ? " gmail-compose--maximized" : ""}${centered ? " gmail-compose--centered" : ""}`}
      role="dialog"
      aria-label="New message"
      aria-modal="true"
      style={centered || maximized ? undefined : { transform: `translate(${position.x}px, ${position.y}px)` }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header
        className={`gmail-compose__titlebar${centered ? "" : " gmail-compose__titlebar--draggable"}`}
        onMouseDown={(event) => {
          if (maximized || centered) return;
          setDragging({ startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y });
        }}
      >
        <span>{editingLabel(draft)}</span>
        <div className="gmail-compose__window-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" className="gmail-compose__win-btn" onClick={() => setMinimized(true)} aria-label="Minimize">
            −
          </button>
          <button
            type="button"
            className="gmail-compose__win-btn"
            onClick={() => setMaximized((value) => !value)}
            aria-label={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? "⧉" : "□"}
          </button>
          <button type="button" className="gmail-compose__win-btn" onClick={onDiscard} aria-label="Discard">
            ×
          </button>
        </div>
      </header>

      <form
        className="gmail-compose__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <div className="gmail-compose__row">
          <span className="gmail-compose__label">From</span>
          <span className="gmail-compose__static">{fromHeader}</span>
        </div>

        <div className="gmail-compose__row gmail-compose__row--split">
          <span className="gmail-compose__label">To</span>
          <input
            className="gmail-compose__input"
            type="email"
            value={draft.toEmail}
            onChange={(event) => onChange({ ...draft, toEmail: event.target.value })}
            placeholder="Recipients"
          />
          <button
            type="button"
            className={`gmail-compose__whatsapp${whatsappEnabled ? " gmail-compose__whatsapp--enabled" : ""}`}
            title={whatsappEnabled ? "Send to WhatsApp-enabled phone number" : "WhatsApp send is paid"}
            onClick={onSendWhatsapp}
          >
            <WhatsAppIcon />
          </button>
          {!showCcBcc ? (
            <button type="button" className="gmail-compose__cc-toggle" onClick={() => setShowCcBcc(true)}>
              Cc Bcc
            </button>
          ) : null}
        </div>

        {showCcBcc ? (
          <>
            <div className="gmail-compose__row">
              <span className="gmail-compose__label">Cc</span>
              <input
                className="gmail-compose__input"
                type="email"
                value={draft.ccEmail}
                onChange={(event) => onChange({ ...draft, ccEmail: event.target.value })}
                placeholder="Cc recipients"
              />
            </div>
            <div className="gmail-compose__row">
              <span className="gmail-compose__label">Bcc</span>
              <input
                className="gmail-compose__input"
                type="email"
                value={draft.bccEmail}
                onChange={(event) => onChange({ ...draft, bccEmail: event.target.value })}
                placeholder="Bcc recipients"
              />
            </div>
          </>
        ) : null}

        <div className="gmail-compose__row gmail-compose__row--contact">
          <span className="gmail-compose__label">Contact</span>
          <select
            className="gmail-compose__select"
            value={draft.contactId}
            onChange={(event) => fillContact(event.target.value)}
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          <input
            className="gmail-compose__input gmail-compose__input--name"
            value={draft.toName}
            onChange={(event) => onChange({ ...draft, toName: event.target.value })}
            placeholder="Display name"
          />
        </div>

        <div className="gmail-compose__row">
          <span className="gmail-compose__label">Subject</span>
          <input
            className="gmail-compose__input"
            value={draft.subject}
            onChange={(event) => onChange({ ...draft, subject: event.target.value })}
            placeholder="Subject"
            required
          />
        </div>

        {draft.bodyHtml ? (
          <div className="gmail-compose__html-preview">
            <p className="gmail-compose__html-label">Branded PMail+ invitation preview</p>
            <iframe title="Email preview" className="gmail-compose__html-frame" srcDoc={draft.bodyHtml} />
          </div>
        ) : (
          <textarea
            className="gmail-compose__body"
            value={draft.body}
            onChange={(event) => onChange({ ...draft, body: event.target.value })}
            placeholder="Write your message…"
          />
        )}

        {draft.attachment ? (
          <div className="gmail-compose__attachment-chip">
            <span>📎 {draft.attachment}</span>
            <button type="button" onClick={() => onChange({ ...draft, attachment: "" })} aria-label="Remove attachment">
              ×
            </button>
          </div>
        ) : null}

        {showSchedule ? (
          <div className="gmail-compose__schedule-panel">
            <label className="gmail-compose__schedule-field">
              <span>Date</span>
              <input
                type="date"
                value={draft.scheduleDate}
                onChange={(event) => onChange({ ...draft, scheduleDate: event.target.value })}
              />
            </label>
            <label className="gmail-compose__schedule-field">
              <span>Time</span>
              <input
                type="time"
                value={draft.scheduleTime}
                onChange={(event) => onChange({ ...draft, scheduleTime: event.target.value })}
              />
            </label>
            <button type="button" className="btn btn-secondary" onClick={onSchedule}>
              Schedule send
            </button>
          </div>
        ) : null}

        <footer className="gmail-compose__footer">
          <div className="gmail-compose__send-wrap">
            <button type="submit" className="gmail-compose__send">
              Send
            </button>
            <button
              type="button"
              className="gmail-compose__send-menu"
              aria-label="Send options"
              onClick={() => setShowSendMenu((value) => !value)}
            >
              ▾
            </button>
            {showSendMenu ? (
              <div className="gmail-compose__send-dropdown">
                <button type="button" onClick={onSend}>
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSchedule(true);
                    setShowSendMenu(false);
                  }}
                >
                  Schedule send
                </button>
                <button type="button" onClick={onSaveDraft}>
                  Save draft
                </button>
              </div>
            ) : null}
          </div>

          <div className="gmail-compose__toolbar">
            <button
              type="button"
              className="gmail-compose__tool"
              title="Attach file"
              onClick={() => {
                const name = window.prompt("Attachment filename", draft.attachment || "document.pdf");
                if (name) onChange({ ...draft, attachment: name.trim() });
              }}
            >
              📎
            </button>
            <button type="button" className="gmail-compose__tool" title="Insert link">
              🔗
            </button>
            <button type="button" className="gmail-compose__tool" title="Formatting">
              Aa
            </button>
            <button type="button" className="gmail-compose__tool" title="Emoji">
              ☺
            </button>
            <button type="button" className="gmail-compose__tool" title="More options" onClick={() => setShowSchedule((v) => !v)}>
              ⋮
            </button>
          </div>

          <button type="button" className="gmail-compose__discard" onClick={onDiscard}>
            Discard
          </button>
        </footer>
      </form>
    </div>
  );
}

function editingLabel(draft: ComposeMailDraft): string {
  return draft.subject.trim() ? draft.subject.trim() : "New Message";
}

function MailOpenTrackingBadge({ mail }: { mail: DemoOutboundMail }) {
  if (mail.status !== "sent" || !mail.openTracking?.enabled) return null;

  const opened = mailIsOpened(mail.openTracking);
  return (
    <span
      className={`bespoke-demo-open-badge${
        opened ? " bespoke-demo-open-badge--opened" : " bespoke-demo-open-badge--unopened"
      }`}
      title={formatOpenTrackingSummary(mail.openTracking)}
    >
      {opened ? "Opened" : "Unopened"}
    </span>
  );
}

function MailOpenTrackingPanel({
  mail,
  onSimulateOpen,
}: {
  mail: DemoOutboundMail;
  onSimulateOpen?: () => void;
}) {
  if (mail.status !== "sent" || !mail.openTracking?.enabled) return null;

  const tracking = mail.openTracking;
  const opened = mailIsOpened(tracking);

  return (
    <div className="bespoke-demo-open-tracking">
      <div className="bespoke-demo-open-tracking-head">
        <p className="bespoke-demo-open-tracking-title">Recipient open tracking</p>
        <MailOpenTrackingBadge mail={mail} />
      </div>
      <p className="muted bespoke-demo-open-tracking-summary">{formatOpenTrackingSummary(tracking)}</p>
      {opened ? (
        <dl className="bespoke-demo-open-tracking-meta">
          <div>
            <dt>First opened</dt>
            <dd>{tracking.firstOpenedAt}</dd>
          </div>
          <div>
            <dt>Last opened</dt>
            <dd>{tracking.lastOpenedAt}</dd>
          </div>
          <div>
            <dt>Total opens</dt>
            <dd>{tracking.openCount}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted bespoke-demo-open-tracking-hint">
          No open recorded yet. Tracking pixel is active on this sent message.
        </p>
      )}
      {onSimulateOpen ? (
        <button type="button" className="btn btn-secondary bespoke-demo-open-simulate-btn" onClick={onSimulateOpen}>
          {opened ? "Simulate another open" : "Simulate recipient open"}
        </button>
      ) : null}
    </div>
  );
}

type MailOutboundListProps = {
  items: DemoOutboundMail[];
  selectedId: string | null;
  emptyLabel: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSendNow?: (id: string) => void;
  showOpenTracking?: boolean;
};

export function MailOutboundList({
  items,
  selectedId,
  emptyLabel,
  onSelect,
  onEdit,
  onDelete,
  onSendNow,
  showOpenTracking = false,
}: MailOutboundListProps) {
  if (items.length === 0) {
    return <p className="muted bespoke-demo-empty">{emptyLabel}</p>;
  }

  return (
    <div className="bespoke-demo-message-list">
      {items.map((item) => (
        <div key={item.id} className="bespoke-demo-outbound-row">
          <button
            type="button"
            className={`bespoke-demo-message${
              selectedId === item.id ? " bespoke-demo-message--active" : ""
            }`}
            onClick={() => onSelect(item.id)}
          >
            <div className="bespoke-demo-message-top">
              <strong>{item.subject}</strong>
              <span className="bespoke-demo-message-meta">
                {showOpenTracking ? <MailOpenTrackingBadge mail={item} /> : null}
                <span>{item.time}</span>
              </span>
            </div>
            <p className="bespoke-demo-message-preview">
              To: {item.to} · {item.preview}
            </p>
          </button>
          <div className="bespoke-demo-outbound-actions">
            {onEdit ? (
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(item.id)}>
                Edit
              </button>
            ) : null}
            {onSendNow ? (
              <button type="button" className="btn btn-ghost" onClick={() => onSendNow(item.id)}>
                Send now
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" className="btn btn-ghost" onClick={() => onDelete(item.id)}>
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

type MailTrashListProps = {
  items: DemoTrashItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onDeleteForever: (id: string) => void;
};

export function MailTrashList({ items, selectedId, onSelect, onRestore, onDeleteForever }: MailTrashListProps) {
  if (items.length === 0) {
    return <p className="muted bespoke-demo-empty">Trash is empty.</p>;
  }

  return (
    <div className="bespoke-demo-message-list">
      {items.map((item) => {
        const subject = item.inboxMessage?.subject ?? item.outboundMail?.subject ?? "Deleted item";
        const preview = item.inboxMessage?.preview ?? item.outboundMail?.preview ?? "";
        return (
          <div key={item.id} className="bespoke-demo-outbound-row">
            <button
              type="button"
              className={`bespoke-demo-message${
                selectedId === item.id ? " bespoke-demo-message--active" : ""
              }`}
              onClick={() => onSelect(item.id)}
            >
              <div className="bespoke-demo-message-top">
                <strong>{subject}</strong>
                <span>{item.deletedAt}</span>
              </div>
              <p className="bespoke-demo-message-preview">{preview}</p>
            </button>
            <div className="bespoke-demo-outbound-actions">
              <button type="button" className="btn btn-ghost" onClick={() => onRestore(item.id)}>
                Restore
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onDeleteForever(item.id)}>
                Delete forever
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type MailDocumentsTableProps = {
  rows: DocumentAttachmentRow[];
  page: number;
  onPageChange: (page: number) => void;
  onOpenMessage: (messageId: string, isInbox: boolean) => void;
};

export function MailDocumentsTable({ rows, page, onPageChange, onOpenMessage }: MailDocumentsTableProps) {
  const { items, totalPages } = paginate(rows, page, DOCUMENTS_PAGE_SIZE);

  return (
    <div className="bespoke-demo-documents-pane">
      <div className="bespoke-demo-list-head">
        <div>
          <h2>Documents</h2>
          <p className="bespoke-demo-grouping-note">Attachments extracted from inbox and sent mail</p>
        </div>
        <span>
          {rows.length} files · Page {page} of {totalPages}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="muted bespoke-demo-empty">No attachments found in mail yet.</p>
      ) : (
        <>
          <div className="bespoke-demo-documents-table-wrap">
            <table className="bespoke-demo-documents-table">
              <thead>
                <tr>
                  <th>Sender email</th>
                  <th>Date</th>
                  <th>Attachment</th>
                  <th>Link to email</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.senderEmail}</td>
                    <td>{row.date}</td>
                    <td>{row.attachment}</td>
                    <td>
                      <button
                        type="button"
                        className="bespoke-demo-link-btn"
                        onClick={() => onOpenMessage(row.messageId, row.id.startsWith("doc-out-") === false)}
                      >
                        {row.messageSubject}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bespoke-demo-pagination">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>
            <span className="muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function OutboundDetail({
  mail,
  onEdit,
  onDelete,
  onSendNow,
  onSimulateOpen,
  onPrint,
  onMailToPdf,
}: {
  mail: DemoOutboundMail;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendNow?: () => void;
  onSimulateOpen?: () => void;
  onPrint?: () => void;
  onMailToPdf?: () => void;
}) {
  return (
    <div className="bespoke-demo-detail-body">
      <p className="bespoke-demo-detail-from">
        To: {mail.to} &lt;{mail.toEmail}&gt;
      </p>
      <div className="bespoke-demo-detail-title-row">
        <h3>{mail.subject}</h3>
        <div className="bespoke-demo-detail-toolbar">
          {onMailToPdf ? (
            <button
              type="button"
              className="bespoke-demo-detail-icon-btn"
              title="Mail 2 PDF — convert mail trail (paid)"
              aria-label="Mail 2 PDF — convert mail trail"
              onClick={onMailToPdf}
            >
              <DetailPdfIcon />
            </button>
          ) : null}
          {onPrint ? (
            <button type="button" className="bespoke-demo-detail-icon-btn" title="Print" onClick={onPrint}>
              <DetailPrintIcon />
            </button>
          ) : null}
        </div>
      </div>
      <MailOpenTrackingPanel mail={mail} onSimulateOpen={onSimulateOpen} />
      <p>{mail.body}</p>
      {mail.attachment ? (
        <div className="bespoke-demo-attachment">
          <span>Attachment</span>
          <strong>{mail.attachment}</strong>
        </div>
      ) : null}
      {mail.scheduledFor ? (
        <p className="muted">
          Scheduled for: <strong>{mail.scheduledFor}</strong>
        </p>
      ) : null}
      <div className="bespoke-demo-detail-actions">
        {onEdit ? (
          <button type="button" className="bespoke-demo-link-btn" onClick={onEdit}>
            Edit message
          </button>
        ) : null}
        {onSendNow ? (
          <button type="button" className="bespoke-demo-link-btn" onClick={onSendNow}>
            Send now
          </button>
        ) : null}
        {onDelete ? (
          <button type="button" className="bespoke-demo-link-btn" onClick={onDelete}>
            Move to trash
          </button>
        ) : null}
      </div>
    </div>
  );
}
