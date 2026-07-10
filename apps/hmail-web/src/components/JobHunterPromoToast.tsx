import "./JobHunterPromoToast.css";

interface JobHunterPromoToastProps {
  onExplore: () => void;
  onDismiss: () => void;
}

export function JobHunterPromoToast({ onExplore, onDismiss }: JobHunterPromoToastProps) {
  return (
    <div className="job-hunter-promo-toast" role="status" aria-live="polite">
      <div>
        <strong>Looking for a better opportunity?</strong>
        <p>Try PMail&apos;s Job Hunter workspace</p>
      </div>
      <div className="job-hunter-promo-toast-actions">
        <button type="button" className="job-hunter-promo-btn primary" onClick={onExplore}>
          Explore workspace
        </button>
        <button type="button" className="job-hunter-promo-btn" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
