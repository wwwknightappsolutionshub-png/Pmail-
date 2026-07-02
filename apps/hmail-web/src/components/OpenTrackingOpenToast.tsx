import "./OpenTrackingOpenToast.css";

type OpenTrackingOpenToastProps = {
  toEmail: string;
  subject: string;
  onOpenTracking: () => void;
  onDismiss: () => void;
};

export function OpenTrackingOpenToast({
  toEmail,
  subject,
  onOpenTracking,
  onDismiss,
}: OpenTrackingOpenToastProps) {
  return (
    <div className="open-tracking-open-toast" role="status">
      <div className="open-tracking-open-toast-copy">
        <strong>Your email was opened</strong>
        <p>
          {subject ? `"${subject}"` : "Your message"} to {toEmail} was opened.
        </p>
        <button type="button" className="open-tracking-open-toast-link" onClick={onOpenTracking}>
          View open tracking
        </button>
      </div>
      <button type="button" className="open-tracking-open-toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
