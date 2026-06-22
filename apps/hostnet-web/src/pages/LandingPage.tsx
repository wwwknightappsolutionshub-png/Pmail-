import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { api } from "../api/client";

import { HeroStatsPanel } from "../components/HeroStatsPanel";

import {

  CapabilitiesArt,

  HeroMeshArt,

  PlatformOrbitArt,

  PmailTeaserArt,

  SecurityShieldArt,

  SolutionsFabricArt,

} from "../components/landing/LandingArt";

import { LandingArtFrame } from "../components/landing/LandingArtFrame";

import { SectionRichText } from "../components/SectionRichText";

import { MarketingHeader } from "../components/MarketingHeader";

import { MarketingFooter } from "../components/MarketingFooter";

import { RegisterPricingForm } from "../components/RegisterPricingForm";

import { TestimonialsSection } from "../components/TestimonialsSection";

import {

  bulletsOrFallback,

  heroMetricsFromSection,

  LANDING_FALLBACKS,

  parseBulletCard,

  sectionByKey,

} from "../lib/landingContent";

import {

  landingSectionEyebrow,

  landingSectionFeaturesCopy,

  landingSectionPlatformCopy,

} from "../lib/landingSectionUi";

import type { PublicSitePayload } from "../types/site";

import "./LandingPage.css";



