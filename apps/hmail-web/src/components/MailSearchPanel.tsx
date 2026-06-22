import { FormEvent, useMemo, useState } from "react";
import type { MailSearchField, MailSearchState } from "../constants/mailViews";
import "./MailToolbar.css";

const SEARCH_FIELDS: Array<{ value: MailSearchField; label: string }> = [
  { value: "subject", label: "Subject" },
  { value: "sender", label: "From" },
  { value: "recipient", label: "To" },
  { value: "body", label: "Has the words" },
  { value: "date", label: "Date" },
];

const QUICK_OPERATORS = [
  { label: "From", value: "from:" },
  { label: "To", value: "to:" },
  { label: "Subject", value: "subject:" },
  { label: "Has attachment", value: "has:attachment" },
  { label: "Unread", value: "is:unread" },
  { label: "In inbox", value: "in:inbox" },
];

interface MailSearchPanelProps {
  value: MailSearchState;
  onChange: (next: MailSearchState) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function MailSearchPanel({ value, onChange, onSearch, onClear }: MailSearchPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const token = value.query.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
    if (!token) return QUICK_OPERATORS;
    return QUICK_OPERATORS.filter((entry) => entry.value.startsWith(token));
  }, [value.query]);

  function applyOperator(operator: string) {
    const tokens = value.query.trim().split(/\s+/);
    tokens.pop();
    const next = [...tokens, operator].join(" ").trim();
    onChange({ ...value, query: next.endsWith(":") ? next : `${next} ` });
  }

  function handleAdvancedSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch();
    setAdvancedOpen(false);
  }

  return (
    <div
      className={`mail-search-shell${focused ? " mail-search-shell--focused" : ""}${
        advancedOpen ? " mail-search-shell--advanced" : ""
      }`}
    >
      <div className="mail-search-bar">
        <span className="mail-search-bar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M10 2a8 8 0 1 0 4.9 14.3l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
            />
          </svg>
        </span>
        <input
          type="search"
          className="mail-search-bar-input"
          value={value.query}
          placeholder="Search mail"
          aria-label="Search mail"
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => onChange({ ...value, query: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
              setFocused(false);
            }
          }}
        />
        {value.query ? (
          <button type="button" className="mail-search-bar-clear" aria-label="Clear search" onClick={onClear}>
            ×
          </button>
        ) : null}
        <button
          type="button"
          className={`mail-search-bar-toggle${advancedOpen ? " is-open" : ""}`}
          aria-label="Show search options"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          Options
        </button>
      </div>

      {focused && suggestions.length > 0 && !advancedOpen ? (
        <div className="mail-search-suggestions">
          {suggestions.map((entry) => (
            <button key={entry.value} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyOperator(entry.value)}>
              <strong>{entry.value}</strong>
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {advancedOpen ? (
        <form className="mail-search-advanced" onSubmit={handleAdvancedSubmit}>
          <div className="mail-search-advanced-grid">
            <label className="mail-search-field">
              <span>Search in</span>
              <select
                value={value.field}
                onChange={(event) => onChange({ ...value, field: event.target.value as MailSearchField })}
              >
                {SEARCH_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mail-search-query">
              <span>Query</span>
              <input
                type="search"
                value={value.query}
                placeholder={value.field === "date" ? "e.g. 2025-06-12" : "Search for mails…"}
                onChange={(event) => onChange({ ...value, query: event.target.value })}
              />
            </label>
          </div>
          <div className="mail-search-advanced-actions">
            <button type="submit" className="mail-toolbar-btn">
              Search mail
            </button>
            <button type="button" className="mail-toolbar-btn mail-toolbar-btn--ghost" onClick={onClear}>
              Clear
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
