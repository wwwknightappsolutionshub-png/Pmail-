import type { PanelWorkspaceTrialReminderKind } from "../hooks/usePanelWorkspaceTrialReminder";
import "./PaidAddonToast.css";

type PanelWorkspaceTrialReminderToastProps = {
  kind: PanelWorkspaceTrialReminderKind;
  hoursLeft: number;
  onOpenMarketplace: () => void;
  onDismiss: () => void;
};

function title(kind: PanelWorkspaceTrialReminderKind): string {
  return kind === "hours24"
    ? "Your Panel workspace trial ends soon"
    : "Your Panel workspace trial is ending";
}

function body(kind: PanelWorkspaceTrialReminderKind, hoursLeft: number): string {
  if (kind === "hours24") {
    return `You have about ${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left on your complimentary 7-day Panel workspace trial. Subscribe from the Add-ons marketplace to keep CRM, reminders, open tracking, and other workspace tools unlocked.`;
  }
  return `You have about ${hoursLeft} hours left on your complimentary 7-day Panel workspace trial. Subscribe now to keep your workspace tools after the trial ends.`;
}

export function PanelWorkspaceTrialReminderToast({
  kind,
  hoursLeft,
  onOpenMarketplace,
  onDismiss,
}: PanelWorkspaceTrialReminderToastProps) {
  return (
    <div className="paid-addon-toast-overlay" role="dialog" aria-modal="true" aria-labelledby="panel-trial-reminder-title">
      <div className="paid-addon-toast">
        <div className="paid-addon-toast-copy">
          <strong id="panel-trial-reminder-title">{title(kind)}</strong>
          <p>{body(kind, hoursLeft)}</p>
        </div>
        <div className="paid-addon-toast-actions">
          <button type="button" className="paid-addon-toast-primary" onClick={onOpenMarketplace}>
            Open Add-ons marketplace
          </button>
          <button type="button" className="paid-addon-toast-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
