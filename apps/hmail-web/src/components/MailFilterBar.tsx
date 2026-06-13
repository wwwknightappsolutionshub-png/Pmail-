import type { MailStatusFilter } from "../constants/mailViews";
import "./MailToolbar.css";

const FILTERS: Array<{ value: MailStatusFilter; label: string }> = [
  { value: "all", label: "All mails" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "starred", label: "Starred" },
];

interface MailFilterBarProps {
  value: MailStatusFilter;
  onChange: (filter: MailStatusFilter) => void;
}

export function MailFilterBar({ value, onChange }: MailFilterBarProps) {
  return (
    <div className="mail-filter-bar" role="tablist" aria-label="Mail filters">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          role="tab"
          aria-selected={value === filter.value}
          className={`mail-filter-chip ${value === filter.value ? "is-active" : ""}`}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
