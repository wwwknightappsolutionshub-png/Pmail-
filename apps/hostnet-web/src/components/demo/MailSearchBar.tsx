import {
  FormEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  MAIL_SEARCH_SCOPES,
  MAIL_SEARCH_SIZE_OPTIONS,
  advancedFromParsed,
  advancedToParsed,
  emptyMailSearchAdvanced,
  loadRecentMailSearches,
  parseGmailQuery,
  parsedToQuery,
  rememberMailSearch,
  type MailSearchAdvanced,
  type MailSearchContactSuggestion,
  type MailSearchScope,
} from "../../data/mailSearch";

export type MailSearchBarHandle = {
  focus: () => void;
  openAdvanced: () => void;
};

type MailSearchBarProps = {
  query: string;
  active: boolean;
  scope: MailSearchScope;
  contacts?: MailSearchContactSuggestion[];
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: MailSearchScope) => void;
  onSearch: (query: string, scope: MailSearchScope) => void;
  onClear: () => void;
};

type SearchAnchorRect = {
  top: number;
  left: number;
  width: number;
};

const VIEWPORT_EDGE_GAP_PX = 16;
const ADVANCED_PANEL_MAX_WIDTH_PX = 544;

function viewportEdgeGap(): number {
  return VIEWPORT_EDGE_GAP_PX;
}

function clampPanelLeft(left: number, panelWidth: number): number {
  const edgeGap = viewportEdgeGap();
  const maxLeft = window.innerWidth - edgeGap - panelWidth;
  return Math.max(edgeGap, Math.min(left, maxLeft));
}

function computeSearchPanelRect(root: HTMLElement, advanced: boolean): SearchAnchorRect {
  const rect = root.getBoundingClientRect();
  const top = rect.bottom + 6;
  const edgeGap = viewportEdgeGap();

  if (advanced) {
    const width = Math.min(ADVANCED_PANEL_MAX_WIDTH_PX, window.innerWidth - edgeGap * 2);
    return {
      top,
      left: clampPanelLeft(rect.left, width),
      width,
    };
  }

  const width = Math.min(rect.width, window.innerWidth - edgeGap * 2);
  return {
    top,
    left: clampPanelLeft(rect.left, width),
    width,
  };
}

