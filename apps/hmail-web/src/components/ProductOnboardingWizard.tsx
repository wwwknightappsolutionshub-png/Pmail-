import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from "react";
import type {
  ProductOnboardingSlide,
  ProductOnboardingSlideActionIntent,
} from "../data/productOnboardingSlides";
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
  onContinueToSignIn?: () => void;
  onRequestWorkspaceAccess?: () => void;
  productName: string;
  className?: string;
  isCtaSlide?: boolean;
};

export function ProductOnboardingWizard({
  slides,
  activeIndex,
  onActiveIndexChange,
  onSkipToSignIn,
  onContinueToSignIn,
  onRequestWorkspaceAccess,
  productName,
  className = "",
  isCtaSlide = false,
}: ProductOnboardingWizardProps) {
  const handleSlideAction = (intent: ProductOnboardingSlideActionIntent) => {
    if (intent === "request-workspace-access") {
      onRequestWorkspaceAccess?.();
    }
  };
  const touchStartX = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const slide = slides[activeIndex];
  const isLastSlide = activeIndex >= slides.length - 1;

  const measureStage = useCallback(() => {
    const width = stageRef.current?.clientWidth ?? 0;
    setStageWidth(width);
  }, []);

  useLayoutEffect(() => {
    measureStage();
  }, [measureStage, slides.length, isCtaSlide]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(() => measureStage());
    observer.observe(stage);
    window.addEventListener("orientationchange", measureStage);
    window.addEventListener("resize", measureStage);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", measureStage);
      window.removeEventListener("resize", measureStage);
    };
  }, [measureStage, isCtaSlide]);

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

  const trackOffsetPx = stageWidth > 0 ? -activeIndex * stageWidth + dragOffset : 0;
  const stageReady = stageWidth > 0;

  if (isCtaSlide && slide.variant === "cta") {
    return (
      <ProductOnboardingCtaPanel
        slide={slide}
        productName={productName}
        className={className}
        onBack={activeIndex > 0 ? goPrev : undefined}
        onContinueToSignIn={onContinueToSignIn}
        onRequestWorkspaceAccess={onRequestWorkspaceAccess}
        showSignInHint
      />
    );
  }

  return (
    <div
      className={`product-onboarding-wizard${className ? ` ${className}` : ""} product-onboarding-wizard--fullscreen`}
      data-active-slide={slide.id}
      style={{ ["--slide-count" as string]: slides.length }}
    >
      <ProductOnboardingWizardBackground />

      <div className="product-onboarding-wizard-top">
        {!isLastSlide ? (
          <button type="button" className="product-onboarding-wizard-skip" onClick={onSkipToSignIn}>
            Skip to sign in
          </button>
        ) : null}
      </div>

      <div
        ref={stageRef}
        className={`product-onboarding-wizard-stage${stageReady ? " is-ready" : ""}`}
        style={{
          ["--active-index" as string]: activeIndex,
          ["--drag-offset" as string]: `${dragOffset}px`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="product-onboarding-wizard-track"
          style={{
            transform: `translate3d(${trackOffsetPx}px, 0, 0)`,
            width: stageWidth > 0 ? stageWidth * slides.length : undefined,
          }}
        >
          {slides.map((entry, index) => (
            <ProductOnboardingSlideView
              key={entry.id}
              slide={entry}
              active={index === activeIndex}
              onAction={handleSlideAction}
              style={stageWidth > 0 ? { width: stageWidth, flex: "0 0 auto" } : undefined}
            />
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
          <button
            type="button"
            className="product-onboarding-wizard-nav-btn product-onboarding-wizard-nav-btn--next"
            onClick={goNext}
            disabled={isLastSlide}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
