import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_TENANT_SLUG } from "../constants/tenant";
import { LoginBrandPanel } from "../components/LoginBrandPanel";
import { LoginFormCard } from "../components/LoginFormCard";
import { buildWelcomePath, LoginShell, useTenantBranding } from "../components/LoginShell";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import { ProspectAccessForm } from "../components/ProspectAccessForm";
import "../components/ProspectAccessForm.css";
import { useLoginForm } from "../hooks/useLoginForm";
import { hasSeenWelcomeOnboarding } from "../utils/welcomeOnboardingPrefs";

export function LoginPage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const { user } = useAuth();
  const { branding, loadError } = useTenantBranding(tenantSlug);
  const loginForm = useLoginForm(tenantSlug);
  const [accessMode, setAccessMode] = useState<"signin" | "prospect">("signin");

  if (user) return <Navigate to="/" replace />;

  const exploreHref = buildWelcomePath(tenantSlug, {
    replay: hasSeenWelcomeOnboarding(),
  });

  return (
    <LoginShell
      branding={branding}
      leftPanel={<LoginBrandPanel branding={branding} />}
      rightPanel={
        accessMode === "prospect" ? (
          <ProspectAccessForm
            tenantSlug={tenantSlug}
            productName={branding.productName}
            onBackToSignIn={() => setAccessMode("signin")}
          />
        ) : (
          <>
            <LoginFormCard {...loginForm} loadError={loadError} exploreHref={exploreHref} />
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
