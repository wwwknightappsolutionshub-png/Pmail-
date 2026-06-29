import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_TENANT_SLUG } from "../constants/tenant";
import { buildProductOnboardingCtaSlide } from "../data/productOnboardingSlides";
import { LoginFormCard } from "../components/LoginFormCard";
import { ProductOnboardingCtaPanel } from "../components/ProductOnboardingCtaPanel";
import { buildWelcomePath, LoginShell, useTenantBranding } from "../components/LoginShell";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { ProspectAccessForm } from "../components/ProspectAccessForm";
import "../components/ProspectAccessForm.css";
import { useLoginForm } from "../hooks/useLoginForm";
import { hasSeenWelcomeOnboarding } from "../utils/welcomeOnboardingPrefs";
import "../pages/WelcomePage.css";

export function LoginPage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const { user } = useAuth();
  const { branding, loadError } = useTenantBranding(tenantSlug);
  const loginForm = useLoginForm(tenantSlug);
  const [accessMode, setAccessMode] = useState<"signin" | "prospect">("signin");

  const ctaSlide = useMemo(
    () => buildProductOnboardingCtaSlide(branding.productName),
    [branding.productName],
  );

  if (user) return <Navigate to="/" replace />;

  const exploreHref = buildWelcomePath(tenantSlug, {
    replay: hasSeenWelcomeOnboarding(),
  });

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
      exploreHref={exploreHref}
      showExploreLink
      layoutClassName="welcome-layout welcome-layout--wizard welcome-layout--cta-split"
      brandPanelClassName="welcome-brand-panel--wizard"
      formPanelClassName="welcome-form-panel--cta"
      leftPanel={<ProductOnboardingCtaPanel slide={ctaSlide} productName={branding.productName} />}
      rightPanel={<div id="login-sign-in-panel">{loginPanel}</div>}
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
