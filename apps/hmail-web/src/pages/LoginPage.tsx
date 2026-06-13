import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { TenantBranding } from "../types/mail";
import { DEFAULT_TENANT_SLUG } from "../constants/tenant";
import { HMailLogo } from "../components/HMailLogo";
import "./LoginPage.css";

const defaultBranding: TenantBranding = {
  productName: "PMail+",
  logoUrl: null,
  primaryColor: "#0d4f6c",
  accentColor: "#0d9488",
  backgroundColor: "#0f2744",
  loginTagline: "Secure cloud mail powered by Prohost Cloud",
};

export function LoginPage() {
  const { tenantSlug: paramSlug } = useParams();
  const tenantSlug = paramSlug ?? DEFAULT_TENANT_SLUG;
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadError("");
    api
      .getTenant(tenantSlug)
      .then((tenant) => {
        if (tenant.branding) setBranding(tenant.branding);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setLoadError(
            err.status === 404
              ? `${err.message} — contact your administrator or run npm run db:seed on the server.`
              : err.message,
          );
        } else {
          setLoadError("Cannot reach the mail service. Check that the API is running.");
        }
      });
  }, [tenantSlug]);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmitting(true);
    try {
      const result = await api.login({ tenantSlug, email, password });
      sessionStorage.setItem("pmail_tenant_slug", tenantSlug);
      setUser(result.user);
      navigate("/");
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="login-page"
      style={
        {
          "--brand-primary": branding.primaryColor,
          "--brand-accent": branding.accentColor,
          "--brand-bg": branding.backgroundColor,
        } as React.CSSProperties
      }
    >
      <header className="login-topbar">
        <HMailLogo
          size="sm"
          showWordmark
          productName={branding.productName}
          subtitle="Prohost Cloud"
          className="login-topbar-logo"
        />
      </header>

      <main className="login-layout">
        <section className="login-brand-panel">
          <div className="login-brand-inner">
            <HMailLogo size="xl" className="login-brand-logo" productName={branding.productName} />
            <h1 className="login-headline hmail-wordmark">{branding.productName}</h1>
            <p className="login-tagline">
              {branding.loginTagline || "Secure cloud mail powered by Prohost Cloud"}
            </p>

            <ul className="login-features">
              <li>
                <span className="login-feature-icon" aria-hidden="true">
                  ✓
                </span>
                IRCC-focused inbox tools and add-ons marketplace
              </li>
              <li>
                <span className="login-feature-icon" aria-hidden="true">
                  ✓
                </span>
                Secure IMAP &amp; SMTP connectivity
              </li>
              <li>
                <span className="login-feature-icon" aria-hidden="true">
                  ✓
                </span>
                Case-linked mail, templates, and client workflows
              </li>
            </ul>

            <div className="login-trust-note">
              <strong>Built for RCICs &amp; immigration counsel</strong>
              <p>Authorized personnel only. Sessions are encrypted and activity is auditable.</p>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-card">
            <div className="login-form-header">
              <h2 className="login-signin-title">Sign in</h2>
              <p>Access your firm mailbox and immigration add-ons</p>
            </div>

            <form onSubmit={onSubmit} className="login-form">
              <label>
                Work email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="username"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your mailbox password"
                  required
                  autoComplete="current-password"
                />
              </label>

              {(loadError || loginError) ? (
                <div className="login-error">{loginError || loadError}</div>
              ) : null}

              <button type="submit" disabled={submitting} className="login-submit">
                {submitting ? "Authenticating…" : "Sign in to mailbox"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
