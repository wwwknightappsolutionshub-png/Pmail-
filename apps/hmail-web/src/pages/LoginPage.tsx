import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
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

function isProspectAccessParam(value: string | null) {
  return value === "prospect" || value === "1" || value === "true";
}

export function LoginPage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const { user } = useAuth();
  const { branding, loadError } = useTenantBranding(tenantSlug);
  const loginForm = useLoginForm(tenantSlug);
  const [accessMode, setAccessMode] = useState<"signin" | "prospect">(() =>
    isProspectAccessParam(searchParams.get("access")) ? "prospect" : "signin",
  );

  const { setLoginError } = loginForm;

  useEffect(() => {
    if (searchParams.get("session") !== "expired") return;
    setLoginError("Your session expired after a period of inactivity. Sign in again to continue.");
    try {
      sessionStorage.removeItem("pmail_session_expired");
    } catch {
      // ignore
    }
    const next = new URLSearchParams(searchParams);
    next.delete("session");
    setSearchParams(next, { replace: true });
  }, [searchParams, setLoginError, setSearchParams]);

  const ctaSlide = useMemo(
    () => buildProductOnboardingCtaSlide(branding.productName),
    [branding.productName],
  );

  function setAccessModeAndUrl(mode: "signin" | "prospect") {
    setAccessMode(mode);
    const next = new URLSearchParams(searchParams);
    if (mode === "prospect") {
      next.set("access", "prospect");
    } else {
      next.delete("access");
    }
    setSearchParams(next, { replace: true });
  }

  if (user) return <Navigate to="/" replace />;

  const exploreHref = buildWelcomePath(tenantSlug, {
    replay: hasSeenWelcomeOnboarding(),
  });

  const loginPanel =
    accessMode === "prospect" ? (
      <ProspectAccessForm
        tenantSlug={tenantSlug}
        productName={branding.productName}
        onBackToSignIn={() => setAccessModeAndUrl("signin")}
      />
    ) : (
      <LoginFormCard
        {...loginForm}
        loadError={loadError}
        onRequestWorkspaceAccess={() => setAccessModeAndUrl("prospect")}
      />
    );

  return (
    <LoginShell
      branding={branding}
      exploreHref={exploreHref}
      showExploreLink
      layoutClassName="welcome-layout welcome-layout--wizard welcome-layout--cta-split login-layout--signin-primary"
      brandPanelClassName="welcome-brand-panel--wizard"
      formPanelClassName="welcome-form-panel--cta"
      leftPanel={
        <ProductOnboardingCtaPanel
          slide={ctaSlide}
          productName={branding.productName}
          onRequestWorkspaceAccess={() => setAccessModeAndUrl("prospect")}
        />
      }
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
