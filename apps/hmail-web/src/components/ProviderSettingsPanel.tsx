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
import "./ProviderSettingsPanel.css";

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
    <div className="provider-settings mail-view-panel">
      <header className="provider-settings-hero">
        <p className="provider-settings-kicker">Mail connection</p>
        <h2>Provider settings</h2>
        <p>Change your mail service provider or custom IMAP/SMTP connection.</p>
      </header>

      <form className="provider-settings-form" onSubmit={(e) => void onSubmit(e)}>
        <section className="provider-settings-section" aria-label="Mail provider">
          <ProviderPresetPicker value={mailConfig.providerPreset} onChange={applyPreset} idPrefix="settings-provider" />
        </section>

        {mailConfig.providerPreset === "custom" ? (
          <section className="provider-settings-section" aria-labelledby="provider-custom-title">
            <h3 id="provider-custom-title">Custom server</h3>
            <div className="provider-settings-server-grid">
              <label className="provider-settings-field">
                <span>IMAP host</span>
                <input
                  value={mailConfig.imapHost}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapHost: e.target.value })}
                  required
                />
              </label>
              <label className="provider-settings-field">
                <span>IMAP port</span>
                <input
                  type="number"
                  value={mailConfig.imapPort}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapPort: Number(e.target.value) })}
                  required
                />
              </label>
              <label className="provider-settings-field">
                <span>SMTP host</span>
                <input
                  value={mailConfig.smtpHost}
                  onChange={(e) => setMailConfig({ ...mailConfig, smtpHost: e.target.value })}
                  required
                />
              </label>
              <label className="provider-settings-field">
                <span>SMTP port</span>
                <input
                  type="number"
                  value={mailConfig.smtpPort}
                  onChange={(e) => setMailConfig({ ...mailConfig, smtpPort: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className="provider-settings-toggles">
              <label className="provider-settings-check">
                <input
                  type="checkbox"
                  checked={mailConfig.imapSecure}
                  onChange={(e) => setMailConfig({ ...mailConfig, imapSecure: e.target.checked })}
                />
                IMAP SSL/TLS
              </label>
              <label className="provider-settings-check">
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

        <section className="provider-settings-section" aria-labelledby="provider-password-title">
          <label className="provider-settings-field" id="provider-password-title">
            <span>Mailbox password</span>
            <span className="provider-settings-hint">Required to verify connection when saving</span>
            <input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="Enter password to test and save"
              required
              autoComplete="current-password"
            />
          </label>
        </section>

        {error ? <p className="provider-settings-error">{error}</p> : null}
        {status ? <p className="provider-settings-status">{status}</p> : null}

        <button type="submit" className="provider-settings-btn provider-settings-btn--primary" disabled={saving}>
          {saving ? "Saving…" : "Save provider settings"}
        </button>
      </form>
    </div>
  );
}
