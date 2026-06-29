import { useMemo } from "react";
import type { MailMessageSummary } from "../types/mail";
import { SenderAvatar } from "./SenderAvatar";
import { extractEmailFromHeader, senderLabel } from "../utils/senderAvatar";

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
  formatDate: (iso: string) => string;
  primaryColumnLabel?: string;
};

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
  formatDate,
  primaryColumnLabel = "Sender",
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, MailMessageSummary[]>();
    for (const message of messages) {
      const email = extractEmailFromHeader(message.from);
      const bucket = map.get(email) ?? [];
      bucket.push(message);
      map.set(email, bucket);
    }
    return [...map.entries()].map(([email, items]) => ({
      email,
      label: senderLabel(items[0]?.from ?? email),
      from: items[0]?.from ?? email,
      messages: items,
      unreadCount: items.filter((item) => !item.seen).length,
    }));
  }, [messages]);

  return (
    <>
      <div className="message-table-head">
        <span>
          {showBulkBar ? (
            <input
              type="checkbox"
              checked={messages.length > 0 && selectedUids.length === messages.length}
              onChange={onToggleSelectAll}
              aria-label="Select all messages"
            />
          ) : null}
        </span>
        <span>{primaryColumnLabel}</span>
        <span>Excerpt</span>
        <span>Received</span>
      </div>
      {groups.map((group) => {
        const expanded = expandedSenderEmails.has(group.email);
        return (
          <div key={group.email} className="message-sender-group">
            <div className="message-sender-group-head">
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
              {group.unreadCount > 0 ? (
                <span className="message-sender-unread">{group.unreadCount} unread</span>
              ) : null}
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
                      <SenderAvatar from={msg.from} className="message-table-sender-avatar" size="sm" />
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
                      {msg.snippet || msg.from || "—"}
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
