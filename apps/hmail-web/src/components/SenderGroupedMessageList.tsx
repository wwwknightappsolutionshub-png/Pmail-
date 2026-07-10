import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import type { MailMessageSummary } from "../types/mail";
import type { SenderGroupBy } from "../constants/mailViews";
import { SenderAvatar } from "./SenderAvatar";
import { MessageTableHead } from "./MessageTableHead";
import { extractEmailFromHeader, extractPrimaryEmailFromHeader, senderLabel } from "../utils/senderAvatar";

export { senderLabel };

type Props = {
  messages: MailMessageSummary[];
  selectedUid: number | null;
  expandedSenderEmails: ReadonlySet<string>;
  onToggleSender: (email: string) => void;
  onSelectMessage: (uid: number) => void;
  showBulkBar: boolean;
  selectedUids: number[];
  onToggleSelectUid: (uid: number) => void;
  onToggleSelectAll: () => void;
  onToggleSelectSenderGroup?: (uids: number[]) => void;
  onDeleteSenderGroup?: (email: string, uids: number[], fromHeader: string) => void;
  deletingSenderEmail?: string | null;
  formatDate: (iso: string) => string;
  primaryColumnLabel?: string;
  groupBy?: SenderGroupBy;
  listHeadRevealed?: boolean;
};

function groupKeyForMessage(message: MailMessageSummary, groupBy: SenderGroupBy): string {
  const header = groupBy === "to" ? message.to : message.from;
  return groupBy === "to" ? extractPrimaryEmailFromHeader(header) : extractEmailFromHeader(header);
}

function displayHeaderForMessage(message: MailMessageSummary, groupBy: SenderGroupBy): string {
  return groupBy === "to" ? message.to : message.from;
}

export function SenderGroupedMessageList({
  messages,
  selectedUid,
  expandedSenderEmails,
  onToggleSender,
  onSelectMessage,
  showBulkBar,
  selectedUids,
  onToggleSelectUid,
  onToggleSelectAll,
  onToggleSelectSenderGroup,
  onDeleteSenderGroup,
  deletingSenderEmail = null,
  formatDate,
  primaryColumnLabel = "Sender",
  groupBy = "from",
  listHeadRevealed = true,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, MailMessageSummary[]>();
    for (const message of messages) {
      const email = groupKeyForMessage(message, groupBy);
      const bucket = map.get(email) ?? [];
      bucket.push(message);
      map.set(email, bucket);
    }
    return [...map.entries()].map(([email, items]) => {
      const header = displayHeaderForMessage(items[0]!, groupBy);
      return {
        email,
        label: senderLabel(header),
        from: header,
        messages: items,
        unreadCount: items.filter((item) => !item.seen).length,
      };
    });
  }, [groupBy, messages]);

  return (
    <>
      <MessageTableHead
        showBulkBar={showBulkBar}
        allSelected={messages.length > 0 && selectedUids.length === messages.length}
        onToggleSelectAll={onToggleSelectAll}
        primaryColumnLabel={primaryColumnLabel}
        revealed={listHeadRevealed}
      />
      {groups.map((group) => {
        const expanded = expandedSenderEmails.has(group.email);
        const groupUids = group.messages.map((message) => message.uid);
        const groupAllSelected =
          groupUids.length > 0 && groupUids.every((uid) => selectedUids.includes(uid));
        const groupSomeSelected = groupUids.some((uid) => selectedUids.includes(uid));
        const isDeleting = deletingSenderEmail === group.email;

        return (
          <div key={group.email} className="message-sender-group">
            <div className="message-sender-group-head">
              {showBulkBar ? (
                <span className="message-sender-group-check">
                  <input
                    type="checkbox"
                    checked={groupAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = !groupAllSelected && groupSomeSelected;
                    }}
                    onChange={() => onToggleSelectSenderGroup?.(groupUids)}
                    aria-label={`Select all messages from ${group.label}`}
                  />
                </span>
              ) : null}
              <button
                type="button"
                className="message-sender-toggle"
                aria-expanded={expanded}
                onClick={() => onToggleSender(group.email)}
              >
                <SenderAvatar from={group.from} className="message-sender-avatar" priority="high" />
                <span className="message-sender-meta">
                  <strong>{group.label}</strong>
                  <small>{group.email}</small>
                </span>
                <span className="message-sender-chevron" aria-hidden="true">
                  {expanded ? "▾" : "▸"}
                </span>
              </button>
              <div className="message-sender-group-actions">
                {group.unreadCount > 0 ? (
                  <span className="message-sender-unread">{group.unreadCount} unread</span>
                ) : null}
                {showBulkBar && onDeleteSenderGroup ? (
                  <button
                    type="button"
                    className="message-sender-delete-btn"
                    disabled={isDeleting}
                    aria-label={`Delete messages from ${group.label}`}
                    onClick={() => onDeleteSenderGroup(group.email, groupUids, group.from)}
                  >
                    <Trash2 className="message-sender-delete-btn-icon" strokeWidth={2.25} aria-hidden="true" />
                    <span className="message-sender-delete-btn-label">
                      {isDeleting ? "Deleting…" : "Delete sender"}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
            {expanded
              ? group.messages.map((msg) => (
                  <div
                    key={msg.uid}
                    className={`message-table-row ${selectedUid === msg.uid ? "selected" : ""} ${msg.seen ? "" : "unread"}`}
                  >
                    <span className="message-table-cell message-table-cell--check">
                      {showBulkBar ? (
                        <input
                          type="checkbox"
                          checked={selectedUids.includes(msg.uid)}
                          onChange={() => onToggleSelectUid(msg.uid)}
                          aria-label={`Select message ${msg.subject}`}
                        />
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="message-table-cell message-table-cell--subject message-table-cell--grouped-subject"
                      onClick={() => onSelectMessage(msg.uid)}
                    >
                      <SenderAvatar
                        from={groupBy === "to" ? msg.to : msg.from}
                        className="message-table-sender-avatar"
                        size="sm"
                      />
                      <span className="message-subject-text">{msg.subject || "(No subject)"}</span>
                      {msg.flagged ? (
                        <span className="message-star" aria-label="Starred">
                          ★
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="message-table-cell message-table-cell--snippet"
                      onClick={() => onSelectMessage(msg.uid)}
                    >
                      {msg.snippet || (groupBy === "to" ? msg.to : msg.from) || "—"}
                    </button>
                    <button
                      type="button"
                      className="message-table-cell message-table-cell--date"
                      onClick={() => onSelectMessage(msg.uid)}
                    >
                      <time>{formatDate(msg.date)}</time>
                    </button>
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </>
  );
}
