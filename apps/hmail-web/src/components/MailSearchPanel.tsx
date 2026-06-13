import type { MailSearchField, MailSearchState } from "../constants/mailViews";
import "./MailToolbar.css";

const SEARCH_FIELDS: Array<{ value: MailSearchField; label: string }> = [
  { value: "subject", label: "Subject" },
  { value: "sender", label: "Sender" },
  { value: "recipient", label: "Recipient" },
  { value: "body", label: "Body" },
  { value: "date", label: "Date" },
];

interface MailSearchPanelProps {
  value: MailSearchState;
  onChange: (next: MailSearchState) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function MailSearchPanel({ value, onChange, onSearch, onClear }: MailSearchPanelProps) {
  return (
    <div className="mail-search-panel">
      <label className="mail-search-field">
        <span>Search in</span>
        <select
          value={value.field}
          onChange={(e) => onChange({ ...value, field: e.target.value as MailSearchField })}
        >
          {SEARCH_FIELDS.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mail-search-query">
        <span className="sr-only">Search query</span>
        <input
          type="search"
          value={value.query}
          placeholder={
            value.field === "date"
              ? "e.g. 2025-06-12 or Jun 12 2025"
              : "Search for mails…"
          }
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch();
            }
          }}
        />
      </label>
      <button type="button" className="mail-toolbar-btn" onClick={onSearch}>
        Search
      </button>
      {value.query ? (
        <button type="button" className="mail-toolbar-btn mail-toolbar-btn--ghost" onClick={onClear}>
          Clear
        </button>
      ) : null}
    </div>
  );
}
