import { createPortal } from "react-dom";
import { useToastAutoDismiss } from "../hooks/useToastAutoDismiss";
import "./PmailBrandToast.css";

type InboxSwitchSuccessToastProps = {
  accountLabel: string;
  accountEmail: string;
  onDismiss: () => void;
};

export function InboxSwitchSuccessToast({
  accountLabel,
  accountEmail,
  onDismiss,
}: InboxSwitchSuccessToastProps) {
  useToastAutoDismiss(onDismiss, true, "info");

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
