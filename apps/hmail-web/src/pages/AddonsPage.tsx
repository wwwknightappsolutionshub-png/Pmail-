import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AddonCard } from "../components/AddonCard";
import { HMailLogo } from "../components/HMailLogo";
import { useAddons } from "../context/AddonContext";
import { useAuth } from "../context/AuthContext";
import {
  formatMarketplaceBundlePrice,
  isPlatformWorkspaceAddon,
  isVerticalWorkspaceAddon,
  JOB_HUNTER_STANDALONE_USER_PRICE_CENTS,
  MARKETPLACE_PLATFORM_BUNDLE_SLUGS,
  MARKETPLACE_VERTICAL_LABELS,
  MARKETPLACE_VERTICAL_ORDER,
  type MarketplaceBrowseVertical,
  type MarketplaceLicenseScope,
  type WorkspaceVertical,
} from "../types/addon";
import { MARKETPLACE_VERTICAL_ICONS, WORKSPACE_VERTICAL_ICONS } from "../data/workspaceVerticalIcons";
import "./AddonsPage.css";

type MarketplaceStep = 1 | 2 | 3 | 4;

const PLATFORM_BUNDLE_TOOL_COUNT = MARKETPLACE_PLATFORM_BUNDLE_SLUGS.length;

const PLATFORM_ADDON_SLUG_ORDER = [
  ...MARKETPLACE_PLATFORM_BUNDLE_SLUGS,
  "whatsapp-functionality",
  "mail2pdf-functionality",
  "full-calendar-functionality",
  "scheduled-send",
  "auto-reply-functionality",
  "bespoke-workspace",
] as const;

const PLATFORM_BUNDLE_FEATURE_COPY =
  "Open & link tracking, file vault, multiple inboxes, inbox cleanup, attachment auto-categorize, e-sign from email, and Job Hunter career workspace — plus the included Bespoke Workspace shell.";

const VERTICAL_COPY: Record<MarketplaceBrowseVertical, string> = {
  legal: "Matter, compliance, client portal, and IRCC-focused tools for regulated practices.",
  accounting: "Document intake, filing calendar, secure exchange, and entity-ledger tools.",
  "real-estate": "Listing, showing, quick reply, and deal-room tools for property teams.",
  recruitment: "Role pipeline, interview desk, outreach, and talent search tools.",
  "b2b-services": "Client workspace, project tracker, proposal desk, and SLA monitoring tools.",
  healthcare: "Patient registry, appointment, referral, and access-audit tools.",
};

function resolveInitialWorkspace(businessVertical: WorkspaceVertical): MarketplaceBrowseVertical | null {
  if (businessVertical === "free-basic" || businessVertical === "platform" || businessVertical === "standard") {
    return null;
  }
  return businessVertical;
}

function sortPlatformAddons<T extends { slug: string; sortOrder: number }>(addons: T[]): T[] {
  const order = new Map(PLATFORM_ADDON_SLUG_ORDER.map((slug, index) => [slug, index]));
  return [...addons].sort((a, b) => {
    const aOrder = order.get(a.slug as (typeof PLATFORM_ADDON_SLUG_ORDER)[number]) ?? 999;
    const bOrder = order.get(b.slug as (typeof PLATFORM_ADDON_SLUG_ORDER)[number]) ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.sortOrder - b.sortOrder;
  });
}

function sortVerticalAddons<T extends { sortOrder: number }>(addons: T[]): T[] {
  return [...addons].sort((a, b) => a.sortOrder - b.sortOrder);
}

function formatTotal(cents: number): string {
  return `$${(cents / 100).toFixed(2)}/month`;
}

function hasMarketplaceCartSelection(input: {
  includePlatformBundle: boolean;
  includeVerticalBundle: boolean;
  includeJobHunterStandalone: boolean;
}): boolean {
  return (
    input.includePlatformBundle ||
    input.includeVerticalBundle ||
    (input.includeJobHunterStandalone && !input.includePlatformBundle)
  );
}

