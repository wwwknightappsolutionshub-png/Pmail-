import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { TenantBranding } from "../types/mail";
import { DEFAULT_TENANT_SLUG, PMAIL_TESTER_TENANT_SLUG } from "../constants/tenant";
import {
  defaultMailConfig,
  formatMailConfigSummary,
  resolveMailConfigFromPreset,
  type MailConfigValues,
  type MailProviderPresetKey,
} from "../constants/mailProviders";
import { ProviderPresetPicker } from "../components/ProviderPresetPicker";
import { HMailLogo } from "../components/HMailLogo";
import { PmailLoadingScreen } from "../components/PmailLoadingScreen";
import "../components/ProviderPresetPicker.css";
import "./LoginPage.css";

const defaultBranding: TenantBranding = {
  productName: "PMail+",
  logoUrl: null,
  primaryColor: "#0d4f6c",
  accentColor: "#0d9488",
  backgroundColor: "#0f2744",
  loginTagline: "Secure cloud mail powered by Prohost Cloud",
};

const createAccountUrl = `${import.meta.env.VITE_HOSTNET_WEB_URL ?? "http://localhost:5174"}#register`;

const REFERRAL_REF_STORAGE_KEY = "pmail_referral_ref";

export function LoginPage() {
  const { tenantSlug: tenantSlugParam } = useParams();
  const [searchParams] = useSearchParams();
  const tenantSlug = tenantSlugParam?.trim().toLowerCase() || DEFAULT_TENANT_SLUG;
  const isTesterRoute = tenantSlug === PMAIL_TESTER_TENANT_SLUG;
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [email, setEmail] = useState(isTesterRoute ? "pmailtester@gmail.com" : "");
  const [password, setPassword] = useState("");
  const [mailConfig, setMailConfig] = useState<MailConfigValues>(() => defaultMailConfig());
  const [needsProviderSetup, setNeedsProviderSetup] = useState<boolean | null>(isTesterRoute ? false : null);
  const [providerPresetTouched, setProviderPresetTouched] = useState(false);
  const [testerBypass, setTesterBypass] = useState(isTesterRoute);
  const [suggestedTenantSlug, setSuggestedTenantSlug] = useState<string | null>(null);
  const [greetingName, setGreetingName] = useState<string | null>(isTesterRoute ? "PMail Tester" : null);
  const [preflightLoading, setPreflightLoading] = useState(false);
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

  useEffect(() => {
    const ref = searchParams.get("ref")?.trim();
    if (ref?.includes("@")) {
      sessionStorage.setItem(REFERRAL_REF_STORAGE_KEY, ref);
    }
  }, [searchParams]);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (isTesterRoute) {
      setNeedsProviderSetup(false);
      setTesterBypass(true);
      setSuggestedTenantSlug(null);
      return;
    }

    if (!normalized.includes("@")) {
      setNeedsProviderSetup(null);
      setTesterBypass(false);
      setSuggestedTenantSlug(null);
      setGreetingName(null);
      return;
    }

    let cancelled = false;
    setPreflightLoading(true);
    api
      .loginPreflight(tenantSlug, normalized)
      .then((result) => {
        if (!cancelled) {
          setNeedsProviderSetup(result.needsProviderSetup);
          setTesterBypass(Boolean(result.testerBypass));
          setSuggestedTenantSlug(result.suggestedTenantSlug ?? null);
          setGreetingName(result.displayName);
          if (result.needsProviderSetup && result.suggestedMailConfig && !providerPresetTouched) {
            setMailConfig({
              providerPreset: result.suggestedMailConfig.providerPreset as MailProviderPresetKey,
              imapHost: result.suggestedMailConfig.imapHost,
              imapPort: result.suggestedMailConfig.imapPort,
              imapSecure: result.suggestedMailConfig.imapSecure,
              smtpHost: result.suggestedMailConfig.smtpHost,
              smtpPort: result.suggestedMailConfig.smtpPort,
              smtpSecure: result.suggestedMailConfig.smtpSecure,
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeedsProviderSetup(true);
          setTesterBypass(false);
          setSuggestedTenantSlug(null);
          setGreetingName(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [email, tenantSlug, isTesterRoute, providerPresetTouched]);

  if (user) return <Navigate to="/" replace />;

  const applyPreset = (key: MailProviderPresetKey) => {
    setProviderPresetTouched(true);
    setMailConfig((current) =>
      resolveMailConfigFromPreset(key, key === "custom" ? current : undefined),
    );
  };

  const showProviderSetup = !isTesterRoute && !testerBypass && needsProviderSetup !== false;
  const showCustomFields = mailConfig.providerPreset === "custom";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmitting(true);
    try {
      const referrerEmail =
        sessionStorage.getItem(REFERRAL_REF_STORAGE_KEY) ?? searchParams.get("ref") ?? undefined;
      const result = isTesterRoute
        ? await api.testerLogin({ email, password })
        : await api.login({
            tenantSlug,
            email,
            password,
            ...(showProviderSetup ? mailConfig : {}),
            ...(referrerEmail?.includes("@") ? { referrerEmail } : {}),
          });
      sessionStorage.setItem("pmail_tenant_slug", isTesterRoute ? PMAIL_TESTER_TENANT_SLUG : tenantSlug);
      if (referrerEmail) sessionStorage.removeItem(REFERRAL_REF_STORAGE_KEY);
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
                Professional cloud mail that unifies your inbox, workspace, and business tools
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
                Templates, tracked correspondence, and client-ready workflows
              </li>
            </ul>

            <div className="login-trust-note">
              <strong>Built for teams that need secure, accountable mail</strong>
              <p>Authorized personnel only. Sessions are encrypted and activity is auditable.</p>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-card">
            <div className="login-form-header">
              <p className="login-welcome">Welcome {greetingName ?? "Guest"}</p>
              <h2 className="login-signin-title">Sign in</h2>
              <p>
                {isTesterRoute
                  ? "Demo workspace login — no mail provider setup required. Use the seeded tester credentials to explore all paid add-ons."
                  : showProviderSetup
                  ? "Because this is your first time here, select your mail provider (we auto-detect from your email when possible), then sign in with your mailbox password."
                  : "Access your firm mailbox and immigration add-ons"}
              </p>
            </div>

            <form onSubmit={onSubmit} className="login-form">
              {suggestedTenantSlug ? (
                <div className="login-error" role="status">
                  This is the PMail+ tester account.{" "}
                  <Link to={`/login/${suggestedTenantSlug}`}>Sign in on the tester workspace</Link> instead.
                </div>
              ) : null}

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

              {showProviderSetup ? (
                <div className="login-provider-section">
                  <span className="login-provider-label">Mail provider</span>
                  <ProviderPresetPicker
                    value={mailConfig.providerPreset}
                    onChange={applyPreset}
                    idPrefix="login-provider"
                  />
                  <p className="login-provider-summary">{formatMailConfigSummary(mailConfig)}</p>
                  {preflightLoading ? (
                    <p className="login-provider-hint">Checking mailbox setup…</p>
                  ) : null}
                </div>
              ) : null}

              {showProviderSetup && showCustomFields ? (
                <div className="mail-onboarding-custom-grid">
                  <label>
                    IMAP host
                    <input
                      value={mailConfig.imapHost}
                      onChange={(e) => setMailConfig({ ...mailConfig, imapHost: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    IMAP port
                    <input
                      type="number"
                      value={mailConfig.imapPort}
                      onChange={(e) => setMailConfig({ ...mailConfig, imapPort: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label>
                    SMTP host
                    <input
                      value={mailConfig.smtpHost}
                      onChange={(e) => setMailConfig({ ...mailConfig, smtpHost: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    SMTP port
                    <input
                      type="number"
                      value={mailConfig.smtpPort}
                      onChange={(e) => setMailConfig({ ...mailConfig, smtpPort: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label className="login-check-row">
                    <input
                      type="checkbox"
                      checked={mailConfig.imapSecure}
                      onChange={(e) => setMailConfig({ ...mailConfig, imapSecure: e.target.checked })}
                    />
                    IMAP SSL/TLS
                  </label>
                  <label className="login-check-row">
                    <input
                      type="checkbox"
                      checked={mailConfig.smtpSecure}
                      onChange={(e) => setMailConfig({ ...mailConfig, smtpSecure: e.target.checked })}
                    />
                    SMTP SSL/TLS
                  </label>
                </div>
              ) : null}

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

              {showProviderSetup ? (
                <p className="login-provider-hint">Use an app password if your provider requires it.</p>
              ) : null}

              {loadError || loginError ? (
                <div className="login-error">{loginError || loadError}</div>
              ) : null}

              <button type="submit" disabled={submitting || preflightLoading} className="login-submit">
                {submitting ? "Authenticating…" : isTesterRoute ? "Sign in to tester workspace" : "Sign in to mailbox"}
              </button>

              <a className="login-create-account" href={createAccountUrl}>
                New Here - Create Account
              </a>
            </form>
          </div>
        </section>
      </main>
      {submitting ? (
        <PmailLoadingScreen
          productName={branding.productName}
          subtitle="Signing you in…"
          className="pmail-loading-screen--overlay"
        />
      ) : null}
    </div>
  );
}
