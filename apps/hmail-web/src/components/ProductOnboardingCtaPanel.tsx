import type { ProductOnboardingSlide } from "../data/productOnboardingSlides";
import { ProductOnboardingSlideView } from "./ProductOnboardingSlideView";
import { ProductOnboardingWizardBackground } from "./ProductOnboardingWizardBackground";
import "./ProductOnboardingWizard.css";

type ProductOnboardingCtaPanelProps = {
  slide: ProductOnboardingSlide;
  productName: string;
  className?: string;
  onBack?: () => void;
  showSignInHint?: boolean;
};

export function ProductOnboardingCtaPanel({
  slide,
  productName,
  className = "",
  onBack,
  showSignInHint = false,
}: ProductOnboardingCtaPanelProps) {
  return (
    <div
      className={`product-onboarding-wizard product-onboarding-wizard--cta product-onboarding-wizard--login-cta${
        className ? ` ${className}` : ""
      }`}
      data-active-slide={slide.id}
    >
      <ProductOnboardingWizardBackground />

      <div className="product-onboarding-wizard-top">
        <span className="product-onboarding-wizard-brand">{productName}</span>
      </div>

      <div className="product-onboarding-wizard-stage product-onboarding-wizard-stage--static">
        <ProductOnboardingSlideView slide={slide} active />
      </div>

      {onBack || showSignInHint ? (
        <div className="product-onboarding-wizard-footer product-onboarding-wizard-footer--cta-only">
          <div className="product-onboarding-wizard-nav">
            {onBack ? (
              <button type="button" className="product-onboarding-wizard-nav-btn subtle" onClick={onBack}>
                Back
              </button>
            ) : null}
            {showSignInHint ? (
              <button
                type="button"
                className="product-onboarding-wizard-nav-btn product-onboarding-wizard-nav-btn--cta-hint"
                onClick={() => {
                  document.getElementById("welcome-sign-in-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Sign in below →
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
