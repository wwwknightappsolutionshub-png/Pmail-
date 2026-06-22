import { Link } from "react-router-dom";
import type { GrowthPlanSlug } from "../../types/growth";

type Props = {
  message: string;
  onUpgrade?: (plan: GrowthPlanSlug) => void;
  showSettingsLink?: boolean;
};

export function GrowthUpgradeBanner({ message, onUpgrade, showSettingsLink = true }: Props) {
  return (
    <div className="growth-upgrade-banner">
      <p>{message}</p>
      <div className="growth-action-row">
        {onUpgrade ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onUpgrade("pro")}>
            Upgrade to Pro
          </button>
        ) : null}
        {showSettingsLink ? (
          <Link to="/growth/settings" className="btn btn-secondary btn-sm">
            View plans
          </Link>
        ) : null}
      </div>
    </div>
  );
}
