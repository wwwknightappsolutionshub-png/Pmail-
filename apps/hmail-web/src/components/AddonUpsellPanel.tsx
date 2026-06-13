import { Link } from "react-router-dom";
import "./AddonUpsellPanel.css";

interface AddonUpsellPanelProps {
  addonName: string;
  addonSlug: string;
  description: string;
}

export function AddonUpsellPanel({ addonName, addonSlug, description }: AddonUpsellPanelProps) {
  return (
    <div className="addon-upsell">
      <div className="addon-upsell-inner">
        <p className="addon-upsell-kicker">Add-on required</p>
        <h2>{addonName}</h2>
        <p>{description}</p>
        <p className="addon-upsell-price">
          Start a <strong>free 7-day trial</strong> from the Add-ons marketplace.
        </p>
        <Link to={`/addons?highlight=${addonSlug}`} className="addon-upsell-cta">
          Open Add-ons marketplace
        </Link>
      </div>
    </div>
  );
}
