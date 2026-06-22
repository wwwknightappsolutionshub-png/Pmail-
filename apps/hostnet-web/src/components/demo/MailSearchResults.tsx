import { contactInitials } from "../../data/demoMailUtils";
import { MAIL_SEARCH_SCOPES, resultSenderEmail, resultSenderLabel, type MailSearchResultItem, type MailSearchScope } from "../../data/mailSearch";

type MailSearchResultsProps = {
  query: string;
  scope: MailSearchScope;
  results: MailSearchResultItem[];
  selectedId: string | null;
  onScopeChange: (scope: MailSearchScope) => void;
  onSelect: (result: MailSearchResultItem) => void;
  onClear: () => void;
};

export function MailSearchResults({
  query,
  scope,
  results,
  selectedId,
  onScopeChange,
  onSelect,
  onClear,
}: MailSearchResultsProps) {
  return (
    <div className="bespoke-mail-search-results">
      <div className="bespoke-mail-search-results-head">
        <div>
          <h2>Search results</h2>
          <p className="muted">
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <strong>{query.trim() ? `"${query.trim()}"` : "all filters"}</strong>
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Exit search
        </button>
      </div>

      <div className="bespoke-mail-search-scope-bar" role="tablist" aria-label="Search scope">
        {MAIL_SEARCH_SCOPES.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={scope === entry.value}
            className={`bespoke-mail-search-scope-chip${scope === entry.value ? " bespoke-mail-search-scope-chip--active" : ""}`}
            onClick={() => onScopeChange(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="bespoke-mail-search-empty">
          <strong>No messages matched your search.</strong>
          <p className="muted">
            Try different keywords or open search options to use From, To, Subject, and date filters like Gmail.
          </p>
        </div>
      ) : (
        <div className="bespoke-mail-search-result-list">
          {results.map((result) => {
            const senderName = resultSenderLabel(result);
            const senderEmail = resultSenderEmail(result);
            return (
              <button
                key={result.id}
                type="button"
                className={`bespoke-mail-search-result${
                  selectedId === result.id ? " bespoke-mail-search-result--active" : ""
                }${result.unread ? " bespoke-mail-search-result--unread" : ""}`}
                onClick={() => onSelect(result)}
              >
                <span className="bespoke-mail-search-result-avatar">{contactInitials(senderName)}</span>
                <div className="bespoke-mail-search-result-body">
                  <div className="bespoke-mail-search-result-top">
                    <strong>{senderName}</strong>
                    <span>{result.time}</span>
                  </div>
                  <div className="bespoke-mail-search-result-subject">
                    <strong>{result.subject}</strong>
                    {result.hasAttachment ? <span className="bespoke-mail-search-result-badge">📎</span> : null}
                  </div>
                  <p>{result.preview}</p>
                  <div className="bespoke-mail-search-result-meta">
                    <span className="bespoke-mail-search-result-folder">{result.folderLabel}</span>
                    {result.labels?.slice(0, 2).map((label) => (
                      <span key={label} className="bespoke-mail-search-result-badge">
                        {label}
                      </span>
                    )) ?? null}
                    <span>{senderEmail}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
