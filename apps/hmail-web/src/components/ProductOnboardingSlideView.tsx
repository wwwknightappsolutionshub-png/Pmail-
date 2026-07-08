import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type {
  ProductOnboardingSlide,
  ProductOnboardingSlideActionIntent,
} from "../data/productOnboardingSlides";

type ProductOnboardingSlideViewProps = {
  slide: ProductOnboardingSlide;
  active?: boolean;
  style?: CSSProperties;
  onAction?: (intent: ProductOnboardingSlideActionIntent) => void;
};

export function ProductOnboardingSlideView({
  slide,
  active = true,
  style,
  onAction,
}: ProductOnboardingSlideViewProps) {
  const hasSections = Boolean(slide.sections?.length);

  return (
    <article
      className={`product-onboarding-slide${active ? " is-active" : ""}${
        slide.variant === "cta" ? " product-onboarding-slide--cta" : ""
      }${hasSections ? " product-onboarding-slide--verticals" : ""}`}
      data-slide={slide.id}
      style={style}
      aria-hidden={!active}
    >
      <div className="product-onboarding-slide-inner">
        <div className="product-onboarding-slide-icon" aria-hidden="true">
          <span className="product-onboarding-slide-icon-glow" />
          <span className="product-onboarding-slide-icon-char">{slide.icon}</span>
        </div>
        <p className="product-onboarding-slide-eyebrow">{slide.eyebrow}</p>
        <h2 className="product-onboarding-slide-title">{slide.title}</h2>
        <p className="product-onboarding-slide-lead">{slide.lead}</p>
        {slide.highlight ? (
          <p className="product-onboarding-slide-highlight">{slide.highlight}</p>
        ) : null}
        {slide.bullets.length > 0 ? (
          <ul className="product-onboarding-slide-bullets">
            {slide.bullets.map((bullet, bulletIndex) => (
              <li key={bullet} style={{ "--pow-stagger": bulletIndex } as CSSProperties}>
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}
        {slide.actions?.length ? (
          <div className="product-onboarding-slide-actions">
            {slide.actions.map((action, actionIndex) =>
              action.to ? (
                <Link
                  key={action.label}
                  to={action.to}
                  className="product-onboarding-slide-action"
                  style={{ "--pow-stagger": actionIndex } as CSSProperties}
                  tabIndex={active ? undefined : -1}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  className="product-onboarding-slide-action"
                  style={{ "--pow-stagger": actionIndex } as CSSProperties}
                  tabIndex={active ? undefined : -1}
                  onClick={() => {
                    if (action.intent) onAction?.(action.intent);
                  }}
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        ) : null}
        {slide.sections?.length ? (
          <div className="product-onboarding-slide-sections">
            {slide.sections.map((section, sectionIndex) => (
              <div
                key={section.title}
                className="product-onboarding-slide-section"
                style={{ "--pow-stagger": sectionIndex } as CSSProperties}
              >
                <h3 className="product-onboarding-slide-section-title">{section.title}</h3>
                <ul className="product-onboarding-slide-section-items">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
