import "./ContactSyncToast.css";

type ContactSyncToastProps = {
  addedCount: number;
  onViewContacts: () => void;
  onDismiss: () => void;
};

export function ContactSyncToast({ addedCount, onViewContacts, onDismiss }: ContactSyncToastProps) {
  return (
    <div className="contact-sync-toast-overlay" role="status" aria-live="polite">
      <div className="contact-sync-toast">
        <div className="contact-sync-toast-copy">
          <strong>QUICK UPDATE: New contacts are added to your contact list</strong>
          <p>
            {addedCount} new contact{addedCount === 1 ? "" : "s"} imported from your inbox.
          </p>
        </div>
        <div className="contact-sync-toast-actions">
          <button type="button" className="contact-sync-toast-primary" onClick={onViewContacts}>
            View now
          </button>
          <button type="button" className="contact-sync-toast-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
