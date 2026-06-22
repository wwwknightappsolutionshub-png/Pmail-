import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { BespokeMailUseCase } from "../data/bespokeMailUseCases";
import { BESPOKE_MAIL_USE_CASES } from "../data/bespokeMailUseCases";
import "./LandingPage.css";
import "./UseCasePage.css";

type UseCaseCardProps = {
  useCase: BespokeMailUseCase;
  index: number;
};

function UseCaseCard({ useCase, index }: UseCaseCardProps) {
  const [addonsOpen, setAddonsOpen] = useState(false);
  const addonsRef = useRef<HTMLDivElement>(null);
  const addonsId = `use-case-addons-${useCase.id}`;

  useEffect(() => {
    if (!addonsOpen || !addonsRef.current) return;
    addonsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [addonsOpen]);

  return (
    <article className={`use-case-card use-case-card--${index + 1}`}>
      <span className="use-case-card-num">{String(index + 1).padStart(2, "0")}</span>
      <h2 className="landing-section-title use-case-card-title">{useCase.industry}</h2>
      <p className="muted use-case-card-summary">{useCase.summary}</p>

      <div className="use-case-card-actions">
        <Link to={`/use-case/demo/${useCase.id}`} className="btn btn-primary">
          Demo
        </Link>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={addonsOpen}
          aria-controls={addonsId}
          onClick={() => setAddonsOpen((open) => !open)}
        >
          {addonsOpen ? "Hide Addons" : "View Addons"}
        </button>
      </div>

      {addonsOpen ? (
        <div id={addonsId} ref={addonsRef} className="use-case-feature-groups">
          {useCase.featureGroups.map((group) => (
            <div key={group.title} className="use-case-feature-group">
              <h3 className="use-case-feature-group-title">{group.title}</h3>
              <ul className="use-case-feature-list">
                {group.items.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function UseCasePage() {
  return (
    <div className="landing use-case-page">
      <MarketingHeader active="bespoke" />

      <section className="use-case-hero section-pad">
        <div className="container">
          <p className="section-eyebrow">Use cases</p>
          <h1 className="landing-section-title use-case-hero-title">Bespoke Mail for email-first industries</h1>
          <p className="use-case-hero-lead muted">
            Prohost Cloud&apos;s Bespoke Mail Client adapts to how your organization actually works — with industry-specific
            tools, branded domains, and workflows built around high-volume email.
          </p>
        </div>
      </section>

      <section className="section-pad section-pad--alt">
        <div className="container">
          <div className="use-case-grid">
            {BESPOKE_MAIL_USE_CASES.map((useCase, index) => (
              <UseCaseCard key={useCase.id} useCase={useCase} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad use-case-cta-band">
        <div className="container use-case-cta-inner">
          <div>
            <p className="section-eyebrow">Ready to deploy</p>
            <h2 className="landing-section-title">Mail panel tailored to your industry</h2>
            <p className="muted">
              Register for custom pricing or open the live mail client to explore the Bespoke Mail experience.
            </p>
          </div>
          <div className="use-case-cta-actions">
            <Link to="/#register" className="btn btn-primary">
              Get custom pricing
            </Link>
            <Link to="/" className="btn btn-ghost">
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
