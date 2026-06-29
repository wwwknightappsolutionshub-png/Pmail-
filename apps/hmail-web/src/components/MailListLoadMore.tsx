import "./MailListLoadMore.css";

export function MailListLoadMore({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return (
    <div className="mail-list-load-more" aria-live="polite" aria-busy="true">
      <span className="mail-list-load-more-spinner" aria-hidden="true" />
      <span>Loading more…</span>
    </div>
  );
}
