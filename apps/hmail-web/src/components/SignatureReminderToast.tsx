import "./SignatureReminderToast.css";

type SignatureReminderToastProps = {
  onOpenBrandSettings: () => void;
  onDismiss: () => void;
  onDontAskAgain: () => void;
};

export function SignatureReminderToast({
  onOpenBrandSettings,
  onDismiss,
  onDontAskAgain,
}: SignatureReminderToastProps) {
  return (
    <div className="signature-reminder-toast-overlay" role="dialog" aria-modal="true" aria-labelledby="signature-reminder-title">
      <div className="signature-reminder-toast">
        <div className="signature-reminder-toast-copy">
          <strong id="signature-reminder-title">Add More Credibility To Your Mails</strong>
          <p className="signature-reminder-toast-subtitle">
            Create a bespoke email signature which is attached to all your mail trail by default.
          </p>
        </div>
        <div className="signature-reminder-toast-actions">
          <button type="button" className="signature-reminder-toast-link" onClick={onOpenBrandSettings}>
            Open Brand Settings
          </button>
          <button type="button" className="signature-reminder-toast-btn" onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className="signature-reminder-toast-btn signature-reminder-toast-btn--subtle" onClick={onDontAskAgain}>
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </div>
  );
}
