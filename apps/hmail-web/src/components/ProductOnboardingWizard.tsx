import { useCallback, useRef, useState, type TouchEvent } from "react";
import type { ProductOnboardingSlide } from "../data/productOnboardingSlides";
import "./ProductOnboardingWizard.css";

const SWIPE_THRESHOLD_PX = 48;

type ProductOnboardingWizardProps = {
  slides: ProductOnboardingSlide[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSkip: () => void;
  onComplete: () => void;
  productName: string;
  className?: string;
  /** When true, login is always visible beside the wizard (desktop layout). */
  desktopCompanion?: boolean;
};

export function ProductOnboardingWizard({
  slides,
  activeIndex,
  onActiveIndexChange,
  onSkip,
  onComplete,
  productName,
  className = "",
  desktopCompanion = false,
}: ProductOnboardingWizardProps) {
  const touchStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const slide = slides[activeIndex];
  const isLastSlide = activeIndex >= slides.length - 1;

  const goNext = useCallback(() => {
    if (isLastSlide) {
      onComplete();
      return;
    }
    onActiveIndexChange(activeIndex + 1);
  }, [activeIndex, isLastSlide, onActiveIndexChange, onComplete]);

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
        desktopCompanion ? " product-onboarding-wizard--desktop" : ""
      }`}
    >
      <div className="product-onboarding-wizard-top">
        <span className="product-onboarding-wizard-brand">{productName}</span>
        <button type="button" className="product-onboarding-wizard-skip" onClick={onSkip}>
          Skip to sign in
        </button>
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
          {slides.map((entry) => (
            <article key={entry.id} className="product-onboarding-slide" aria-hidden={entry.id !== slide.id}>
              <div className="product-onboarding-slide-icon" aria-hidden="true">
                {entry.icon}
              </div>
              <p className="product-onboarding-slide-eyebrow">{entry.eyebrow}</p>
              <h2 className="product-onboarding-slide-title">{entry.title}</h2>
              <p className="product-onboarding-slide-lead">{entry.lead}</p>
              <ul className="product-onboarding-slide-bullets">
                {entry.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
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
          <button type="button" className="product-onboarding-wizard-nav-btn" onClick={goNext}>
            {isLastSlide ? (desktopCompanion ? "Ready to sign in →" : "Continue to sign in") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