export const MailSearchBar = forwardRef<MailSearchBarHandle, MailSearchBarProps>(function MailSearchBar(
  { query, active, scope, contacts = [], onQueryChange, onScopeChange, onSearch, onClear },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advanced, setAdvanced] = useState<MailSearchAdvanced>(() => emptyMailSearchAdvanced(scope));
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [anchorRect, setAnchorRect] = useState<SearchAnchorRect | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const contactOptions = contacts.map((contact) => `${contact.name} <${contact.email}>`);
  const showRecent = focused && !query.trim() && recentSearches.length > 0 && !advancedOpen;
  const showAdvanced = advancedOpen;
  const showPanel = showRecent || showAdvanced;

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      setFocused(true);
    },
    openAdvanced: () => {
      openAdvancedFromQuery();
    },
  }));

  useLayoutEffect(() => {
    const themedRoot = rootRef.current?.closest(".pmail-demo-shell, .bespoke-demo");
    setPortalRoot((themedRoot instanceof HTMLElement ? themedRoot : null) ?? document.body);
  }, []);

  useLayoutEffect(() => {
    if (!showPanel) {
      setAnchorRect(null);
      return;
    }

    function syncAnchor() {
      const root = rootRef.current;
      if (!root) return;
      setAnchorRect(computeSearchPanelRect(root, showAdvanced));
    }

    syncAnchor();
    window.addEventListener("resize", syncAnchor);
    window.addEventListener("scroll", syncAnchor, true);
    return () => {
      window.removeEventListener("resize", syncAnchor);
      window.removeEventListener("scroll", syncAnchor, true);
    };
  }, [showPanel, query, advancedOpen]);

  useEffect(() => {
    if (!showPanel) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setFocused(false);
      setAdvancedOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showPanel]);

  useEffect(() => {
    setAdvanced((current) => ({ ...current, scope }));
  }, [scope]);

  useEffect(() => {
    if (focused) setRecentSearches(loadRecentMailSearches());
  }, [focused]);

  function submitSearch(nextQuery = query, nextScope = scope) {
    const trimmed = nextQuery.trim();
    if (trimmed) rememberMailSearch(trimmed);
    onSearch(trimmed, nextScope);
    setFocused(false);
    setAdvancedOpen(false);
  }

  function handleAdvancedSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = advancedToParsed(advanced);
    const nextQuery = parsedToQuery(parsed);
    onScopeChange(advanced.scope);
    onQueryChange(nextQuery);
    submitSearch(nextQuery, advanced.scope);
  }

  function openAdvancedFromQuery() {
    const parsed = parseGmailQuery(query, scope);
    setAdvanced(advancedFromParsed(parsed, scope));
    setAdvancedOpen(true);
    setFocused(false);
    inputRef.current?.blur();
  }

  function runRecentSearch(entry: string) {
    onQueryChange(entry);
    setAdvanced(advancedFromParsed(parseGmailQuery(entry, scope), scope));
    submitSearch(entry, parseGmailQuery(entry, scope).scope);
  }

  const panel =
    showPanel && anchorRect && portalRoot
      ? createPortal(
          <div
            ref={panelRef}
            id="pmail-mail-search-panel"
            className={`bespoke-mail-search-portal${showAdvanced ? " bespoke-mail-search-portal--advanced" : ""}`}
            style={{
              top: anchorRect.top,
              left: anchorRect.left,
              width: anchorRect.width,
            }}
          >
            {showRecent ? (
              <div className="bespoke-mail-search-recent" role="listbox" aria-label="Recent searches">
                {recentSearches.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className="bespoke-mail-search-recent-item"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => runRecentSearch(entry)}
                  >
                    <span className="bespoke-mail-search-recent-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M13 3a9 9 0 1 0 8.95 10h-2.1A7 7 0 1 1 13 5V3zm-1 4h2v5h-5V10h3V7z"
                        />
                      </svg>
                    </span>
                    <span className="bespoke-mail-search-recent-text">{entry}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {showAdvanced ? (
              <form className="bespoke-mail-search-advanced" onSubmit={handleAdvancedSubmit}>
                <div className="bespoke-mail-search-advanced-form">
                  <label className="bespoke-mail-search-advanced-row">
                    <span>From</span>
                    <input
                      list="pmail-search-from-contacts"
                      value={advanced.from}
                      onChange={(event) => setAdvanced((current) => ({ ...current, from: event.target.value }))}
                    />
                  </label>
                  <label className="bespoke-mail-search-advanced-row">
                    <span>To</span>
                    <input
                      list="pmail-search-to-contacts"
                      value={advanced.to}
                      onChange={(event) => setAdvanced((current) => ({ ...current, to: event.target.value }))}
                    />
                  </label>
                  <label className="bespoke-mail-search-advanced-row">
                    <span>Subject</span>
                    <input
                      value={advanced.subject}
                      onChange={(event) => setAdvanced((current) => ({ ...current, subject: event.target.value }))}
                    />
                  </label>
                  <label className="bespoke-mail-search-advanced-row">
                    <span>Has the words</span>
                    <input
                      value={advanced.hasWords}
                      onChange={(event) => setAdvanced((current) => ({ ...current, hasWords: event.target.value }))}
                    />
                  </label>
                  <label className="bespoke-mail-search-advanced-row">
                    <span>Doesn&apos;t have</span>
                    <input
                      value={advanced.excludeWords}
                      onChange={(event) =>
                        setAdvanced((current) => ({ ...current, excludeWords: event.target.value }))
                      }
                    />
                  </label>
                  <div className="bespoke-mail-search-advanced-row bespoke-mail-search-advanced-row--size">
                    <span>Size</span>
                    <div className="bespoke-mail-search-advanced-size">
                      <select
                        value={advanced.sizeComparison}
                        onChange={(event) =>
                          setAdvanced((current) => ({
                            ...current,
                            sizeComparison: event.target.value as MailSearchAdvanced["sizeComparison"],
                          }))
                        }
                      >
                        <option value="greater">Greater than</option>
                        <option value="less">Less than</option>
                      </select>
                      <select
                        value={advanced.sizePreset}
                        onChange={(event) =>
                          setAdvanced((current) => ({
                            ...current,
                            sizePreset: event.target.value as MailSearchAdvanced["sizePreset"],
                          }))
                        }
                      >
                        <option value="any">Any size</option>
                        {MAIL_SEARCH_SIZE_OPTIONS.filter((option) => option.value !== "any").map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="bespoke-mail-search-advanced-row">
                    <span>Date within</span>
                    <select
                      value={advanced.datePreset}
                      onChange={(event) =>
                        setAdvanced((current) => ({
                          ...current,
                          datePreset: event.target.value as MailSearchAdvanced["datePreset"],
                        }))
                      }
                    >
                      <option value="any">Any time</option>
                      <option value="1d">1 day</option>
                      <option value="3d">3 days</option>
                      <option value="1w">1 week</option>
                      <option value="1m">1 month</option>
                      <option value="1y">1 year</option>
                      <option value="custom">Custom range…</option>
                    </select>
                  </label>
                  {advanced.datePreset === "custom" ? (
                    <>
                      <label className="bespoke-mail-search-advanced-row">
                        <span>After</span>
                        <input
                          type="date"
                          value={advanced.after}
                          onChange={(event) => setAdvanced((current) => ({ ...current, after: event.target.value }))}
                        />
                      </label>
                      <label className="bespoke-mail-search-advanced-row">
                        <span>Before</span>
                        <input
                          type="date"
                          value={advanced.before}
                          onChange={(event) => setAdvanced((current) => ({ ...current, before: event.target.value }))}
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="bespoke-mail-search-advanced-row">
                    <span>Search</span>
                    <select
                      value={advanced.scope}
                      onChange={(event) =>
                        setAdvanced((current) => ({
                          ...current,
                          scope: event.target.value as MailSearchScope,
                        }))
                      }
                    >
                      {MAIL_SEARCH_SCOPES.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="bespoke-mail-search-advanced-check">
                  <input
                    type="checkbox"
                    checked={advanced.hasAttachment}
                    onChange={(event) =>
                      setAdvanced((current) => ({ ...current, hasAttachment: event.target.checked }))
                    }
                  />
                  Has attachment
                </label>
                <div className="bespoke-mail-search-advanced-actions">
                  <button type="submit" className="bespoke-mail-search-advanced-submit">
                    Search
                  </button>
                </div>
              </form>
            ) : null}
          </div>,
          portalRoot,
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`bespoke-mail-search${focused ? " bespoke-mail-search--focused" : ""}${
          active ? " bespoke-mail-search--active" : ""
        }${advancedOpen ? " bespoke-mail-search--advanced" : ""}${showPanel ? " bespoke-mail-search--open" : ""}`}
      >
        <div className="bespoke-mail-search-bar">
          <span className="bespoke-mail-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 0 4.9 14.3l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"
              />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            className="bespoke-mail-search-input"
            value={query}
            placeholder="Search mail"
            aria-label="Search mail"
            aria-expanded={showPanel}
            aria-controls={showPanel ? "pmail-mail-search-panel" : undefined}
            onFocus={() => setFocused(true)}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setAdvanced(advancedFromParsed(parseGmailQuery(event.target.value, scope), scope));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitSearch();
              }
              if (event.key === "Escape") {
                setFocused(false);
                setAdvancedOpen(false);
                inputRef.current?.blur();
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="bespoke-mail-search-clear"
              aria-label="Clear search"
              onClick={() => {
                onQueryChange("");
                setAdvanced(emptyMailSearchAdvanced(scope));
                onClear();
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          ) : null}
          <button
            type="button"
            className={`bespoke-mail-search-advanced-toggle${advancedOpen ? " bespoke-mail-search-advanced-toggle--open" : ""}`}
            aria-label="Show search options"
            aria-expanded={advancedOpen}
            title="Show search options"
            onClick={() => {
              if (advancedOpen) setAdvancedOpen(false);
              else openAdvancedFromQuery();
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"
              />
            </svg>
          </button>
        </div>

        <datalist id="pmail-search-from-contacts">
          {contactOptions.map((option) => (
            <option key={`from-${option}`} value={option} />
          ))}
        </datalist>
        <datalist id="pmail-search-to-contacts">
          {contactOptions.map((option) => (
            <option key={`to-${option}`} value={option} />
          ))}
        </datalist>
      </div>
      {panel}
    </>
  );
});