export function AddonsPage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const { addons, loading, error, quoteMarketplace, startMarketplaceCheckout, startTrial, refresh } =
    useAddons();
  const [checkoutError, setCheckoutError] = useState("");
  const [paying, setPaying] = useState(false);
  const [trialStarting, setTrialStarting] = useState<string | null>(null);
  const [activatingStandard, setActivatingStandard] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const subscribed = searchParams.get("subscribed");
  const cancelled = searchParams.get("cancelled");
  const educationOptOut = searchParams.get("education-opt-out");
  const [educationNotice, setEducationNotice] = useState<string | null>(null);

  useEffect(() => {
    if (educationOptOut !== "1") return;
    void api
      .updateEducationPreferences({ optOut: true })
      .then(() => {
        setEducationNotice("You have been unsubscribed from PMail+ education emails.");
        const next = new URLSearchParams(searchParams);
        next.delete("education-opt-out");
        setSearchParams(next, { replace: true });
      })
      .catch((err) => {
        setEducationNotice(err instanceof ApiError ? err.message : "Unable to update email preferences");
      });
  }, [educationOptOut, searchParams, setSearchParams]);

  const businessVertical = (user?.businessVertical ?? "free-basic") as WorkspaceVertical;
  const initialWorkspace = resolveInitialWorkspace(businessVertical);

  const [selectedWorkspace, setSelectedWorkspace] = useState<MarketplaceBrowseVertical | null>(initialWorkspace);
  const [licenseScope, setLicenseScope] = useState<MarketplaceLicenseScope | null>(null);
  const [marketplaceStep, setMarketplaceStep] = useState<MarketplaceStep>(initialWorkspace ? 2 : 1);
  const [includePlatformBundle, setIncludePlatformBundle] = useState(true);
  const [includeVerticalBundle, setIncludeVerticalBundle] = useState(true);
  const [includeJobHunterStandalone, setIncludeJobHunterStandalone] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkoutQuote, setCheckoutQuote] = useState<Awaited<ReturnType<typeof quoteMarketplace>> | null>(null);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(`addon-${highlight}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (marketplaceStep < 3) {
      setMarketplaceStep(3);
    }
  }, [highlight, addons.length, marketplaceStep]);

  useEffect(() => {
    if (subscribed) {
      void refresh();
    }
  }, [subscribed, refresh]);

  useEffect(() => {
    if (marketplaceStep !== 4 || !selectedWorkspace || !licenseScope) {
      setCheckoutQuote(null);
      return;
    }
    if (!hasMarketplaceCartSelection({ includePlatformBundle, includeVerticalBundle, includeJobHunterStandalone })) {
      setCheckoutQuote(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    void (async () => {
      try {
        const quote = await quoteMarketplace({
          vertical: selectedWorkspace,
          scope: licenseScope,
          includePlatformBundle,
          includeVerticalBundle,
          includeJobHunterStandalone,
        });
        if (!cancelled) setCheckoutQuote(quote);
      } catch (err) {
        if (!cancelled) {
          setCheckoutError(err instanceof ApiError ? err.message : "Could not load pricing quote");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    marketplaceStep,
    selectedWorkspace,
    licenseScope,
    includePlatformBundle,
    includeVerticalBundle,
    includeJobHunterStandalone,
    quoteMarketplace,
  ]);

  useEffect(() => {
    if (includePlatformBundle && includeJobHunterStandalone) {
      setIncludeJobHunterStandalone(false);
    }
  }, [includePlatformBundle, includeJobHunterStandalone]);

  const platformAddons = useMemo(
    () => sortPlatformAddons(addons.filter((addon) => isPlatformWorkspaceAddon(addon))),
    [addons],
  );

  const verticalAddons = useMemo(() => {
    if (!selectedWorkspace) return [];
    return sortVerticalAddons(addons.filter((addon) => isVerticalWorkspaceAddon(addon, selectedWorkspace)));
  }, [addons, selectedWorkspace]);

  const jobHunterAddon = useMemo(
    () => addons.find((addon) => addon.slug === "job-hunter-functionality") ?? null,
    [addons],
  );

  const onStartJobHunterTrial = async (slug: string) => {
    setCheckoutError("");
    setTrialStarting(slug);
    try {
      await startTrial(slug);
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : "Could not start trial");
    } finally {
      setTrialStarting(null);
    }
  };

  const jobHunterInCart = includeJobHunterStandalone && !includePlatformBundle;
  const jobHunterStandaloneSubscribed = Boolean(jobHunterAddon?.hasDirectSubscription);

  const toggleJobHunterCart = () => {
    if (jobHunterStandaloneSubscribed || jobHunterAddon?.comingSoon) return;
    setIncludeJobHunterStandalone((current) => !current);
    setCheckoutError("");
  };

  const activeCount = useMemo(() => {
    const relevant = [...platformAddons, ...verticalAddons];
    return relevant.filter((addon) => addon.accessStatus === "active" || addon.accessStatus === "trial").length;
  }, [platformAddons, verticalAddons]);

  const chooseWorkspace = (vertical: MarketplaceBrowseVertical) => {
    setSelectedWorkspace(vertical);
    setLicenseScope(null);
    setMarketplaceStep(2);
  };

  const chooseStandardWorkspace = async () => {
    setCheckoutError("");
    setActivatingStandard(true);
    try {
      const result = await api.selectBusinessVertical("standard");
      setUser(result.user);
      navigate("/");
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : "Could not activate Standard workspace");
    } finally {
      setActivatingStandard(false);
    }
  };

  const chooseLicense = (scope: MarketplaceLicenseScope) => {
    setLicenseScope(scope);
    setMarketplaceStep(3);
  };

  const onPay = async () => {
    if (!selectedWorkspace || !licenseScope) return;
    if (!hasMarketplaceCartSelection({ includePlatformBundle, includeVerticalBundle, includeJobHunterStandalone })) {
      setCheckoutError("Select at least one add-on or bundle to continue.");
      return;
    }

    setCheckoutError("");
    setPaying(true);
    try {
      await startMarketplaceCheckout({
        vertical: selectedWorkspace,
        scope: licenseScope,
        includePlatformBundle,
        includeVerticalBundle,
        includeJobHunterStandalone,
        seats: checkoutQuote?.seats,
      });
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : "Could not start checkout");
    } finally {
      setPaying(false);
    }
  };

  const branding = user?.tenant.branding;
  const workspaceLabel =
    user?.businessVertical === "standard"
      ? "Standard"
      : selectedWorkspace
        ? MARKETPLACE_VERTICAL_LABELS[selectedWorkspace]
        : "Choose a workspace";
  const licenseLabel =
    licenseScope === "user" ? "Individual license" : licenseScope === "tenant" ? "Tenant license" : "Choose license";

  return (
    <div
      className="addons-page"
      style={
        branding
          ? ({
              "--brand-primary": branding.primaryColor,
              "--brand-accent": branding.accentColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      <header className="addons-topbar">
        <div className="addons-topbar-start">
          <Link to="/" className="addons-back-link">
            ← Back to mail
          </Link>
          <HMailLogo size="sm" showWordmark subtitle={user?.tenant.name} />
        </div>
        <div className="addons-topbar-end">
          <span className="addons-user">{user?.email}</span>
          <button type="button" className="addons-signout" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="addons-main">
        <section className="addons-hero">
          <div className="addons-hero-copy">
            <p className="addons-kicker">Addon Marketplace</p>
            <h1>Build your workspace with bundled add-ons</h1>
            <p>
              Choose your business vertical and license type, browse the platform and vertical tool bundles, then
              confirm your final selection and complete payment.
            </p>
          </div>
          <aside className="addons-workspace-card" aria-label="Marketplace selection summary">
            <span className="addons-workspace-label">Your selection</span>
            <strong>{workspaceLabel}</strong>
            <p>{licenseLabel}</p>
            {marketplaceStep >= 3 ? (
              <p className="addons-workspace-meta">
                {activeCount} active tools across platform and vertical bundles.
                {jobHunterInCart ? " Job Hunter added to cart." : ""}
              </p>
            ) : null}
            <button type="button" className="addons-refresh" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh status"}
            </button>
          </aside>
        </section>

        <nav className="addons-stepper addons-stepper--four" aria-label="Marketplace steps">
          <button
            type="button"
            className={`addons-step ${marketplaceStep === 1 ? "addons-step--active" : ""} ${selectedWorkspace ? "addons-step--done" : ""}`}
            onClick={() => setMarketplaceStep(1)}
          >
            <span className="addons-step-index">1</span>
            <span className="addons-step-copy">
              <strong>Workspace</strong>
              <small>Standard or industry</small>
            </span>
          </button>
          <button
            type="button"
            className={`addons-step ${marketplaceStep === 2 ? "addons-step--active" : ""} ${licenseScope ? "addons-step--done" : ""}`}
            disabled={!selectedWorkspace}
            onClick={() => selectedWorkspace && setMarketplaceStep(2)}
          >
            <span className="addons-step-index">2</span>
            <span className="addons-step-copy">
              <strong>License</strong>
              <small>Individual or tenant</small>
            </span>
          </button>
          <button
            type="button"
            className={`addons-step ${marketplaceStep === 3 ? "addons-step--active" : ""}`}
            disabled={!selectedWorkspace || !licenseScope}
            onClick={() => selectedWorkspace && licenseScope && setMarketplaceStep(3)}
          >
            <span className="addons-step-index">3</span>
            <span className="addons-step-copy">
              <strong>Browse</strong>
              <small>Platform and vertical tools</small>
            </span>
          </button>
          <button
            type="button"
            className={`addons-step ${marketplaceStep === 4 ? "addons-step--active" : ""}`}
            disabled={!selectedWorkspace || !licenseScope}
            onClick={() => selectedWorkspace && licenseScope && setMarketplaceStep(4)}
          >
            <span className="addons-step-index">4</span>
            <span className="addons-step-copy">
              <strong>Payment</strong>
              <small>Final selection</small>
            </span>
          </button>
        </nav>

        {(error || checkoutError) ? (
          <div className="addons-error" role="alert">
            {checkoutError || error}
          </div>
        ) : null}

        {educationNotice ? (
          <div className="addons-success" role="status">
            {educationNotice}
          </div>
        ) : null}

        {subscribed ? (
          <div className="addons-success" role="status">
            {subscribed === "marketplace" ? (
              <>Marketplace checkout completed. Refresh if entitlements are not updated yet.</>
            ) : (
              <>
                Subscription checkout completed for <strong>{subscribed}</strong>. Refresh if entitlements are not
                updated yet.
              </>
            )}
          </div>
        ) : null}

        {cancelled ? (
          <div className="addons-error" role="status">
            Checkout cancelled{cancelled === "marketplace" ? "" : <> for <strong>{cancelled}</strong></>}.
          </div>
        ) : null}

        {loading && addons.length === 0 ? (
          <p className="addons-loading">Loading add-ons…</p>
        ) : marketplaceStep === 1 ? (
          <section className="addons-panel">
            <header className="addons-panel-head">
              <h2>Choose your preferred workspace</h2>
              <p>
                Pick Standard to explore regular mail in a unique workspace, or select an industry workspace to
                continue through license, browse, and payment.
              </p>
            </header>

            <button
              type="button"
              className={`addons-standard-card ${user?.businessVertical === "standard" ? "addons-standard-card--selected" : ""}`}
              onClick={() => void chooseStandardWorkspace()}
              disabled={activatingStandard}
            >
              <span className="addons-workspace-icon" aria-hidden="true">
                {WORKSPACE_VERTICAL_ICONS.standard}
              </span>
              <strong>Standard</strong>
              <p>
                Explore regular mailing in a unique workspace. All platform tools are available in your environment,
                upgrade at anytime to use them.
              </p>
              <span className="addons-standard-note">
                {activatingStandard ? "Opening mailbox…" : "Instant access — no license, browse, or payment steps"}
              </span>
            </button>

            <div className="addons-panel-divider">
              <span>Or choose a paid industry workspace</span>
            </div>

            <div className="addons-vertical-grid">
              {MARKETPLACE_VERTICAL_ORDER.map((vertical) => (
                <button
                  key={vertical}
                  type="button"
                  className={`addons-vertical-card ${selectedWorkspace === vertical ? "addons-vertical-card--selected" : ""}`}
                  onClick={() => chooseWorkspace(vertical)}
                >
                  <span className="addons-workspace-icon" aria-hidden="true">
                    {MARKETPLACE_VERTICAL_ICONS[vertical]}
                  </span>
                  <strong>{MARKETPLACE_VERTICAL_LABELS[vertical]}</strong>
                  <p>{VERTICAL_COPY[vertical]}</p>
                </button>
              ))}
            </div>
          </section>
        ) : marketplaceStep === 2 && selectedWorkspace ? (
          <section className="addons-panel">
            <header className="addons-panel-head">
              <h2>Choose your license type</h2>
              <p>Bundled pricing applies to the full platform and vertical workspace tool sets.</p>
            </header>
            <div className="addons-license-grid">
              <button
                type="button"
                className={`addons-license-card ${licenseScope === "user" ? "addons-license-card--selected" : ""}`}
                onClick={() => chooseLicense("user")}
              >
                <span className="addons-license-kicker">Individual license</span>
                <strong>Per user</strong>
                <p>Best for solo operators subscribing on their own account.</p>
                <ul>
                  <li>
                    Platform bundle ({PLATFORM_BUNDLE_TOOL_COUNT} tools):{" "}
                    {formatMarketplaceBundlePrice("user", "platform")}
                  </li>
                  <li>Vertical bundle (4 tools): {formatMarketplaceBundlePrice("user", "vertical")}</li>
                </ul>
              </button>
              <button
                type="button"
                className={`addons-license-card ${licenseScope === "tenant" ? "addons-license-card--selected" : ""}`}
                onClick={() => chooseLicense("tenant")}
              >
                <span className="addons-license-kicker">Tenant license</span>
                <strong>Per seat</strong>
                <p>Best for firms rolling out bundles across a team with centralized billing.</p>
                <ul>
                  <li>Platform bundle ({PLATFORM_BUNDLE_TOOL_COUNT} tools): Free</li>
                  <li>Vertical bundle (4 tools): {formatMarketplaceBundlePrice("tenant", "vertical")}</li>
                </ul>
              </button>
            </div>
            <div className="addons-panel-actions">
              <button type="button" className="addons-panel-back" onClick={() => setMarketplaceStep(1)}>
                ← Change workspace
              </button>
            </div>
          </section>
        ) : marketplaceStep === 3 && selectedWorkspace && licenseScope ? (
          <>
            {jobHunterAddon ? (
              <section className="addons-category addons-category--standalone">
                <header className="addons-category-head">
                  <div>
                    <p className="addons-category-kicker">Career workspace — standalone add-on</p>
                    <h2>Job Hunter</h2>
                    <p>
                      Subscribe to Job Hunter alone, or get it with the Platform workspace bundle below. Start a
                      30-day Marketplace trial, or unlock Career in mail to begin your complimentary career trial
                      automatically.
                    </p>
                  </div>
                  <aside className="addons-pricing-band" aria-label="Job Hunter pricing">
                    <span>Standalone pricing ({licenseScope === "user" ? "individual" : "tenant"})</span>
                    <strong>
                      {licenseScope === "user"
                        ? `$${(JOB_HUNTER_STANDALONE_USER_PRICE_CENTS / 100).toFixed(2)}/mo per user`
                        : `$${(jobHunterAddon.tenantPriceCents / 100).toFixed(2)}/mo per seat`}
                    </strong>
                    <small>Auto-renews monthly · 30-day full-access trial · Tier B consent required</small>
                    {jobHunterStandaloneSubscribed ? (
                      <span className="addons-pricing-band-pill">Subscribed</span>
                    ) : jobHunterAddon.comingSoon ? (
                      <span className="addons-pricing-band-pill addons-pricing-band-pill--muted">Coming soon</span>
                    ) : (
                      <button
                        type="button"
                        className={`addons-pricing-band-cta ${jobHunterInCart ? "addons-pricing-band-cta--selected" : ""}`}
                        aria-pressed={jobHunterInCart}
                        onClick={toggleJobHunterCart}
                      >
                        {jobHunterInCart ? "Added to cart" : "Subscribe"}
                      </button>
                    )}
                  </aside>
                </header>
                <div className="addons-grid addons-grid--single">
                  <div
                    id={`addon-${jobHunterAddon.slug}`}
                    className={highlight === jobHunterAddon.slug ? "addons-highlight" : undefined}
                  >
                    <AddonCard
                      addon={jobHunterAddon}
                      starting={trialStarting === jobHunterAddon.slug}
                      onStartTrial={onStartJobHunterTrial}
                      preferredLicenseScope={licenseScope}
                      suppressPrice
                      hideSubscribe
                    />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="addons-category">
              <header className="addons-category-head">
                <div>
                  <p className="addons-category-kicker">Platform workspace tools</p>
                  <h2>All {PLATFORM_BUNDLE_TOOL_COUNT} platform tools in one bundle</h2>
                  <p>{PLATFORM_BUNDLE_FEATURE_COPY}</p>
                </div>
                <aside className="addons-pricing-band" aria-label="Platform bundle pricing">
                  <span>Bundle pricing ({licenseScope === "user" ? "individual" : "tenant"})</span>
                  <strong>{formatMarketplaceBundlePrice(licenseScope, "platform")}</strong>
                  <small>One price unlocks all {PLATFORM_BUNDLE_TOOL_COUNT} platform workspace tools.</small>
                </aside>
              </header>
              <div className="addons-grid">
                {platformAddons.map((addon) => (
                  <div
                    key={addon.slug}
                    id={`addon-${addon.slug}`}
                    className={highlight === addon.slug ? "addons-highlight" : undefined}
                  >
                    <AddonCard addon={addon} starting={false} onStartTrial={() => {}} browseMode />
                  </div>
                ))}
              </div>
            </section>

            <section className="addons-category">
              <header className="addons-category-head">
                <div>
                  <p className="addons-category-kicker">
                    {MARKETPLACE_VERTICAL_LABELS[selectedWorkspace]} vertical workspace tools
                  </p>
                  <h2>All 4 industry tools in one bundle</h2>
                  <p>{VERTICAL_COPY[selectedWorkspace]}</p>
                </div>
                <aside className="addons-pricing-band" aria-label="Vertical bundle pricing">
                  <span>Bundle pricing ({licenseScope === "user" ? "individual" : "tenant"})</span>
                  <strong>{formatMarketplaceBundlePrice(licenseScope, "vertical", checkoutQuote?.seats ?? 5)}</strong>
                  <small>One price unlocks all four {MARKETPLACE_VERTICAL_LABELS[selectedWorkspace]} tools.</small>
                </aside>
              </header>
              <div className="addons-grid">
                {verticalAddons.map((addon) => (
                  <div
                    key={addon.slug}
                    id={`addon-${addon.slug}`}
                    className={highlight === addon.slug ? "addons-highlight" : undefined}
                  >
                    <AddonCard addon={addon} starting={false} onStartTrial={() => {}} browseMode />
                  </div>
                ))}
              </div>
            </section>

            <div className="addons-panel-actions addons-panel-actions--browse">
              <button type="button" className="addons-panel-back" onClick={() => setMarketplaceStep(2)}>
                ← Change license type
              </button>
              <button type="button" className="addons-panel-continue" onClick={() => setMarketplaceStep(4)}>
                Continue to final selection →
              </button>
            </div>
          </>
        ) : marketplaceStep === 4 && selectedWorkspace && licenseScope ? (
          <section className="addons-panel addons-checkout-panel">
            <header className="addons-panel-head">
              <h2>Final selection and payment</h2>
              <p>
                Confirm which add-ons you want for {MARKETPLACE_VERTICAL_LABELS[selectedWorkspace]} under your{" "}
                {licenseScope === "user" ? "individual" : "tenant"} license. You can subscribe to Job Hunter alone or
                combine it with workspace bundles.
              </p>
            </header>

            <div className="addons-checkout-options">
              <label
                className={`addons-checkout-option ${jobHunterInCart ? "addons-checkout-option--selected" : ""} ${includePlatformBundle || jobHunterStandaloneSubscribed ? "addons-checkout-option--disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={jobHunterInCart}
                  disabled={includePlatformBundle || jobHunterStandaloneSubscribed}
                  onChange={() => toggleJobHunterCart()}
                />
                <div>
                  <strong>Job Hunter (standalone)</strong>
                  <p>Career workspace — CV Hub, scanner, apply assist, and mail-based career intelligence.</p>
                  <span>
                    {licenseScope === "user"
                      ? `$${(JOB_HUNTER_STANDALONE_USER_PRICE_CENTS / 100).toFixed(2)}/mo per user`
                      : `$${((jobHunterAddon?.tenantPriceCents ?? JOB_HUNTER_STANDALONE_USER_PRICE_CENTS) / 100).toFixed(2)}/mo per seat`}
                  </span>
                  {includePlatformBundle ? (
                    <small className="addons-checkout-option-note">Included when the platform bundle is selected.</small>
                  ) : null}
                  {jobHunterStandaloneSubscribed ? (
                    <small className="addons-checkout-option-note">Already subscribed on your account.</small>
                  ) : null}
                </div>
              </label>

              <label className={`addons-checkout-option ${includePlatformBundle ? "addons-checkout-option--selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={includePlatformBundle}
                  onChange={(event) => setIncludePlatformBundle(event.target.checked)}
                />
                <div>
                  <strong>Platform workspace bundle</strong>
                  <p>{PLATFORM_BUNDLE_FEATURE_COPY.replace(/ — plus.*/, "")}</p>
                  <span>{formatMarketplaceBundlePrice(licenseScope, "platform")}</span>
                </div>
              </label>

              <label className={`addons-checkout-option ${includeVerticalBundle ? "addons-checkout-option--selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={includeVerticalBundle}
                  onChange={(event) => setIncludeVerticalBundle(event.target.checked)}
                />
                <div>
                  <strong>{MARKETPLACE_VERTICAL_LABELS[selectedWorkspace]} vertical bundle</strong>
                  <p>All four industry workspace tools for this vertical</p>
                  <span>{formatMarketplaceBundlePrice(licenseScope, "vertical", checkoutQuote?.seats ?? 5)}</span>
                </div>
              </label>
            </div>

            <aside className="addons-checkout-summary" aria-label="Payment summary">
              {quoteLoading ? (
                <p className="addons-loading">Calculating total…</p>
              ) : checkoutQuote ? (
                <>
                  <span>Monthly total</span>
                  <strong>{formatTotal(checkoutQuote.amountCents)}</strong>
                  <ul>
                    {checkoutQuote.lines.map((line) => (
                      <li key={line.bundle}>
                        {line.label}
                        {line.isFree ? " — Free" : ` — ${formatTotal(line.amountCents)}`}
                      </li>
                    ))}
                  </ul>
                  {licenseScope === "tenant" && checkoutQuote.lines.some((line) => line.bundle === "vertical") ? (
                    <small>
                      Tenant vertical billing uses {checkoutQuote.seats} seats (minimum{" "}
                      {checkoutQuote.minTenantSeats}).
                    </small>
                  ) : null}
                </>
              ) : (
                <p className="addons-empty">Select at least one add-on or bundle to see your total.</p>
              )}
            </aside>

            <div className="addons-panel-actions addons-panel-actions--checkout">
              <button type="button" className="addons-panel-back" onClick={() => setMarketplaceStep(3)}>
                ← Back to browse
              </button>
              <button
                type="button"
                className="addons-panel-pay"
                disabled={
                  paying ||
                  quoteLoading ||
                  !checkoutQuote ||
                  !hasMarketplaceCartSelection({
                    includePlatformBundle,
                    includeVerticalBundle,
                    includeJobHunterStandalone,
                  })
                }
                onClick={() => void onPay()}
              >
                {paying
                  ? "Processing…"
                  : checkoutQuote?.amountCents === 0
                    ? "Activate free bundles"
                    : `Pay ${checkoutQuote ? formatTotal(checkoutQuote.amountCents) : ""}`}
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
