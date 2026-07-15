import type { MailSortOrder } from "../types/mail";
import type { MailStatusFilter } from "../constants/mailViews";
import "./MailListSortControls.css";

type MailListStatusFilter = Extract<MailStatusFilter, "all" | "unread" | "read">;

type Props = {
  sortOrder: MailSortOrder;
  statusFilter: MailListStatusFilter;
  statusFilterDisabled?: boolean;
  onSortOrderChange: (sortOrder: MailSortOrder) => void;
  onStatusFilterChange: (statusFilter: MailListStatusFilter) => void;
};

export function MailListSortControls({
  sortOrder,
  statusFilter,
  statusFilterDisabled = false,
  onSortOrderChange,
  onStatusFilterChange,
}: Props) {
  return (
    <div className="mail-list-sort-controls" aria-label="Message list sorting">
      <label className="mail-list-sort-control">
        <span className="mail-list-sort-control-label">Date</span>
        <select
          value={sortOrder}
          aria-label="Sort by date"
          onChange={(event) => onSortOrderChange(event.target.value as MailSortOrder)}
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </label>
      <label className="mail-list-sort-control">
        <span className="mail-list-sort-control-label">Status</span>
        <select
          value={statusFilter}
          aria-label="Filter by read status"
          disabled={statusFilterDisabled}
          onChange={(event) => onStatusFilterChange(event.target.value as MailListStatusFilter)}
        >
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </label>
    </div>
  );
}
