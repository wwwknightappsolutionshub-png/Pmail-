import "./MultiInboxConnectToast.css";

type MultiInboxConnectToastProps = {
  onConnectMailbox: () => void;
  onDismiss: () => void;
  onDontAskAgain: () => void;
};

export function MultiInboxConnectToast({ onConnectMailbox, onDismiss, onDontAskAgain }: MultiInboxConnectToastProps) {
  return (
    <div className="multi-inbox-toast-overlay" role="dialog" aria-modal="true" aria-labelledby="multi-inbox-toast-title">
      <div className="multi-inbox-toast">
        <div className="multi-inbox-toast-copy">
          <strong id="multi-inbox-toast-title">Centralize Your Flow</strong>
          <p className="multi-inbox-toast-subtitle">
            Bring in your other mailboxes into your workspace, work smart — save time
          </p>
        </div>
        <div className="multi-inbox-toast-actions">
          <button type="button" className="multi-inbox-toast-primary" onClick={onConnectMailbox}>
            Sign in other mailboxes
          </button>
          <button type="button" className="multi-inbox-toast-btn" onClick={onDismiss}>
            Not now
          </button>
          <button type="button" className="multi-inbox-toast-btn multi-inbox-toast-btn--subtle" onClick={onDontAskAgain}>
            Don&apos;t ask again
          </button>
        </div>
      </div>
    </div>
  );
}
