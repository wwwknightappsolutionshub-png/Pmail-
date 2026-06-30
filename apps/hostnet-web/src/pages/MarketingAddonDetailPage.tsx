import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { AddonMarketing } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

const HMAIL_LOGIN = import.meta.env.VITE_HMAIL_URL?.replace(/\/login\/?$/, "") || "https://mail.prohost.cloud";

export function MarketingAddonDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [addon, setAddon] = useState<AddonMarketing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .publicSite()
      .then((res) => {
        const match = res.addonMarketing.find(
          (entry) => entry.slug === slug && entry.isPublished && entry.isActive,
        );
        setAddon(match ?? null);
      })
      .catch((err: Error) => setError(err.message));
  }, [slug]);

  if (!addon && !error) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main"><p className="muted">Loading add-on…</p></main>
      </div>
    );
  }

  if (!addon) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main">
          <h1 className="landing-section-title">Add-on not found</h1>
          <Link to="/addons" className="btn btn-primary">All add-ons</Link>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main">
        <Link to="/addons" className="marketing-catalog-back">← All add-ons</Link>
        <p className="marketing-catalog-eyebrow">{addon.groupLabel}</p>
        <h1 className="landing-section-title">{addon.marketingTitle}</h1>
        {addon.marketingSubtitle ? <p className="marketing-catalog-lead">{addon.marketingSubtitle}</p> : null}
        <p className="muted">{addon.longDescription}</p>
        <section className="marketing-catalog-card">
          <h2>Capabilities</h2>
          <ul>
            {addon.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>
        <div className="marketing-catalog-actions">
          <a href={`${HMAIL_LOGIN}/login`} className="btn btn-primary">
            {addon.ctaLabel || "Start in PMail+"}
          </a>
          <Link to="/use-case" className="btn btn-secondary">
            See industry use cases
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
