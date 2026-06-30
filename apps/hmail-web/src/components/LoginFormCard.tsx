import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { formatMailConfigSummary, inferProviderPresetFromEmail } from "../constants/mailProviders";
import { LoginProviderSelectToast } from "./LoginProviderSelectToast";
import { GmailConnectWizard } from "./GmailConnectWizard";
import { ProviderPresetPicker } from "./ProviderPresetPicker";
import type { useLoginForm } from "../hooks/useLoginForm";
import "./ProviderPresetPicker.css";

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
  suggestedTenantSlug,
  greetingName,
  preflightLoading,
  loginError,
  showProviderSelectToast,
  setShowProviderSelectToast,
  submitting,
  onSubmit,
  loadError = "",
  formId = "pmail-login-form",
  className = "",
  onRequestWorkspaceAccess,
}: LoginFormCardProps) {
  const [showPassword, setShowPassword] = useState(false);
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
              ? "For your first sign-in, confirm your personal or organizational mail provider. We automatically apply recommended settings from your email domain where supported, then authenticate with your mailbox credentials."
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
              <Sparkles className="login-prospect-cta__icon" size={18} strokeWidth={2.25} aria-hidden="true" />
              <span className="login-prospect-cta__label">Request workspace access without connecting mail</span>
            </button>
          </section>
        ) : null}

        {onRequestWorkspaceAccess ? <hr className="login-form-divider" aria-hidden="true" /> : null}

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
                  placeholder="e.g. mail.yourdomain.com or srv04.hostnethub.com"
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
                  placeholder="e.g. mail.yourdomain.com or srv04.hostnethub.com"
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

        {showProviderSetup ? <hr className="login-form-divider" aria-hidden="true" /> : null}

        <section className="login-form-section login-form-section--credentials" aria-label="Mailbox credentials">
          <label>
            Your Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Type in your email id"
              required
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <span className="login-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type in your password / app password"
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
            Use your current mail provider password not a new password or app password if you are using gmail and others
          </p>
        </section>

        <hr className="login-form-divider" aria-hidden="true" />

        <section className="login-form-section login-form-section--actions" aria-label="Sign in">
          {loadError || loginError ? <div className="login-error">{loginError || loadError}</div> : null}

          <button type="submit" disabled={submitting || preflightLoading} className="login-submit">
            {submitting ? "Authenticating…" : isTesterRoute ? "Sign in to tester workspace" : "Sign in to mailbox"}
          </button>
        </section>
      </form>
    </div>
  );
}
