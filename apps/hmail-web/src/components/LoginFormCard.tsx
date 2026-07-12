import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { formatMailConfigSummary, isHostingerForcedEmailDomain } from "../constants/mailProviders";
import { LoginProviderCorrector } from "./LoginProviderCorrector";
import { LoginAuthToast } from "./LoginAuthToast";
import { GmailAppPasswordGuideToast } from "./GmailAppPasswordGuideToast";
import { GmailConnectWizard } from "./GmailConnectWizard";
import type { useLoginForm } from "../hooks/useLoginForm";

type LoginFormState = ReturnType<typeof useLoginForm>;

type LoginFormCardProps = LoginFormState & {
  loadError?: string;
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
  detectedProviderLabel,
  suggestedTenantSlug,
  greetingName,
  preflightLoading,
  loginError,
  setLoginError,
  showProviderCorrector,
  setShowProviderCorrector,
  gmailGuideNotice,
  setGmailGuideNotice,
  requestGmailAppPasswordGuideOnBlur,
  submitting,
  onSubmit,
  loadError = "",
  formId = "pmail-login-form",
  className = "",
  onRequestWorkspaceAccess,
}: LoginFormCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isGoogleProvider = mailConfig.providerPreset === "google";
  const showProviderSummary = mailConfig.providerPreset === "custom" || showCustomFields;
  const hostingerForced = isHostingerForcedEmailDomain(email);
  const authToastMessage = loginError;
  const showAuthToast = Boolean(authToastMessage);
  const authToastTitle = /offline|reach|connection|network/i.test(authToastMessage)
    ? "Seems you are offline"
    : /password|app password|sign-in failed|invalid email|gmail/i.test(authToastMessage)
      ? "Sign-in didn’t work"
      : "Something went wrong";

  return (
    <div className={`login-form-card${className ? ` ${className}` : ""}`}>
      {showProviderCorrector ? (
        <LoginProviderCorrector
          value={mailConfig.providerPreset}
          onSelect={applyPreset}
          onDismiss={() => setShowProviderCorrector(false)}
        />
      ) : null}
      {showAuthToast ? (
        <LoginAuthToast
          title={authToastTitle}
          message={authToastMessage}
          onDismiss={() => setLoginError("")}
        />
      ) : null}
      {gmailGuideNotice ? (
        <GmailAppPasswordGuideToast
          onOpenGmail={() => {
            window.open("https://mail.google.com/", "_blank", "noopener,noreferrer");
          }}
          onDismiss={() => setGmailGuideNotice(false)}
        />
      ) : null}
      <div className="login-form-header">
        <p className="login-welcome">Welcome {greetingName ?? "Guest"}</p>
        <h2 className="login-signin-title">Sign in</h2>
        <p>
          {isTesterRoute
            ? "Demo workspace login — no mail provider setup required. Use the seeded tester credentials to explore all paid add-ons."
            : showProviderSetup
              ? "Sign in with your existing mailbox to access workspace tools and add-ons."
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

        <section className="login-form-section login-form-section--credentials" aria-label="Mailbox credentials">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => void requestGmailAppPasswordGuideOnBlur()}
              placeholder="Type in your email id"
              required
              autoComplete="username"
            />
          </label>
        </section>

        {showProviderSetup ? (
          <section className="login-form-section login-form-section--provider" aria-label="Mail provider">
            <div className="login-provider-section">
              <span className="login-provider-label">Detected provider</span>
              <p className="login-provider-detected" role="status">
                Detected: <strong>{detectedProviderLabel}</strong>
              </p>
              {showProviderSummary ? (
                <p className="login-provider-summary">{formatMailConfigSummary(mailConfig)}</p>
              ) : null}
              {preflightLoading ? <p className="login-provider-hint">Checking mailbox setup…</p> : null}
              {!hostingerForced ? (
                <button
                  type="button"
                  className="login-provider-correct-link"
                  onClick={() => setShowProviderCorrector(true)}
                >
                  Wrong provider? Tell us who hosts your email
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {showProviderSetup && showCustomFields ? (
          <section className="login-form-section login-form-section--server" aria-label="Custom mail server settings">
            <h3 className="login-custom-server-heading">Manual mail client settings</h3>
            <p className="login-provider-hint login-custom-server-intro">
              Copy the incoming and outgoing server details from your hosting panel (cPanel, Hostinger, GoDaddy, etc.).
              Many providers use a hostname like <strong>mail.yourdomain.com</strong> or a shared server such as{" "}
              <strong>srv04.hostnethub.com</strong>.
            </p>
            <div className="mail-onboarding-custom-grid">
              <label>
                Incoming server (IMAP)
                <input
                  value={mailConfig.imapHost}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapHost: e.target.value })}
                  placeholder="Type in your hostname"
                  required
                  autoComplete="off"
                />
              </label>
              <label>
                IMAP port
                <input
                  type="number"
                  value={mailConfig.imapPort}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapPort: Number(e.target.value) })}
                  placeholder="993"
                  required
                />
              </label>
              <label>
                Outgoing server (SMTP)
                <input
                  value={mailConfig.smtpHost}
                  onChange={(e) => setMailConfig({ ...mailConfig, smtpHost: e.target.value })}
                  placeholder="Type in your hostname"
                  required
                  autoComplete="off"
                />
              </label>
              <label>
                SMTP port
                <input
                  type="number"
                  value={mailConfig.smtpPort}
                  onChange={(e) => setMailConfig({ ...mailConfig, smtpPort: Number(e.target.value) })}
                  placeholder="465"
                  required
                />
              </label>
              <label className="login-check-row">
                <input
                  type="checkbox"
                  checked={mailConfig.imapSecure}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapSecure: e.target.checked })}
                />
                Incoming SSL/TLS (recommended — port 993)
              </label>
              <label className="login-check-row">
                <input
                  type="checkbox"
                  checked={mailConfig.smtpSecure}
                  onChange={(e) => setMailConfig({ ...mailConfig, smtpSecure: e.target.checked })}
                />
                Outgoing SSL/TLS (recommended — port 465)
              </label>
            </div>
            <p className="login-provider-hint login-custom-server-ports">
              Common secure ports: IMAP <strong>993</strong>, SMTP <strong>465</strong>. Non-SSL setups often use IMAP{" "}
              <strong>143</strong> and SMTP <strong>25</strong> or <strong>587</strong>.
            </p>
          </section>
        ) : null}

        <section className="login-form-section login-form-section--credentials" aria-label="Mailbox password">
          <label>
            {isGoogleProvider ? "Google App Password (16 characters)" : "Password"}
            <span className="login-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  isGoogleProvider
                    ? "Paste your 16-character Google App Password"
                    : "Type in your mail provider password"
                }
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </label>

          <p className="login-provider-hint">
            {isGoogleProvider
              ? "Use the special password for PMail+ from Google — not your normal Gmail password."
              : "Use the same password you use to sign in to your mail provider."}
          </p>
        </section>

        <hr className="login-form-divider" aria-hidden="true" />

        <section className="login-form-section login-form-section--actions" aria-label="Sign in">
          {loadError ? <div className="login-error">{loadError}</div> : null}

          <button type="submit" disabled={submitting || preflightLoading} className="login-submit">
            {submitting ? "Authenticating…" : isTesterRoute ? "Sign in to tester workspace" : "Sign in to mailbox"}
          </button>
        </section>

        {showProviderSetup && isGoogleProvider ? (
          <section className="login-form-section login-form-section--gmail-help" aria-label="Gmail setup help">
            <GmailConnectWizard key={mailConfig.providerPreset ?? "google"} />
          </section>
        ) : null}

        {onRequestWorkspaceAccess ? (
          <>
            <hr className="login-form-divider" aria-hidden="true" />
            <section className="login-form-section login-form-section--prospect-footer" aria-label="Workspace access">
              <p className="login-prospect-footer">
                Not ready to connect mail?{" "}
                <button type="button" className="login-prospect-link" onClick={onRequestWorkspaceAccess}>
                  Request workspace access without connecting mail
                </button>
              </p>
            </section>
          </>
        ) : null}
      </form>
    </div>
  );
}
