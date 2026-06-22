import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import {
  defaultMailConfig,
  resolveMailConfigFromPreset,
  type MailConfigValues,
  type MailProviderPresetKey,
} from "../constants/mailProviders";
import { ProviderPresetPicker } from "./ProviderPresetPicker";
import "./ProviderPresetPicker.css";
import "./MailViews.css";

export function ProviderSettingsPanel() {
  const [mailConfig, setMailConfig] = useState<MailConfigValues>(defaultMailConfig());
  const [testPassword, setTestPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .getUserMailConfig()
      .then(({ mail }) => {
        if (mail) {
          setMailConfig({
            providerPreset: mail.providerPreset as MailProviderPresetKey,
            imapHost: mail.imapHost,
            imapPort: mail.imapPort,
            imapSecure: mail.imapSecure,
            smtpHost: mail.smtpHost,
            smtpPort: mail.smtpPort,
            smtpSecure: mail.smtpSecure,
          });
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load provider settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const applyPreset = (key: MailProviderPresetKey) => {
    setMailConfig((current) =>
      resolveMailConfigFromPreset(key, key === "custom" ? current : undefined),
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await api.updateUserMailConfig({
        ...mailConfig,
        testPassword: testPassword || undefined,
      });
      setStatus("Provider settings saved.");
      setTestPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mail-view-empty">Loading provider settings…</p>;

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Provider settings</h2>
        <p>Change your mail service provider or custom IMAP/SMTP connection.</p>
      </header>

      <form className="feature-form" onSubmit={(e) => void onSubmit(e)}>
        <ProviderPresetPicker value={mailConfig.providerPreset} onChange={applyPreset} idPrefix="settings-provider" />

        {mailConfig.providerPreset === "custom" ? (
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
            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={mailConfig.imapSecure}
                onChange={(e) => setMailConfig({ ...mailConfig, imapSecure: e.target.checked })}
              />
              IMAP SSL/TLS
            </label>
            <label className="feature-toggle">
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
          Mailbox password (required to verify connection)
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            placeholder="Enter password to test and save"
            required
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="mail-view-error">{error}</p> : null}
        {status ? <p className="pane-status">{status}</p> : null}

        <button type="submit" className="mail-toolbar-btn" disabled={saving}>
          {saving ? "Saving…" : "Save provider settings"}
        </button>
      </form>
    </div>
  );
}
