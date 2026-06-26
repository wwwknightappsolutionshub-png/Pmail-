import "./MailPaginationBar.css";

interface MailPaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export function MailPaginationBar({ page, pageSize, total, loading = false, onPageChange }: MailPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  const pageLabel =
    loading && total > 0
      ? `Loading page ${page}…`
      : total === 0
        ? "No messages"
        : `Page ${page} of ${totalPages}`;

  return (
    <div className={`mail-pagination${loading ? " mail-pagination--loading" : ""}`} aria-busy={loading}>
      <div className="mail-pagination-nav" role="navigation" aria-label="Message list pages">
        <button
          type="button"
          className="mail-pagination-btn mail-pagination-btn--arrow"
          disabled={!canGoBack || total === 0}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          &lt;
        </button>
        <span className="mail-pagination-page-label">{pageLabel}</span>
        <button
          type="button"
          className="mail-pagination-btn mail-pagination-btn--arrow"
          disabled={!canGoForward || total === 0}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
