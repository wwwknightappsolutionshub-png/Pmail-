import { HMailLogo } from "./HMailLogo";
import type { TenantBranding } from "../types/mail";

type LoginBrandPanelProps = {
  branding: TenantBranding;
};

export function LoginBrandPanel({ branding }: LoginBrandPanelProps) {
  return (
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
  );
}
