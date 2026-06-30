import { FormEvent, useState } from "react";
import { api, ApiError } from "../api/client";
import { readReferralRef } from "../utils/referralStorage";
import "./ProspectAccessForm.css";

type ProspectAccessFormProps = {
  tenantSlug: string;
  productName?: string;
  onBackToSignIn?: () => void;
  className?: string;
};

export function ProspectAccessForm({
  tenantSlug,
  productName = "PMail+",
  onBackToSignIn,
  className = "",
}: ProspectAccessFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const referrerEmail = readReferralRef(null);
      await api.registerPmailProspect({
        tenantSlug,
        fullName,
        email,
        company: company.trim() || undefined,
        referrerEmail,
        consentPrivacy,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your request");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`login-form-card prospect-access-card${className ? ` ${className}` : ""}`}>
        <h2 className="prospect-access-title">Request received</h2>
        <p className="prospect-access-lead">
          Thanks for your interest in {productName}. We&apos;re provisioning your personal demo workspace now —
          check <strong>{email}</strong> in the next minute for your welcome email with sign-in details.
          Your demo access is valid for 72 hours.
        </p>
        {onBackToSignIn ? (
          <button type="button" className="prospect-access-link-btn" onClick={onBackToSignIn}>
            Back to sign in
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`login-form-card prospect-access-card${className ? ` ${className}` : ""}`}>
      <h2 className="prospect-access-title">Request workspace access</h2>
      <p className="prospect-access-lead">
        Not ready to connect your mailbox? It&apos;s okay to just look at what you may be missing.
      </p>

      <form className="prospect-access-form" onSubmit={onSubmit}>
        <label>
          Full name
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>

        <label>
          Work email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Company <span className="prospect-access-optional">(optional)</span>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
          />
        </label>

        <label className="prospect-access-check-row">
          <input
            type="checkbox"
            checked={consentPrivacy}
            onChange={(e) => setConsentPrivacy(e.target.checked)}
            required
          />
          I agree to be contacted about {productName} workspace access.
        </label>

        {error ? <div className="login-error">{error}</div> : null}

        <button type="submit" className="login-submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit request"}
        </button>

        {onBackToSignIn ? (
          <button type="button" className="prospect-access-link-btn" onClick={onBackToSignIn}>
            Back to sign in
          </button>
        ) : null}
      </form>
    </div>
  );
}
