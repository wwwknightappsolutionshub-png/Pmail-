import { Link } from "react-router-dom";
import type { PanelWorkspaceTrialStatus } from "../types/addon";
import "./AddonUpsellPanel.css";

interface AddonUpsellPanelProps {
  addonName: string;
  addonSlug: string;
  description: string;
  panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null;
}

function upsellPriceLine(panelWorkspaceTrial?: PanelWorkspaceTrialStatus | null): string {
  if (panelWorkspaceTrial?.active) {
    const days = panelWorkspaceTrial.daysLeft ?? 0;
    return `Your complimentary Panel workspace trial is active (${days} day${days === 1 ? "" : "s"} left). Subscribe from the Add-ons marketplace to keep this tool after your trial ends.`;
  }
  if (panelWorkspaceTrial?.startedAt) {
    return "Your complimentary 7-day Panel workspace trial has ended. Subscribe from the Add-ons marketplace to keep using this tool.";
  }
  return "New accounts receive a complimentary 7-day Panel workspace trial automatically. Subscribe from the Add-ons marketplace to unlock this tool after your trial.";
}

export function AddonUpsellPanel({
  addonName,
  addonSlug,
  description,
  panelWorkspaceTrial,
}: AddonUpsellPanelProps) {
  return (
    <div className="addon-upsell">
      <div className="addon-upsell-inner">
        <p className="addon-upsell-kicker">Add-on required</p>
        <h2>{addonName}</h2>
        <p>{description}</p>
        <p className="addon-upsell-price">{upsellPriceLine(panelWorkspaceTrial)}</p>
        <Link to={`/addons?highlight=${addonSlug}`} className="addon-upsell-cta">
          Open Add-ons marketplace
        </Link>
      </div>
    </div>
  );
}
