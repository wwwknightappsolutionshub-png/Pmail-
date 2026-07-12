import "./GmailAppPasswordGuideToast.css";

type GmailAppPasswordGuideToastProps = {
  onOpenGmail: () => void;
  onDismiss: () => void;
};

export function GmailAppPasswordGuideToast({ onOpenGmail, onDismiss }: GmailAppPasswordGuideToastProps) {
  return (
    <div className="gmail-app-password-guide-toast" role="status" aria-live="polite">
      <div className="gmail-app-password-guide-toast-copy">
        <strong>We sent setup steps to your Gmail</strong>
        <p>
          Check your inbox for “How To Activate APP Password”. You can also follow the guide on this page.
        </p>
      </div>
      <div className="gmail-app-password-guide-toast-actions">
        <button type="button" className="gmail-app-password-guide-toast-primary" onClick={onOpenGmail}>
          Open Gmail
        </button>
        <button type="button" className="gmail-app-password-guide-toast-dismiss" onClick={onDismiss}>
          Stay here
        </button>
      </div>
    </div>
  );
}
