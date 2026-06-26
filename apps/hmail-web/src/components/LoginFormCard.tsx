import { Link } from "react-router-dom";
import { formatMailConfigSummary, inferProviderPresetFromEmail } from "../constants/mailProviders";
import { LoginProviderSelectToast } from "./LoginProviderSelectToast";
import { GmailConnectWizard } from "./GmailConnectWizard";
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
  onRequestWorkspaceAccess?: () => void;
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
  showProviderSelectToast,
  setShowProviderSelectToast,
  submitting,
  onSubmit,
  loadError = "",
  showExploreLink = true,
  exploreHref = "/welcome",
  formId = "pmail-login-form",
  className = "",
  onRequestWorkspaceAccess,
}: LoginFormCardProps) {
  const isGoogleProvider =
    mailConfig.providerPreset === "google" || inferProviderPresetFromEmail(email) === "google";

  return (
    <div className={`login-form-card${className ? ` ${className}` : ""}`}>
      {showProviderSelectToast ? (
        <LoginProviderSelectToast onDismiss={() => setShowProviderSelectToast(false)} />
      ) : null}
      <div className="login-form-header">
        <p className="login-welcome">Welcome {greetingName ?? "Guest"}</p>
        <h2 className="login-signin-title">Sign in</h2>
        <p>
          {isTesterRoute
            ? "Demo workspace login — no mail provider setup required. Use the seeded tester credentials to explore all paid add-ons."
            : showProviderSetup
              ? "For your first sign-in, confirm your organization's mail provider. We apply recommended settings from your email domain where supported, then authenticate with your mailbox credentials."
              : "Connect your existing mailbox to access workspace tools and add-ons."}
        </p>
      </div>

      <hr className="login-form-divider" aria-hidden="true" />

      <form id={formId} onSubmit={onSubmit} className="login-form">
        {suggestedTenantSlug ? (
          <div className="login-error" role="status">
            This is the PMail+ tester account.{" "}
            <Link to={`/login/${suggestedTenantSlug}`}>Sign in on the tester workspace</Link> instead.
          </div>
        ) : null}

        {onRequestWorkspaceAccess ? (
          <section className="login-form-section login-form-section--prospect" aria-label="Workspace access">
            <button type="button" className="login-prospect-cta" onClick={onRequestWorkspaceAccess}>
              Request workspace access without connecting mail
            </button>
          </section>
        ) : null}

        {onRequestWorkspaceAccess ? <hr className="login-form-divider" aria-hidden="true" /> : null}

        <section className="login-form-section login-form-section--credentials" aria-label="Mailbox credentials">
          <label>
            Your Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Input your email id"
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
              placeholder="Type in your active password"
              required
              autoComplete="current-password"
            />
          </label>

          {showProviderSetup && !isGoogleProvider ? (
            <p className="login-provider-hint">Use your current mail provider password not a new password</p>
          ) : null}
        </section>

        {showProviderSetup ? <hr className="login-form-divider" aria-hidden="true" /> : null}

        {showProviderSetup ? (
          <section className="login-form-section login-form-section--provider" aria-label="Mail provider">
            <div className="login-provider-section">
              <span className="login-provider-label">Mail provider</span>
              <ProviderPresetPicker
                value={mailConfig.providerPreset}
                onChange={applyPreset}
                idPrefix="login-provider"
              />
              <p className="login-provider-summary">{formatMailConfigSummary(mailConfig)}</p>
              {isGoogleProvider ? <GmailConnectWizard /> : null}
              {preflightLoading ? <p className="login-provider-hint">Checking mailbox setup…</p> : null}
            </div>
          </section>
        ) : null}

        {showProviderSetup && showCustomFields ? <hr className="login-form-divider" aria-hidden="true" /> : null}

        {showProviderSetup && showCustomFields ? (
          <section className="login-form-section login-form-section--server" aria-label="Server settings">
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
          </section>
        ) : null}

        <hr className="login-form-divider" aria-hidden="true" />

        <section className="login-form-section login-form-section--actions" aria-label="Sign in">
          {loadError || loginError ? <div className="login-error">{loginError || loadError}</div> : null}

          <button type="submit" disabled={submitting || preflightLoading} className="login-submit">
            {submitting ? "Authenticating…" : isTesterRoute ? "Sign in to tester workspace" : "Sign in to mailbox"}
          </button>

          {showExploreLink ? (
            <Link className="login-create-account" to={exploreHref}>
              New here? Explore PMail+
            </Link>
          ) : null}
        </section>
      </form>
    </div>
  );
}
