import type { AddonItem } from "../types/addon";
import "./AddonCard.css";

interface AddonCardProps {
  addon: AddonItem;
  starting?: boolean;
  onStartTrial: (slug: string) => void;
}

function statusLabel(addon: AddonItem): string {
  if (addon.comingSoon) return "Coming soon";
  switch (addon.accessStatus) {
    case "trial":
      return addon.trialDaysLeft === 1
        ? "Trial — 1 day left"
        : `Trial — ${addon.trialDaysLeft ?? 0} days left`;
    case "active":
      return "Active";
    case "expired":
      return "Trial ended";
    default:
      return "Free add-on";
  }
}

export function AddonCard({ addon, starting, onStartTrial }: AddonCardProps) {
  const isEntitled = addon.accessStatus === "trial" || addon.accessStatus === "active";
  const isComingSoon = addon.comingSoon;

  return (
    <article
      className={`addon-card ${isEntitled ? "addon-card--active" : ""} ${isComingSoon ? "addon-card--soon" : ""}`}
    >
      <header className="addon-card-head">
        <h3>{addon.name}</h3>
        <span
          className={`addon-card-status addon-card-status--${isComingSoon ? "soon" : addon.accessStatus}`}
        >
          {statusLabel(addon)}
        </span>
      </header>

      <p className="addon-card-desc">{addon.description}</p>

      <ul className="addon-card-features">
        {addon.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <footer className="addon-card-foot">
        <div className="addon-card-price">
          <strong>Free</strong>
        </div>

        {isComingSoon ? (
          <span className="addon-card-pill addon-card-pill--soon">Coming soon</span>
        ) : addon.accessStatus === "active" ? (
          <span className="addon-card-pill">Included</span>
        ) : addon.accessStatus === "trial" ? (
          <span className="addon-card-pill addon-card-pill--trial">On trial</span>
        ) : addon.canStartTrial ? (
          <button
            type="button"
            className="addon-card-cta"
            disabled={starting}
            onClick={() => onStartTrial(addon.slug)}
          >
            {starting ? "Starting…" : "Start free trial"}
          </button>
        ) : (
          <span className="addon-card-pill addon-card-pill--muted">Trial used</span>
        )}
      </footer>
    </article>
  );
}
