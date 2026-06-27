import "./InboxConnectResultToast.css";

type InboxConnectResultToastProps = {
  kind: "success" | "error";
  onDismiss: () => void;
};

export function InboxConnectResultToast({ kind, onDismiss }: InboxConnectResultToastProps) {
  const isSuccess = kind === "success";

  return (
    <div className="inbox-connect-result-overlay" role="status" aria-live="polite">
      <div className={`inbox-connect-result-card inbox-connect-result-card--${kind}`}>
        <strong>{isSuccess ? "Congratulations" : "Hooray"}</strong>
        <p>
          {isSuccess
            ? "You are now ready for the real magic of unified mailing !"
            : "That didn't connect"}
        </p>
        <button type="button" className="inbox-connect-result-dismiss" onClick={onDismiss}>
          OK
        </button>
      </div>
    </div>
  );
}
