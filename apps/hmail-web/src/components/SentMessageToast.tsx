import { useToastAutoDismiss } from "../hooks/useToastAutoDismiss";
import "./SentMessageToast.css";

type SentMessageToastProps = {
  onOpenTracking: () => void;
  onDismiss: () => void;
};

export function SentMessageToast({ onOpenTracking, onDismiss }: SentMessageToastProps) {
  useToastAutoDismiss(onDismiss, true, "info");
  return (
    <div className="sent-message-toast" role="status">
      <div className="sent-message-toast-copy">
        <strong>Message sent.</strong>
        <p>
          Concerned about if it&apos;s opened,{" "}
          <button type="button" className="sent-message-toast-link" onClick={onOpenTracking}>
            click here
          </button>
          .
        </p>
      </div>
      <button type="button" className="sent-message-toast-dismiss" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