export function LandingPage() {

  const [data, setData] = useState<PublicSitePayload | null>(null);

  const [error, setError] = useState<string | null>(null);



  useEffect(() => {

    api.publicSite().then(setData).catch((err: Error) => setError(err.message));

  }, []);



  const sections = data?.sections ?? [];



  const hero = useMemo(() => sectionByKey(sections, "hero"), [sections]);

  const enterprise = useMemo(() => sectionByKey(sections, "enterprise"), [sections]);

  const solutions = useMemo(() => sectionByKey(sections, "solutions"), [sections]);

  const platform = useMemo(() => sectionByKey(sections, "platform"), [sections]);

  const growthCta = useMemo(() => sectionByKey(sections, "growth_cta"), [sections]);

  const trust = useMemo(() => sectionByKey(sections, "trust"), [sections]);

  const bespokeMail = useMemo(() => sectionByKey(sections, "hmail_addons"), [sections]);

  const features = useMemo(() => sectionByKey(sections, "features"), [sections]);

  const testimonials = useMemo(() => sectionByKey(sections, "testimonials"), [sections]);

  const contact = useMemo(() => sectionByKey(sections, "contact"), [sections]);



  const heroMetrics = useMemo(() => heroMetricsFromSection(hero), [hero]);

  const enterpriseCards = useMemo(

    () => bulletsOrFallback(enterprise, [...LANDING_FALLBACKS.enterprise]),

    [enterprise],

  );

  const solutionCards = useMemo(

    () => bulletsOrFallback(solutions, [...LANDING_FALLBACKS.solutions]),

    [solutions],

  );

  const platformCards = useMemo(

    () => bulletsOrFallback(platform, [...LANDING_FALLBACKS.platform]),

    [platform],

  );

  const capabilityItems = useMemo(

    () => bulletsOrFallback(features, [...LANDING_FALLBACKS.capabilities]),

    [features],

  );

  const trustItems = useMemo(() => bulletsOrFallback(trust, [...LANDING_FALLBACKS.trustStrip]), [trust]);



  const bespokeTitle = bespokeMail?.title ?? LANDING_FALLBACKS.bespokeMail.title;

  const bespokeBody = bespokeMail?.body ?? LANDING_FALLBACKS.bespokeMail.body;

  const bespokeCtaLabel = bespokeMail?.ctaLabel ?? LANDING_FALLBACKS.bespokeMail.ctaLabel;

  const bespokeCtaUrl = bespokeMail?.ctaUrl ?? LANDING_FALLBACKS.bespokeMail.ctaUrl;

  const heroCtaLabel = hero?.ctaLabel ?? "Register & get custom pricing";

  const heroCtaUrl = hero?.ctaUrl ?? "#register";

  const growthCtaLabel = growthCta?.ctaLabel ?? LANDING_FALLBACKS.growthCta.ctaLabel;

  const growthCtaUrl = growthCta?.ctaUrl ?? LANDING_FALLBACKS.growthCta.ctaUrl;

  const growthBullets = useMemo(
    () => growthCta?.bulletPoints?.length ? growthCta.bulletPoints : [],
    [growthCta],
  );



  if (error) {

    return (

      <div className="container" style={{ padding: "3rem 0" }}>

        <div className="error-banner">Could not load site content: {error}</div>

      </div>

    );

  }



  if (!data) {

    return <div className="loading-state container">Loading Prohost Cloud…</div>;

  }



  return (

    <div className="landing">

      <MarketingHeader />



      <section className="hero-prohost">

        <div className="hero-prohost-bg" aria-hidden />

        <div className="container hero-prohost-grid">

          <div className="hero-prohost-copy">

            <p className="hero-kicker">{landingSectionEyebrow("hero", hero?.subtitle)}</p>

            <h1>

              {hero?.title ?? "Enterprise infrastructure for modern teams"}

              {hero?.subtitle ? <span>{hero.subtitle}</span> : null}

            </h1>

            {hero?.body ? <SectionRichText html={hero.body} className="hero-body" /> : null}

            <div className="hero-cta-row">

              <a href={heroCtaUrl} className="btn btn-primary">

                {heroCtaLabel}

              </a>

              <Link to={growthCtaUrl} className="btn btn-secondary">

                {growthCtaLabel}

              </Link>

            </div>

            <dl className="hero-metrics">

              {heroMetrics.map((metric) => (

                <div key={metric.label} className="hero-metric">

                  <dt>{metric.value}</dt>

                  <dd>{metric.label}</dd>

                </div>

              ))}

            </dl>

          </div>

          <div className="hero-prohost-visual">

            <LandingArtFrame variant="hero">

              <HeroMeshArt />

            </LandingArtFrame>

            <div className="hero-prohost-panel">

              <HeroStatsPanel preview={data.panelPreview} />

            </div>

          </div>

        </div>

      </section>



      <div className="trust-strip" aria-label="Platform guarantees">

        <div className="trust-strip-viewport">

          <div className="trust-strip-track">

            {[...trustItems, ...trustItems].map((item, index) => (

              <span key={`${item}-${index}`}>{parseBulletCard(item).title}</span>

            ))}

          </div>

        </div>

      </div>



      <section id="platform" className="section-pad section-offset">

        <div className="container split-section split-section--art-right">

          <div className="split-section-copy">

            <p className="section-eyebrow">{landingSectionEyebrow("enterprise", enterprise?.subtitle)}</p>

            <h2 className="landing-section-title">{enterprise?.title ?? "Enterprise-grade hosting platform"}</h2>

            {enterprise?.subtitle ? <p className="section-lead">{enterprise.subtitle}</p> : null}

            {enterprise?.body ? <SectionRichText html={enterprise.body} className="muted" /> : null}

            <div className="stack-cards">

              {enterpriseCards.map((item) => {

                const card = parseBulletCard(item);

                return (

                  <article key={item} className="stack-card">

                    <h3>{card.title}</h3>

                    {card.description ? <p>{card.description}</p> : null}

                  </article>

                );

              })}

            </div>

          </div>

          <div className="split-section-art">

            <LandingArtFrame variant="orbit">

              <PlatformOrbitArt />

            </LandingArtFrame>

          </div>

        </div>

      </section>



      <section id="solutions" className="section-pad section-pad--alt">

        <div className="container split-section split-section--art-left">

          <div className="split-section-art">

            <LandingArtFrame variant="fabric" delay={80}>

              <SolutionsFabricArt />

            </LandingArtFrame>

          </div>

          <div className="split-section-copy">

            <p className="section-eyebrow">{landingSectionEyebrow("solutions", solutions?.subtitle)}</p>

            <h2 className="landing-section-title">{solutions?.title ?? "Built for how your organization operates"}</h2>

            {solutions?.subtitle ? <p className="section-lead">{solutions.subtitle}</p> : null}

            {solutions?.body ? <SectionRichText html={solutions.body} className="muted" /> : null}

            <div className="solutions-rail">

              {solutionCards.map((item, idx) => {

                const card = parseBulletCard(item);

                return (

                  <article key={item} className="solutions-rail-item">

                    <span className="solutions-rail-num">{String(idx + 1).padStart(2, "0")}</span>

                    <div>

                      <h3>{card.title}</h3>

                      {card.description ? <p>{card.description}</p> : null}

                    </div>

                  </article>

                );

              })}

            </div>

          </div>

        </div>

      </section>



      <section id="product-suite" className="section-pad product-suite-band">

        <div className="container">

          <div className="section-head section-head--center product-suite-head">

            <p className="section-eyebrow">{landingSectionEyebrow("platform", platform?.subtitle)}</p>

            <h2 className="landing-section-title">{platform?.title ?? "One platform. Four integrated products."}</h2>

            {(() => {
              const copy = landingSectionPlatformCopy(platform?.subtitle ?? "", platform?.body ?? "");
              if (copy.mutedHtml) return <p className="muted">{copy.mutedHtml}</p>;
              if (copy.useBody && platform?.body) return <SectionRichText html={platform.body} className="muted" />;
              return null;
            })()}

          </div>

          <div className="product-suite-grid">

            {platformCards.map((item, idx) => {

              const card = parseBulletCard(item);

              const icons = ["◈", "⬡", "◆", "✦"];

              return (

                <article

                  key={item}

                  className={`product-suite-card${idx === 1 ? " product-suite-card--featured" : ""}`}

                >

                  <div className="product-suite-card-top">

                    <span className="product-suite-icon" aria-hidden>

                      {icons[idx] ?? "◈"}

                    </span>

                    <span className="product-suite-step">{String(idx + 1).padStart(2, "0")}</span>

                  </div>

                  <h3>{card.title}</h3>

                  {card.description ? <p>{card.description}</p> : null}

                </article>

              );

            })}

          </div>

        </div>

      </section>



      <section id="growth" className="section-pad growth-cta-band">

        <div className="container split-section split-section--art-right">

          <div className="split-section-copy">

            <p className="section-eyebrow">{growthCta?.subtitle ?? LANDING_FALLBACKS.growthCta.subtitle}</p>

            <h2 className="landing-section-title">{growthCta?.title ?? LANDING_FALLBACKS.growthCta.title}</h2>

            {growthCta?.body ? (
              <SectionRichText html={growthCta.body} className="muted" />
            ) : (
              <p className="muted">{LANDING_FALLBACKS.growthCta.body}</p>
            )}

            {growthBullets.length > 0 ? (
              <ul className="capabilities-columns">
                {growthBullets.map((item) => (
                  <li key={item}>{parseBulletCard(item).title}</li>
                ))}
              </ul>
            ) : null}

            <p style={{ marginTop: "1.25rem" }}>
              <Link to={growthCtaUrl} className="btn btn-primary">
                {growthCtaLabel}
              </Link>
            </p>

          </div>

          <div className="split-section-art">

            <LandingArtFrame variant="capabilities" delay={80}>

              <PlatformOrbitArt />

            </LandingArtFrame>

          </div>

        </div>

      </section>



      <section id="features" className="section-pad section-pad--alt">

        <div className="container split-section split-section--art-right">

          <div className="split-section-copy">

            <p className="section-eyebrow">{landingSectionEyebrow("features", features?.subtitle)}</p>

            <h2 className="landing-section-title">{features?.title ?? "Built like infrastructure, feels like software"}</h2>

            {(() => {
              const copy = landingSectionFeaturesCopy(features?.subtitle ?? "", features?.body ?? "");
              if (copy.leadHtml && !copy.useSubtitle) return <SectionRichText html={copy.leadHtml} className="muted" />;
              if (copy.leadHtml && copy.useSubtitle) return <p className="muted">{copy.leadHtml}</p>;
              return null;
            })()}

            <ul className="capabilities-columns">

              {capabilityItems.map((item) => (

                <li key={item}>{parseBulletCard(item).title}</li>

              ))}

            </ul>

          </div>

          <div className="split-section-art">

            <LandingArtFrame variant="capabilities" delay={120}>

              <CapabilitiesArt />

            </LandingArtFrame>

          </div>

        </div>

      </section>



      <section id="security" className="section-pad">

        <div className="container split-section split-section--art-left">

          <div className="split-section-art split-section-art--narrow">

            <LandingArtFrame variant="shield" delay={60}>

              <SecurityShieldArt />

            </LandingArtFrame>

          </div>

          <div className="split-section-copy">

            <p className="section-eyebrow">{landingSectionEyebrow("trust", trust?.subtitle)}</p>

            <h2 className="landing-section-title">{trust?.title ?? "Security and reliability you can stand behind"}</h2>

            {trust?.subtitle ? <p className="section-lead">{trust.subtitle}</p> : null}

            {trust?.body ? <SectionRichText html={trust.body} className="muted" /> : null}

            <div className="security-list">

              {trustItems.map((item) => (

                <div key={item} className="security-list-item">

                  <span className="security-dot" aria-hidden />

                  {parseBulletCard(item).title}

                </div>

              ))}

            </div>

          </div>

        </div>

      </section>



      <section id="pmail" className="section-pad section-pad--alt pmail-teaser">

        <div className="container split-section split-section--art-right">

          <div className="split-section-copy">

            <p className="section-eyebrow">{landingSectionEyebrow("hmail_addons", bespokeMail?.subtitle)}</p>

            <h2 className="landing-section-title">{bespokeTitle}</h2>

            {bespokeBody ? <SectionRichText html={bespokeBody} className="muted" /> : null}

            {bespokeCtaLabel ? (

              bespokeCtaUrl.startsWith("/") ? (

                <Link to={bespokeCtaUrl} className="btn btn-secondary">

                  {bespokeCtaLabel}

                </Link>

              ) : (

                <a href={bespokeCtaUrl} className="btn btn-secondary">

                  {bespokeCtaLabel}

                </a>

              )

            ) : null}

          </div>

          <div className="split-section-art">

            <LandingArtFrame variant="pmail" delay={100}>

              <PmailTeaserArt />

            </LandingArtFrame>

          </div>

        </div>

      </section>



      <TestimonialsSection

        title={testimonials?.title}

        subtitle={testimonials?.subtitle}

        description={testimonials?.body}

      />



      <section id="register" className="section-pad suite-band register-band">

        <div className="container">

          <div className="section-head section-head--center">

            <p className="section-eyebrow">{landingSectionEyebrow("contact", contact?.subtitle)}</p>

            <h2 className="landing-section-title">{contact?.title ?? "Register for a tailored quote"}</h2>

            {contact?.subtitle ? <p className="muted">{contact.subtitle}</p> : null}

            {contact?.body ? <SectionRichText html={contact.body} className="muted register-intro" /> : null}

          </div>

          <RegisterPricingForm heroImageUrl={contact?.imageUrl} />

        </div>

      </section>



      <MarketingFooter />

    </div>

  );

}


