import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_TENANT_SLUG } from "../constants/tenant";
import {
  buildProductOnboardingSlides,
  formatReferrerDisplayName,
} from "../data/productOnboardingSlides";
import { LoginBrandPanel } from "../components/LoginBrandPanel";
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

function useIsWideLayout() {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return wide;
}

export function WelcomePage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const [searchParams] = useSearchParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const { user } = useAuth();
  const isWideLayout = useIsWideLayout();
  const replayTour = searchParams.get("replay") === "1";
  const referralRef = searchParams.get("ref")?.trim() ?? null;

  const { branding, loadError } = useTenantBranding(tenantSlug);
  const loginForm = useLoginForm(tenantSlug, { onLoginSuccess: markWelcomeOnboardingSeen });

  const [slideIndex, setSlideIndex] = useState(0);
  const [mobileShowLogin, setMobileShowLogin] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(false);
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

  const finishWizard = () => {
    markWelcomeOnboardingSeen();
    setWizardDismissed(true);
    setMobileShowLogin(true);
  };

  const showWizardPanel = !wizardDismissed;
  const mobileLoginOnly = !isWideLayout && mobileShowLogin;
  const hideLoginOnMobile = showWizardPanel && !isWideLayout;

  if (user) return <Navigate to="/" replace />;

  if (hasSeenWelcomeOnboarding() && !replayTour) {
    const refQuery = referralRef?.includes("@") ? `?ref=${encodeURIComponent(referralRef)}` : "";
    return <Navigate to={buildLoginPath(tenantSlug, refQuery)} replace />;
  }

  return (
    <LoginShell
      branding={branding}
      layoutClassName={`welcome-layout${showWizardPanel ? " welcome-layout--wizard" : ""}${
        hideLoginOnMobile ? " welcome-layout--wizard-only" : ""
      }${mobileLoginOnly ? " welcome-layout--login-only-mobile" : ""}`}
      brandPanelClassName={showWizardPanel ? "welcome-brand-panel--wizard" : ""}
      formPanelClassName={hideLoginOnMobile ? "welcome-form-panel--hidden-mobile" : ""}
      leftPanel={
        showWizardPanel ? (
          <ProductOnboardingWizard
            slides={slides}
            activeIndex={slideIndex}
            onActiveIndexChange={setSlideIndex}
            onSkip={finishWizard}
            onComplete={finishWizard}
            productName={branding.productName}
            desktopCompanion={isWideLayout}
          />
        ) : mobileLoginOnly ? null : (
          <LoginBrandPanel branding={branding} />
        )
      }
      rightPanel={
        accessMode === "prospect" ? (
          <ProspectAccessForm
            tenantSlug={tenantSlug}
            productName={branding.productName}
            onBackToSignIn={() => setAccessMode("signin")}
          />
        ) : (
          <>
            <LoginFormCard {...loginForm} loadError={loadError} showExploreLink={false} />
            <button type="button" className="prospect-access-toggle" onClick={() => setAccessMode("prospect")}>
              Request workspace access without connecting mail
            </button>
          </>
        )
      }
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
