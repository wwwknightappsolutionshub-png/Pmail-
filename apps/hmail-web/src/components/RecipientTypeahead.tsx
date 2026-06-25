import { useEffect, useId, useRef, useState } from "react";
import { api } from "../api/client";
import "./RecipientTypeahead.css";

export type RecipientSuggestion = {
  email: string;
  label: string | null;
  source: "contact" | "inbox" | "sent";
};

type RecipientTypeaheadProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const SOURCE_LABEL: Record<RecipientSuggestion["source"], string> = {
  contact: "Contact",
  inbox: "Inbox",
  sent: "Sent",
};

export function RecipientTypeahead({
  id,
  value,
  onChange,
  placeholder = "Recipients",
  disabled = false,
}: RecipientTypeaheadProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void api
        .recipientSuggestions(value)
        .then((result) => {
          setSuggestions(result.suggestions);
          setActiveIndex(result.suggestions.length > 0 ? 0 : -1);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [value, open]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const pickSuggestion = (suggestion: RecipientSuggestion) => {
    onChange(suggestion.email);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) pickSuggestion(picked);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="recipient-typeahead" ref={rootRef}>
      <input
        id={id}
        type="text"
        className="gmail-compose__input recipient-typeahead__input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (loading || suggestions.length > 0) ? (
        <ul className="recipient-typeahead__list" id={listId} role="listbox">
          {loading ? <li className="recipient-typeahead__status">Searching…</li> : null}
          {!loading
            ? suggestions.map((suggestion, index) => (
                <li key={`${suggestion.email}-${suggestion.source}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`recipient-typeahead__option${index === activeIndex ? " is-active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pickSuggestion(suggestion)}
                  >
                    <span className="recipient-typeahead__email">{suggestion.email}</span>
                    {suggestion.label ? <span className="recipient-typeahead__label">{suggestion.label}</span> : null}
                    <span className="recipient-typeahead__source">{SOURCE_LABEL[suggestion.source]}</span>
                  </button>
                </li>
              ))
            : null}
        </ul>
      ) : null}
    </div>
  );
}
