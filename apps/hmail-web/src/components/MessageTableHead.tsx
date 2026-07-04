type MessageTableHeadProps = {
  showBulkBar: boolean;
  allSelected: boolean;
  onToggleSelectAll: () => void;
  primaryColumnLabel: string;
  revealed?: boolean;
};

export function MessageTableHead({
  showBulkBar,
  allSelected,
  onToggleSelectAll,
  primaryColumnLabel,
  revealed = true,
}: MessageTableHeadProps) {
  return (
    <div
      className={`message-table-head${revealed ? "" : " message-table-head--hidden"}`}
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
      <span>Received</span>
    </div>
  );
}
