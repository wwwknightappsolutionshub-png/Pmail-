import type { AddonItem } from "../types/addon";
import { formatMarketplaceAddonPrice } from "../types/addon";
import "./AddonCard.css";

interface AddonCardProps {
  addon: AddonItem;
  starting?: boolean;
  onStartTrial: (slug: string) => void;
  onStartSubscription?: (slug: string, scope: "user" | "tenant") => void;
  pricingQuote?: string;
  preferredLicenseScope?: "user" | "tenant";
  browseMode?: boolean;
  suppressPrice?: boolean;
  /** When true, paid subscribe actions are hidden (e.g. pricing band owns checkout). */
  hideSubscribe?: boolean;
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
      return addon.isPaid ? "Paid add-on" : "Included";
  }
}

function priceLabel(addon: AddonItem): string {
  if (!addon.isPaid) return "Included";
  const userPrice = `$${(addon.priceCents / 100).toFixed(0)}/month`;
  if (addon.addonKind === "vertical") {
    return `${userPrice} user · $${(addon.tenantPriceCents / 100).toFixed(0)}/member tenant`;
  }
  return `${userPrice} per user`;
}

export function AddonCard({
  addon,
  starting,
  onStartTrial,
  onStartSubscription,
  pricingQuote,
  preferredLicenseScope,
  browseMode,
  suppressPrice,
  hideSubscribe,
}: AddonCardProps) {
  const isEntitled = addon.accessStatus === "trial" || addon.accessStatus === "active";
  const isComingSoon = addon.comingSoon;
  const scopedPrice = preferredLicenseScope ? formatMarketplaceAddonPrice(addon, preferredLicenseScope) : null;

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
        {!browseMode && !suppressPrice ? (
          <div className="addon-card-price">
            <strong>{scopedPrice ?? priceLabel(addon)}</strong>
            {pricingQuote && !preferredLicenseScope ? <span className="addon-card-quote">{pricingQuote}</span> : null}
          </div>
        ) : null}

        {browseMode ? (
          <span className="addon-card-pill addon-card-pill--muted">Included in bundle</span>
        ) : isComingSoon ? (
          <span className="addon-card-pill addon-card-pill--soon">Coming soon</span>
        ) : addon.accessStatus === "active" ? (
          <span className="addon-card-pill">Included</span>
        ) : addon.accessStatus === "trial" ? (
          <span className="addon-card-pill addon-card-pill--trial">On trial</span>
        ) : addon.isPaid && !hideSubscribe ? (
          <div className="addon-card-checkout-actions">
            {preferredLicenseScope ? (
              <button
                type="button"
                className="addon-card-cta"
                disabled={starting}
                onClick={() => onStartSubscription?.(addon.slug, preferredLicenseScope)}
              >
                {starting ? "Starting…" : preferredLicenseScope === "user" ? "Subscribe (individual)" : "Subscribe (tenant)"}
              </button>
            ) : addon.addonKind === "vertical" ? (
              <>
                <button
                  type="button"
                  className="addon-card-cta addon-card-cta--secondary"
                  disabled={starting}
                  onClick={() => onStartSubscription?.(addon.slug, "user")}
                >
                  {starting ? "Starting…" : "Subscribe (user)"}
                </button>
                <button
                  type="button"
                  className="addon-card-cta"
                  disabled={starting}
                  onClick={() => onStartSubscription?.(addon.slug, "tenant")}
                >
                  {starting ? "Starting…" : "Subscribe (tenant)"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="addon-card-cta"
                disabled={starting}
                onClick={() => onStartSubscription?.(addon.slug, "user")}
              >
                {starting ? "Starting…" : "Start subscription"}
              </button>
            )}
          </div>
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
