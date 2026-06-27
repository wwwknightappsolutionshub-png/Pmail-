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
  autoDismissMs = 5000,
}: InboxSwitchSuccessToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return createPortal(
    <div className="pmail-brand-toast-overlay" role="status" aria-live="polite">
      <div className="pmail-brand-toast-card">
        <strong>Congratulations</strong>
        <p>
          You have successfully switched to &quot;{accountLabel} / {accountEmail}&quot;
        </p>
      </div>
    </div>,
    document.body,
  );
}
