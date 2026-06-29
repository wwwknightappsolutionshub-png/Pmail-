import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_TENANT_SLUG } from "../constants/tenant";
import {
  buildProductOnboardingSlides,
  formatReferrerDisplayName,
} from "../data/productOnboardingSlides";
import { LoginFormCard } from "../components/LoginFormCard";
import { buildLoginPath, LoginShell, useTenantBranding } from "../components/LoginShell";
import { ProductOnboardingWizard } from "../components/ProductOnboardingWizard";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { ProspectAccessForm } from "../components/ProspectAccessForm";
import { useLoginForm } from "../hooks/useLoginForm";
import { persistReferralRef } from "../utils/referralStorage";
import {
  hasSeenWelcomeOnboarding,
  markWelcomeOnboardingSeen,
} from "../utils/welcomeOnboardingPrefs";
import "./WelcomePage.css";
import "../components/ProspectAccessForm.css";

export function WelcomePage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const [searchParams] = useSearchParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const { user } = useAuth();
  const replayTour = searchParams.get("replay") === "1";
  const referralRef = searchParams.get("ref")?.trim() ?? null;

  const { branding, loadError } = useTenantBranding(tenantSlug);
  const loginForm = useLoginForm(tenantSlug, { onLoginSuccess: markWelcomeOnboardingSeen });

  const [slideIndex, setSlideIndex] = useState(0);
  const [accessMode, setAccessMode] = useState<"signin" | "prospect">("signin");

  useEffect(() => {
    persistReferralRef(referralRef);
  }, [referralRef]);

  const slides = useMemo(
    () =>
      buildProductOnboardingSlides({
        productName: branding.productName,
        referrerLabel: referralRef?.includes("@") ? formatReferrerDisplayName(referralRef) : null,
      }),
    [branding.productName, referralRef],
  );

  const isCtaSlide = slideIndex >= slides.length - 1;

  const skipToSignIn = () => {
    setSlideIndex(slides.length - 1);
  };

  if (user) return <Navigate to="/" replace />;

  if (hasSeenWelcomeOnboarding() && !replayTour) {
    const refQuery = referralRef?.includes("@") ? `?ref=${encodeURIComponent(referralRef)}` : "";
    return <Navigate to={buildLoginPath(tenantSlug, refQuery)} replace />;
  }

  const loginPanel =
    accessMode === "prospect" ? (
      <ProspectAccessForm
        tenantSlug={tenantSlug}
        productName={branding.productName}
        onBackToSignIn={() => setAccessMode("signin")}
      />
    ) : (
      <LoginFormCard
        {...loginForm}
        loadError={loadError}
        onRequestWorkspaceAccess={() => setAccessMode("prospect")}
      />
    );

  return (
    <LoginShell
      branding={branding}
      layoutClassName={`welcome-layout welcome-layout--wizard${
        isCtaSlide ? " welcome-layout--cta-split" : " welcome-layout--fullscreen-slides"
      }`}
      brandPanelClassName="welcome-brand-panel--wizard"
      formPanelClassName={isCtaSlide ? "welcome-form-panel--cta" : "welcome-form-panel--hidden"}
      leftPanel={
        <ProductOnboardingWizard
          slides={slides}
          activeIndex={slideIndex}
          onActiveIndexChange={setSlideIndex}
          onSkipToSignIn={skipToSignIn}
          productName={branding.productName}
          isCtaSlide={isCtaSlide}
        />
      }
      rightPanel={<div id="welcome-sign-in-panel">{loginPanel}</div>}
      overlay={
        loginForm.submitting ? (
          <PmailLoadingScreen
            productName={branding.productName}
            subtitle="Signing you in…"
            className="pmail-loading-screen--overlay"
          />
        ) : null
      }
    />
  );
}
