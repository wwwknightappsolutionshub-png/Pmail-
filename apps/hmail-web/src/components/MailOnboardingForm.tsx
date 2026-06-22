import { FormEvent, useState } from "react";
import { api } from "../api/client";
import "./MailOnboardingPage.css";

const PROVIDER_PRESETS: Record<string, { label: string; imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; smtpSecure: boolean }> = {
  microsoft: {
    label: "Microsoft 365 / Outlook",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  google: {
    label: "Google Workspace / Gmail",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  hostinger: {
    label: "Hostinger / generic",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpSecure: true,
  },
};

type Props = {
  tenantSlug: string;
  tenantName: string;
  onComplete: () => void;
};

export function MailOnboardingForm({ tenantSlug, tenantName, onComplete }: Props) {
  const [preset, setPreset] = useState("microsoft");
  const [imapHost, setImapHost] = useState(PROVIDER_PRESETS.microsoft.imapHost);
  const [imapPort, setImapPort] = useState(PROVIDER_PRESETS.microsoft.imapPort);
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState(PROVIDER_PRESETS.microsoft.smtpHost);
  const [smtpPort, setSmtpPort] = useState(PROVIDER_PRESETS.microsoft.smtpPort);
  const [smtpSecure, setSmtpSecure] = useState(PROVIDER_PRESETS.microsoft.smtpSecure);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function applyPreset(key: string) {
    setPreset(key);
    const p = PROVIDER_PRESETS[key];
    if (!p) return;
    setImapHost(p.imapHost);
    setImapPort(p.imapPort);
    setImapSecure(true);
    setSmtpHost(p.smtpHost);
    setSmtpPort(p.smtpPort);
    setSmtpSecure(p.smtpSecure);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.completeMailOnboarding(tenantSlug, {
        imapHost,
        imapPort,
        imapSecure,
        smtpHost,
        smtpPort,
        smtpSecure,
        testEmail,
        testPassword,
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mail-onboarding">
      <h2>Connect your mail provider</h2>
      <p className="mail-onboarding-lead">
        Before {tenantName} can use PMail+ and add-ons, connect the IMAP/SMTP settings from your existing provider
        (Microsoft 365, Google, Hostinger, etc.).
      </p>

      <label className="mail-onboarding-field">
        Provider preset
        <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
          {Object.entries(PROVIDER_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <form className="mail-onboarding-form" onSubmit={(e) => void handleSubmit(e)}>
        <div className="mail-onboarding-grid">
          <label>
            IMAP host
            <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} required />
          </label>
          <label>
            IMAP port
            <input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} required />
          </label>
          <label>
            SMTP host
            <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required />
          </label>
          <label>
            SMTP port
            <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} required />
          </label>
        </div>
        <label className="mail-onboarding-check">
          <input type="checkbox" checked={imapSecure} onChange={(e) => setImapSecure(e.target.checked)} />
          IMAP SSL/TLS
        </label>
        <label className="mail-onboarding-check">
          <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
          SMTP SSL/TLS
        </label>

        <h3>Verify with a mailbox</h3>
        <p className="mail-onboarding-note">Use an app password if your provider requires it.</p>
        <label>
          Mailbox email
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} required />
        </label>
        <label>
          Mailbox password
          <input type="password" value={testPassword} onChange={(e) => setTestPassword(e.target.value)} required />
        </label>

        {error ? <p className="mail-onboarding-error">{error}</p> : null}
        <button type="submit" className="mail-onboarding-submit" disabled={submitting}>
          {submitting ? "Testing connection…" : "Save & verify provider"}
        </button>
      </form>
    </div>
  );
}
