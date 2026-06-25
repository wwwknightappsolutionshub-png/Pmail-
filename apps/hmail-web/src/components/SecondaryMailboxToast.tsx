import "./SecondaryMailboxToast.css";

export type SecondaryMailboxNotice = {
  accountId: string;
  accountEmail: string;
  accountLabel: string | null;
  newCount: number;
};

type SecondaryMailboxToastProps = {
  notice: SecondaryMailboxNotice;
  onSwitch: () => void;
  onDismiss: () => void;
};

export function SecondaryMailboxToast({ notice, onSwitch, onDismiss }: SecondaryMailboxToastProps) {
  const mailbox = notice.accountLabel?.trim() || notice.accountEmail;
  const countLabel =
    notice.newCount === 1 ? "1 new message" : `${notice.newCount} new messages`;

  return (
    <div className="secondary-mailbox-toast-overlay" role="status" aria-live="polite">
      <div className="secondary-mailbox-toast">
        <div className="secondary-mailbox-toast-copy">
          <strong>New mail in {mailbox}</strong>
          <p>
            {countLabel} arrived in your connected mailbox. Switch now to read it.
          </p>
        </div>
        <div className="secondary-mailbox-toast-actions">
          <button type="button" className="secondary-mailbox-toast-primary" onClick={onSwitch}>
            Switch mailbox
          </button>
          <button type="button" className="secondary-mailbox-toast-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
