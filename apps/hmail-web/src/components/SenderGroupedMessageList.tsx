import { useMemo } from "react";
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
