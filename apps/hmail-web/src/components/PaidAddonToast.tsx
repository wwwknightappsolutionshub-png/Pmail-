import type { PanelWorkspaceTrialStatus } from "../types/addon";
import "./PaidAddonToast.css";

type PaidAddonToastProps = {
  addonName?: string;
  panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null;
  onOpenMarketplace: () => void;
  onDismiss: () => void;
};

function toastTitle(panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null): string {
  if (panelWorkspaceTrial?.active) {
    return "Subscribe to keep this tool after your trial";
  }
  if (panelWorkspaceTrial?.startedAt) {
    return "Your Panel workspace trial has ended";
  }
  return "This tool requires a subscription";
}

function toastBody(addonName: string | undefined, panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null): string {
  const label = addonName ?? "This workspace tool";
  if (panelWorkspaceTrial?.active) {
    const days = panelWorkspaceTrial.daysLeft ?? 0;
    return `${label} is included in your complimentary Panel trial (${days} day${days === 1 ? "" : "s"} left). Subscribe from the Add-ons marketplace to keep access after your trial ends.`;
  }
  if (panelWorkspaceTrial?.startedAt) {
    return `${label} was included in your 7-day Panel workspace trial. Subscribe from the Add-ons marketplace to unlock it again.`;
  }
  return `${label} is available from the Add-ons marketplace. New accounts receive a complimentary 7-day Panel workspace trial automatically.`;
}

export function PaidAddonToast({
  addonName,
  panelWorkspaceTrial,
  onOpenMarketplace,
  onDismiss,
}: PaidAddonToastProps) {
  return (
    <div className="paid-addon-toast-overlay" role="dialog" aria-modal="true" aria-labelledby="paid-addon-toast-title">
      <div className="paid-addon-toast">
        <div className="paid-addon-toast-copy">
          <strong id="paid-addon-toast-title">{toastTitle(panelWorkspaceTrial)}</strong>
          <p>{toastBody(addonName, panelWorkspaceTrial)}</p>
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
