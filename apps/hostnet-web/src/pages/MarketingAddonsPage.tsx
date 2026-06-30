import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { AddonMarketing } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toFixed(2)}/mo` : "Included in trial";
}

export function MarketingAddonsPage() {
  const [addons, setAddons] = useState<AddonMarketing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicSite()
      .then((res) =>
        setAddons(
          res.addonMarketing
            .filter((entry) => entry.isPublished && entry.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        ),
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main">
        <p className="marketing-catalog-eyebrow">PMail+ add-ons</p>
        <h1 className="landing-section-title">Workspace tools and industry verticals</h1>
        <p className="muted marketing-catalog-lead">
          Extend PMail+ with platform workspace utilities, career tools, and industry-specific mail workflows.
        </p>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="marketing-catalog-grid">
          {addons.map((addon) => (
            <article key={addon.id} className="marketing-catalog-card">
              {addon.badge ? <span className="marketing-catalog-badge">{addon.badge}</span> : null}
              <p className="muted">{addon.groupLabel}</p>
              <h2>{addon.marketingTitle}</h2>
              <p className="muted">{addon.marketingSubtitle ?? addon.description}</p>
              <p className="marketing-catalog-price">{formatPrice(addon.displayPriceCents)}</p>
              <Link to={`/addons/${addon.slug}`} className="btn btn-primary">
                Learn more
              </Link>
            </article>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
