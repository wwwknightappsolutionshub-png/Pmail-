import { useCallback, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import type { ProductOnboardingSlide } from "../data/productOnboardingSlides";
import "./ProductOnboardingWizard.css";

const SWIPE_THRESHOLD_PX = 48;

type ProductOnboardingWizardProps = {
  slides: ProductOnboardingSlide[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSkipToSignIn: () => void;
  productName: string;
  className?: string;
  isCtaSlide?: boolean;
};

export function ProductOnboardingWizard({
  slides,
  activeIndex,
  onActiveIndexChange,
  onSkipToSignIn,
  productName,
  className = "",
  isCtaSlide = false,
}: ProductOnboardingWizardProps) {
  const touchStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const slide = slides[activeIndex];
  const isLastSlide = activeIndex >= slides.length - 1;

  const goNext = useCallback(() => {
    if (isLastSlide) return;
    onActiveIndexChange(activeIndex + 1);
  }, [activeIndex, isLastSlide, onActiveIndexChange]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) onActiveIndexChange(activeIndex - 1);
  }, [activeIndex, onActiveIndexChange]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setDragOffset(0);
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const currentX = event.touches[0]?.clientX ?? touchStartX.current;
    setDragOffset(currentX - touchStartX.current);
  };

  const onTouchEnd = () => {
    if (touchStartX.current == null) return;
    if (dragOffset <= -SWIPE_THRESHOLD_PX) goNext();
    else if (dragOffset >= SWIPE_THRESHOLD_PX) goPrev();
    touchStartX.current = null;
    setDragOffset(0);
  };

  if (!slide) return null;

  return (
    <div
      className={`product-onboarding-wizard${className ? ` ${className}` : ""}${
        isCtaSlide ? " product-onboarding-wizard--cta" : " product-onboarding-wizard--fullscreen"
      }`}
      data-active-slide={slide.id}
    >
      <div className="product-onboarding-wizard-bg" aria-hidden="true">
        <span className="product-onboarding-wizard-mesh" />
        <span className="product-onboarding-wizard-grid" />
        <span className="product-onboarding-wizard-shimmer" />
        <span className="product-onboarding-wizard-orb product-onboarding-wizard-orb--a" />
        <span className="product-onboarding-wizard-orb product-onboarding-wizard-orb--b" />
        <span className="product-onboarding-wizard-orb product-onboarding-wizard-orb--c" />
        <span className="product-onboarding-wizard-spark product-onboarding-wizard-spark--1" />
        <span className="product-onboarding-wizard-spark product-onboarding-wizard-spark--2" />
        <span className="product-onboarding-wizard-spark product-onboarding-wizard-spark--3" />
      </div>

      <div className="product-onboarding-wizard-top">
        <span className="product-onboarding-wizard-brand">{productName}</span>
        {!isLastSlide ? (
          <button type="button" className="product-onboarding-wizard-skip" onClick={onSkipToSignIn}>
            Skip to sign in
          </button>
        ) : null}
      </div>

      <div
        className="product-onboarding-wizard-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="product-onboarding-wizard-track"
          style={{
            transform: `translateX(calc(${-activeIndex * 100}% + ${dragOffset}px))`,
          }}
        >
          {slides.map((entry, index) => {
            const isActive = index === activeIndex;
            const hasSections = Boolean(entry.sections?.length);

            return (
              <article
                key={entry.id}
                className={`product-onboarding-slide${isActive ? " is-active" : ""}${
                  entry.variant === "cta" ? " product-onboarding-slide--cta" : ""
                }${hasSections ? " product-onboarding-slide--verticals" : ""}`}
                aria-hidden={!isActive}
                data-slide={entry.id}
              >
                <div className="product-onboarding-slide-inner">
                  <div className="product-onboarding-slide-icon" aria-hidden="true">
                    <span className="product-onboarding-slide-icon-glow" />
                    <span className="product-onboarding-slide-icon-char">{entry.icon}</span>
                  </div>
                  <p className="product-onboarding-slide-eyebrow">{entry.eyebrow}</p>
                  <h2 className="product-onboarding-slide-title">{entry.title}</h2>
                  <p className="product-onboarding-slide-lead">{entry.lead}</p>
                  {entry.bullets.length > 0 ? (
                    <ul className="product-onboarding-slide-bullets">
                      {entry.bullets.map((bullet, bulletIndex) => (
                        <li key={bullet} style={{ "--pow-stagger": bulletIndex } as CSSProperties}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {entry.sections?.length ? (
                    <div className="product-onboarding-slide-sections">
                      {entry.sections.map((section, sectionIndex) => (
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
          })}
        </div>
      </div>

      <div className="product-onboarding-wizard-footer">
        <div className="product-onboarding-wizard-dots" role="tablist" aria-label="Feature tour steps">
          {slides.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Step ${index + 1}: ${entry.eyebrow}`}
              className={`product-onboarding-wizard-dot${index === activeIndex ? " is-active" : ""}${
                index < activeIndex ? " is-done" : ""
              }`}
              onClick={() => onActiveIndexChange(index)}
            />
          ))}
        </div>

        <div className="product-onboarding-wizard-nav">
          <button
            type="button"
            className="product-onboarding-wizard-nav-btn subtle"
            onClick={goPrev}
            disabled={activeIndex === 0}
          >
            Back
          </button>
          {!isLastSlide ? (
            <button type="button" className="product-onboarding-wizard-nav-btn" onClick={goNext}>
              Next
            </button>
          ) : (
            <button
              type="button"
              className="product-onboarding-wizard-nav-btn product-onboarding-wizard-nav-btn--cta-hint"
              onClick={() => {
                document.getElementById("welcome-sign-in-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Sign in below →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
