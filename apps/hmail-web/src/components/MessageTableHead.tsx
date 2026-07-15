import type { ReactNode } from "react";

type MessageTableHeadProps = {
  showBulkBar: boolean;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  primaryColumnLabel: string;
  revealed?: boolean;
  /** Mobile/tablet only: rendered to the right of "Received". */
  trailing?: ReactNode;
};

export function MessageTableHead({
  showBulkBar,
  allSelected,
  onToggleSelectAll,
  primaryColumnLabel,
  revealed = true,
  trailing = null,
}: MessageTableHeadProps) {
  return (
    <div
      className={`message-table-head${revealed ? "" : " message-table-head--hidden"}${
        trailing ? " message-table-head--with-sort" : ""
      }`}
      aria-hidden={revealed ? undefined : true}
    >
      <span>
        {showBulkBar ? (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            aria-label="Select all messages"
          />
        ) : null}
      </span>
      <span>{primaryColumnLabel}</span>
      <span>Excerpt</span>
      <span className="message-table-head-end">
        <span className="message-table-head-received-label">Received</span>
        {trailing ? <span className="message-table-head-sort">{trailing}</span> : null}
      </span>
    </div>
  );
}
