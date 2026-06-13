import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { CheckoutModal, type CheckoutProduct } from "../components/CheckoutModal";
import { HeroStatsPanel } from "../components/HeroStatsPanel";
import type { AddonMarketing, PublicSitePayload, SiteSection } from "../types/site";
import "./LandingPage.css";

const HMAIL_URL = import.meta.env.VITE_HMAIL_URL ?? "http://localhost:5173/login/demo";

function sectionByKey(sections: SiteSection[], key: string): SiteSection | undefined {
  return sections.find((s) => s.sectionKey === key);
}

const TICKER_ITEMS = [
  "NVMe storage",
  "Free SSL",
  "99.9% uptime",
  "One-click backups",
  "MySQL & MariaDB",
  "PHP 8.4",
  "Node.js ready",
  "Panel API",
];

export function LandingPage() {
  const [data, setData] = useState<PublicSitePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);

  useEffect(() => {
    api.publicSite().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  const hero = useMemo(() => (data ? sectionByKey(data.sections, "hero") : undefined), [data]);
  const hostingIntro = useMemo(() => (data ? sectionByKey(data.sections, "hosting_intro") : undefined), [data]);
  const features = useMemo(() => (data ? sectionByKey(data.sections, "features") : undefined), [data]);
  const hmailSection = useMemo(() => (data ? sectionByKey(data.sections, "hmail_addons") : undefined), [data]);
  const ctaFooter = useMemo(() => (data ? sectionByKey(data.sections, "cta_footer") : undefined), [data]);

  const addonTickets = useMemo(() => data?.addonMarketing ?? [], [data]);

  if (error) {
    return (
      <div className="container" style={{ padding: "3rem 0" }}>
        <div className="error-banner">Could not load site content: {error}</div>
      </div>
    );
  }

  if (!data) {
    return <div className="loading-state container">Loading HostNet…</div>;
  }

  const tickerDoubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-brand">
          Host<span>Net</span>
        </div>
        <button
          type="button"
          className="landing-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <nav className={`landing-nav${menuOpen ? " landing-nav--open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>
            Plans
          </a>
          <a href="#hmail-addons" onClick={() => setMenuOpen(false)}>
            hmail
          </a>
          <div className="landing-nav-actions">
            <Link to="/panel/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
              Panel login
            </Link>
            <a href="#plans" className="btn btn-primary" onClick={() => setMenuOpen(false)}>
              Get hosting
            </a>
          </div>
        </nav>
      </header>

      <section className="hero-split">
        <div className="hero-left">
          <p className="hero-kicker">Multi-purpose hosting panel</p>
          <h1>
            {hero?.title ?? "Your sites."} <em>One panel.</em>
          </h1>
          <p className="hero-body">{hero?.body ?? hero?.subtitle}</p>
          <div className="hero-cta-row">
            <a href={hero?.ctaUrl ?? "#plans"} className="btn btn-primary">
              {hero?.ctaLabel ?? "Explore plans"}
            </a>
            <Link to="/panel/login" className="btn btn-secondary">
              Sign in to panel
            </Link>
          </div>
          <div className="hero-stats">
            {(hero?.bulletPoints ?? ["NVMe storage", "Free SSL", "Real-time metrics"]).map((item) => (
              <div key={item} className="hero-stat">
                <strong>✓</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-right">
          <HeroStatsPanel preview={data.panelPreview} />
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {tickerDoubled.map((item, i) => (
            <span key={`${item}-${i}`}>
              {item} <span>◆</span>
            </span>
          ))}
        </div>
      </div>

      <section id="features" className="section-pad container">
        <div className="section-head">
          <h2>{features?.title ?? "Built for builders"}</h2>
          <p>{features?.body ?? features?.subtitle}</p>
        </div>
        <div className="bento">
          <article className="bento-item bento-a">
            <div className="bento-num">01</div>
            <h3>cPanel-style dashboard</h3>
            <p>Files, databases, domains, and email — one login, zero clutter.</p>
          </article>
          <article className="bento-item bento-b">
            <div className="bento-num">02</div>
            <h3>Live usage metrics</h3>
            <p>Disk and bandwidth meters update as your sites grow.</p>
          </article>
          {(features?.bulletPoints ?? []).map((item, idx) => (
            <article key={item} className={`bento-item bento-${["c", "d", "e"][idx] ?? "c"}`}>
              <h3>{item}</h3>
              <p>Included on every HostNet hosting account.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="plans" className="section-pad container">
        <div className="section-head">
          <h2>{hostingIntro?.title ?? "Hosting plans"}</h2>
          <p>{hostingIntro?.subtitle}</p>
        </div>
        <div className="pricing-stage">
          {data.hostingPlans.map((plan) => (
            <article key={plan.id} className="plan-tilt">
              {plan.isFeatured && <span className="badge">Popular</span>}
              <h3 className="plan-name">{plan.name}</h3>
              <p className="muted">{plan.tagline}</p>
              <div className="plan-price">
                {formatPrice(plan.priceCents, plan.billingPeriod)}
                <small> / {plan.billingPeriod === "yearly" ? "year" : "month"}</small>
              </div>
              <div className="plan-specs">
                <span>{plan.diskGb} GB SSD</span>
                <span>{plan.websites} site{plan.websites === 1 ? "" : "s"}</span>
                <span>{plan.emailAccounts} mail</span>
              </div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setCheckoutProduct({
                    productType: "hosting_plan",
                    productSlug: plan.slug,
                    productName: plan.name,
                    amountCents: plan.priceCents,
                  })
                }
              >
                Get {plan.name}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="hmail-addons" className="hmail-advert container">
        <div className="hmail-advert-head">
          <div>
            <span className="badge badge-warm">Partner product</span>
            <h2>{hmailSection?.title ?? "hmail add-ons"}</h2>
            <p>{hmailSection?.body ?? hmailSection?.subtitle}</p>
          </div>
          <a href={HMAIL_URL} className="btn btn-secondary">
            Open hmail webmail →
          </a>
        </div>
        <div className="hmail-scroll">
          {addonTickets.map((addon) => (
            <AddonTicket key={addon.id} addon={addon} onSubscribe={setCheckoutProduct} />
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>{ctaFooter?.title}</h2>
          <p className="muted" style={{ margin: "0.5rem 0 0" }}>
            {ctaFooter?.subtitle}
          </p>
        </div>
        <div className="hero-cta-row">
          <Link to={ctaFooter?.ctaUrl?.startsWith("/") ? ctaFooter.ctaUrl : "/panel/login"} className="btn btn-primary">
            {ctaFooter?.ctaLabel ?? "Open panel"}
          </Link>
          <a href="#plans" className="btn btn-ghost">
            Compare plans
          </a>
        </div>
      </section>

      <footer className="landing-foot">
        <span>HostNet Panel — web hosting & control panel</span>
        <span>
          <Link to="/admin/login">Admin</Link> · <Link to="/panel/login">Panel</Link>
        </span>
      </footer>

      <CheckoutModal product={checkoutProduct} onClose={() => setCheckoutProduct(null)} />
    </div>
  );
}

function AddonTicket({
  addon,
  onSubscribe,
}: {
  addon: AddonMarketing;
  onSubscribe: (product: CheckoutProduct) => void;
}) {
  const isSoon = addon.badge === "Coming soon";
  const isFree = addon.displayPriceCents === 0;
  return (
    <article className="addon-ticket">
      {addon.badge && <span className={isSoon ? "badge badge-soon" : "badge badge-warm"}>{addon.badge}</span>}
      <h3>{addon.marketingTitle}</h3>
      <p>{addon.longDescription}</p>
      <div className="addon-ticket-foot">
        <span className="muted">{formatPrice(addon.displayPriceCents)}</span>
        {isSoon || isFree ? (
          <a href={import.meta.env.VITE_HMAIL_URL ?? "http://localhost:5173/login/demo"} className="btn btn-ghost">
            {addon.ctaLabel}
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              onSubscribe({
                productType: "addon",
                productSlug: addon.slug,
                productName: addon.marketingTitle,
                amountCents: addon.displayPriceCents,
              })
            }
          >
            Subscribe
          </button>
        )}
      </div>
    </article>
  );
}
