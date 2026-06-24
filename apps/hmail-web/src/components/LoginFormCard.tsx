import { Link } from "react-router-dom";
import { formatMailConfigSummary } from "../constants/mailProviders";
import { ProviderPresetPicker } from "./ProviderPresetPicker";
import type { useLoginForm } from "../hooks/useLoginForm";
import "./ProviderPresetPicker.css";

type LoginFormState = ReturnType<typeof useLoginForm>;

type LoginFormCardProps = LoginFormState & {
  loadError?: string;
  showExploreLink?: boolean;
  exploreHref?: string;
  formId?: string;
  className?: string;
};

export function LoginFormCard({
  isTesterRoute,
  email,
  setEmail,
  password,
  setPassword,
  mailConfig,
  setMailConfig,
  applyPreset,
  showProviderSetup,
  showCustomFields,
  suggestedTenantSlug,
  greetingName,
  preflightLoading,
  loginError,
  submitting,
  onSubmit,
  loadError = "",
  showExploreLink = true,
  exploreHref = "/welcome",
  formId = "pmail-login-form",
  className = "",
}: LoginFormCardProps) {
  return (
    <div className={`login-form-card${className ? ` ${className}` : ""}`}>
      <div className="login-form-header">
        <p className="login-welcome">Welcome {greetingName ?? "Guest"}</p>
        <h2 className="login-signin-title">Sign in</h2>
        <p>
          {isTesterRoute
            ? "Demo workspace login — no mail provider setup required. Use the seeded tester credentials to explore all paid add-ons."
            : showProviderSetup
              ? "Because this is your first time here, select your mail provider (we auto-detect from your email when possible), then sign in with your mailbox password."
              : "Connect your existing mailbox to access workspace tools and add-ons."}
        </p>
      </div>

      <form id={formId} onSubmit={onSubmit} className="login-form">
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
            {preflightLoading ? <p className="login-provider-hint">Checking mailbox setup…</p> : null}
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

        {loadError || loginError ? <div className="login-error">{loginError || loadError}</div> : null}

        <button type="submit" disabled={submitting || preflightLoading} className="login-submit">
          {submitting ? "Authenticating…" : isTesterRoute ? "Sign in to tester workspace" : "Sign in to mailbox"}
        </button>

        {showExploreLink ? (
          <Link className="login-create-account" to={exploreHref}>
            New here? Explore PMail+
          </Link>
        ) : null}
      </form>
    </div>
  );
}
