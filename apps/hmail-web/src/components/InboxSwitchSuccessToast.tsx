import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./PmailBrandToast.css";

type InboxSwitchSuccessToastProps = {
  accountLabel: string;
  accountEmail: string;
  onDismiss: () => void;
  autoDismissMs?: number;
};

export function InboxSwitchSuccessToast({
  accountLabel,
  accountEmail,
  onDismiss,
  autoDismissMs = 2000,
}: InboxSwitchSuccessToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return createPortal(
    <div className="pmail-brand-toast-shelf" role="status" aria-live="polite">
      <div className="pmail-brand-toast-card pmail-brand-toast-card--switch">
        <button
          type="button"
          className="pmail-brand-toast-close"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          ×
        </button>
        <strong>Congratulations</strong>
        <p>
          You have successfully switched to &quot;{accountLabel} / {accountEmail}&quot;
        </p>
      </div>
    </div>,
    document.body,
  );
}
