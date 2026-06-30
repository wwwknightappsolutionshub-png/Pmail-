import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { HostingPlan } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

function formatPrice(cents: number, period: string) {
  return `$${(cents / 100).toFixed(2)}/${period === "yearly" ? "yr" : "mo"}`;
}

export function HostingPlansPage() {
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicSite()
      .then((res) => setPlans(res.hostingPlans.filter((plan) => plan.isActive)))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main">
        <p className="marketing-catalog-eyebrow">Hosting plans</p>
        <h1 className="landing-section-title">Enterprise web hosting built for growth</h1>
        <p className="muted marketing-catalog-lead">
          SSD storage, branded mail mailboxes, databases, and panel access — provisioned on Prohost Cloud infrastructure.
        </p>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="marketing-catalog-grid">
          {plans.map((plan) => (
            <article key={plan.id} className="marketing-catalog-card">
              {plan.isFeatured ? <span className="marketing-catalog-badge">Featured</span> : null}
              <h2>{plan.name}</h2>
              {plan.tagline ? <p className="muted">{plan.tagline}</p> : null}
              <p className="marketing-catalog-price">{formatPrice(plan.priceCents, plan.billingPeriod)}</p>
              <ul>
                <li>{plan.diskGb} GB SSD storage</li>
                <li>{plan.websites} website{plan.websites === 1 ? "" : "s"}</li>
                <li>{plan.emailAccounts} mail accounts</li>
                <li>{plan.databases} database{plan.databases === 1 ? "" : "s"}</li>
              </ul>
              <Link to={`/hosting/${plan.slug}`} className="btn btn-primary">
                View plan
              </Link>
            </article>
          ))}
        </div>
        <p className="marketing-catalog-cta muted">
          Need a custom bundle? <a href="/#register">Request custom pricing</a>.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
