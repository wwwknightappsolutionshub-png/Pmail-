import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { HostingPlan } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

function formatPrice(cents: number, period: string) {
  return `$${(cents / 100).toFixed(2)}/${period === "yearly" ? "yr" : "mo"}`;
}

export function HostingPlanDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [plan, setPlan] = useState<HostingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .publicSite()
      .then((res) => {
        const match = res.hostingPlans.find((entry) => entry.slug === slug && entry.isActive);
        setPlan(match ?? null);
      })
      .catch((err: Error) => setError(err.message));
  }, [slug]);

  if (!plan && !error) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main"><p className="muted">Loading plan…</p></main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main">
          <h1 className="landing-section-title">Plan not found</h1>
          <Link to="/hosting" className="btn btn-primary">All hosting plans</Link>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main">
        <Link to="/hosting" className="marketing-catalog-back">← All hosting plans</Link>
        <h1 className="landing-section-title">{plan.name}</h1>
        {plan.tagline ? <p className="marketing-catalog-lead">{plan.tagline}</p> : null}
        <p className="marketing-catalog-price">{formatPrice(plan.priceCents, plan.billingPeriod)}</p>
        <div className="marketing-catalog-detail-grid">
          <section className="marketing-catalog-card">
            <h2>Resources</h2>
            <ul>
              <li>{plan.diskGb} GB SSD disk</li>
              <li>{plan.bandwidthGb} GB bandwidth</li>
              <li>{plan.websites} website{plan.websites === 1 ? "" : "s"}</li>
              <li>{plan.emailAccounts} email accounts</li>
              <li>{plan.databases} database{plan.databases === 1 ? "" : "s"}</li>
            </ul>
          </section>
          <section className="marketing-catalog-card">
            <h2>Included features</h2>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
        </div>
        <a href="/#register" className="btn btn-primary">Get custom pricing</a>
      </main>
      <MarketingFooter />
    </div>
  );
}
