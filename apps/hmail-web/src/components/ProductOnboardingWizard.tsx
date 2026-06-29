import { useCallback, useRef, useState, type TouchEvent } from "react";
import type { ProductOnboardingSlide } from "../data/productOnboardingSlides";
import { ProductOnboardingCtaPanel } from "./ProductOnboardingCtaPanel";
import { ProductOnboardingSlideView } from "./ProductOnboardingSlideView";
import { ProductOnboardingWizardBackground } from "./ProductOnboardingWizardBackground";
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

  if (isCtaSlide && slide.variant === "cta") {
    return (
      <ProductOnboardingCtaPanel
        slide={slide}
        productName={productName}
        className={className}
        onBack={activeIndex > 0 ? goPrev : undefined}
        showSignInHint
      />
    );
  }

  return (
    <div
      className={`product-onboarding-wizard${className ? ` ${className}` : ""} product-onboarding-wizard--fullscreen`}
      data-active-slide={slide.id}
    >
      <ProductOnboardingWizardBackground />

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
          {slides.map((entry, index) => (
            <ProductOnboardingSlideView key={entry.id} slide={entry} active={index === activeIndex} />
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
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
