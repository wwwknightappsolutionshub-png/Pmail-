import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";
import "./JobHunterPanel.css";

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

type JobHunterSettings = NonNullable<Awaited<ReturnType<typeof api.getJobHunterSettings>>["settings"]>;

type JobHunterPanelProps = {
  onSettingsSaved?: () => void;
  shell?: "career" | "mail";
};

type SettingsBodyProps = {
  settings: JobHunterSettings;
  saving: boolean;
  notice: string;
  actionError: string;
  consentOpen: boolean;
  accepting: boolean;
  onAcceptConsent: () => void;
  onSaveSettings: (patch: Parameters<typeof api.updateJobHunterSettings>[0]) => void;
  onDeleteInferences: () => void;
  shell: "career" | "mail";
};

function JobHunterConsentModal({
  open,
  accepting,
  actionError,
  onAccept,
}: {
  open: boolean;
  accepting: boolean;
  actionError: string;
  onAccept: () => void;
}) {
  if (!open) return null;

  return (
    <div className="job-hunter-consent-overlay" role="dialog" aria-modal="true">
      <div className="job-hunter-consent-modal">
        <h2>Job Hunter</h2>
        <p className="job-hunter-consent-lead">Scans enabled inboxes for career-related signals.</p>
        <ul className="job-hunter-consent-points">
          <li>Personal mail on by default; work mail off until you opt in.</li>
          <li>Pause, turn off scanning, or delete stored data anytime.</li>
        </ul>
        <p className="job-hunter-consent-footnote">Nothing is scanned until you continue.</p>
        {actionError ? <p className="career-workspace-error">{actionError}</p> : null}
        <div className="job-hunter-consent-actions">
          <button type="button" className="career-workspace-btn career-workspace-btn--primary" disabled={accepting} onClick={onAccept}>
            {accepting ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobHunterSettingsBody({
  settings,
  saving,
  notice,
  actionError,
  consentOpen,
  accepting,
  onAcceptConsent,
  onSaveSettings,
  onDeleteInferences,
  shell,
}: SettingsBodyProps) {
  const isCareer = shell === "career";
  const sectionClass = isCareer ? "career-jh-settings-card" : "feature-form";
  const hintClass = isCareer ? "career-jh-settings-hint" : "feature-form-hint";
  const toggleClass = isCareer ? "career-jh-settings-toggle" : "job-hunter-toggle";
  const actionBtnClass = isCareer ? "career-workspace-btn career-workspace-btn--secondary" : "mail-toolbar-btn";
  const dangerBtnClass = isCareer ? "career-workspace-btn career-jh-settings-danger-btn" : "mail-toolbar-btn";

  return (
    <>
      <JobHunterConsentModal open={consentOpen} accepting={accepting} actionError={actionError} onAccept={onAcceptConsent} />

      {notice ? (
        <p className={isCareer ? "career-jh-settings-notice" : "job-hunter-notice"} role="status">
          {notice}
        </p>
      ) : null}
      {actionError && !consentOpen ? (
        <p className={isCareer ? "career-workspace-error" : "mail-view-error"}>{actionError}</p>
      ) : null}

      <div className={isCareer ? "career-jh-settings-grid" : undefined}>
        <section className={sectionClass}>
          <h3>Region</h3>
          <p className={hintClass}>Templates, job boards, and scanner hints use this market.</p>
          <select
            className={isCareer ? "career-jh-settings-select" : undefined}
            value={settings.regionCode}
            disabled={saving || settings.needsTierBDisclosure}
            onChange={(e) => void onSaveSettings({ regionCode: e.target.value as "US" | "CA" | "UK" | "ME" | "INTL" })}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="UK">United Kingdom</option>
            <option value="ME">Middle East</option>
            <option value="INTL">International</option>
          </select>
        </section>

        <section className={sectionClass}>
          <h3>Master switch</h3>
          <p className={hintClass}>Turn off to stop all Job Hunter analysis across every inbox.</p>
          <label className={toggleClass}>
            <input
              type="checkbox"
              checked={settings.enabled}
              disabled={saving || settings.needsTierBDisclosure}
              onChange={(e) => void onSaveSettings({ enabled: e.target.checked })}
            />
            <span>Allow Job Hunter analysis on enabled inboxes</span>
          </label>
        </section>

        <section className={`${sectionClass}${isCareer ? " career-jh-settings-card--wide" : ""}`}>
          <h3>Pause & override</h3>
          <p className={hintClass}>
            {settings.paused && settings.pausedUntil
              ? `Paused until ${new Date(settings.pausedUntil).toLocaleDateString()}.`
              : "Not paused."}
          </p>
          <div className="job-hunter-inline-actions">
            <button
              type="button"
              className={actionBtnClass}
              disabled={saving || settings.needsTierBDisclosure}
              onClick={() => void onSaveSettings({ pause90Days: true })}
            >
              Pause 90 days
            </button>
            <button
              type="button"
              className={actionBtnClass}
              disabled={saving || settings.needsTierBDisclosure || !settings.paused}
              onClick={() => void onSaveSettings({ clearPause: true })}
            >
              Resume now
            </button>
          </div>
          <label className={toggleClass}>
            <input
              type="checkbox"
              checked={settings.manualJobHuntingOverride}
              disabled={saving || settings.needsTierBDisclosure}
              onChange={(e) => void onSaveSettings({ manualJobHuntingOverride: e.target.checked })}
            />
            <span>I'm job hunting (manual Career nav override)</span>
          </label>
          <p className={hintClass}>
            Career score: {settings.careerScore} / {settings.careerNavScoreThreshold} — Career nav{" "}
            {settings.careerNavUnlocked ? "unlocked" : "hidden until threshold or override"}.
          </p>
        </section>

        <section className={`${sectionClass}${isCareer ? " career-jh-settings-card--wide" : ""}`}>
          <h3>Connected mailboxes</h3>
          <p className={hintClass}>Work domains default off; personal providers default on after Tier B consent.</p>
          <ul className={isCareer ? "career-jh-settings-accounts" : "job-hunter-account-list"}>
            {settings.mailAccounts.map((account) => (
              <li key={account.id}>
                <div>
                  <strong>{account.label ?? account.email}</strong>
                  <span>
                    {account.email} · {account.domainKind}
                  </span>
                </div>
                <label className={toggleClass}>
                  <input
                    type="checkbox"
                    checked={account.scanEnabled}
                    disabled={saving || settings.needsTierBDisclosure}
                    onChange={(e) =>
                      void onSaveSettings({
                        mailAccountScan: [{ mailAccountId: account.id, scanEnabled: e.target.checked }],
                      })
                    }
                  />
                  <span>Scan enabled</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${sectionClass}${isCareer ? " career-jh-settings-card--wide career-jh-settings-card--danger" : ""}`}>
          <h3>Delete inferences</h3>
          <p className={hintClass}>
            Clears stored career score and inference timestamps. Mail scanning stops until new signals arrive (Phase 2+).
          </p>
          <button
            type="button"
            className={dangerBtnClass}
            disabled={saving || settings.needsTierBDisclosure}
            onClick={() => void onDeleteInferences()}
          >
            Delete stored inferences
          </button>
        </section>
      </div>
    </>
  );
}

export function JobHunterPanel({ onSettingsSaved, shell }: JobHunterPanelProps = {}) {
  const location = useLocation();
  const resolvedShell = shell ?? (location.pathname.startsWith("/career") ? "career" : "mail");
  const isCareer = resolvedShell === "career";

  const { data: settings, loading, error, refresh } = useLoad(() => api.getJobHunterSettings().then((r) => r.settings));
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [consentOpen, setConsentOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.needsTierBDisclosure) {
      setConsentOpen(true);
    }
  }, [settings?.needsTierBDisclosure]);

  const acceptConsent = async () => {
    setAccepting(true);
    setActionError("");
    try {
      await api.acceptJobHunterConsent();
      setConsentOpen(false);
      setNotice("Tier B disclosure recorded. Per-inbox defaults applied.");
      await refresh();
      onSettingsSaved?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not record consent");
    } finally {
      setAccepting(false);
    }
  };

  const saveSettings = async (patch: Parameters<typeof api.updateJobHunterSettings>[0]) => {
    setSaving(true);
    setActionError("");
    try {
      await api.updateJobHunterSettings(patch);
      setNotice("Settings saved.");
      await refresh();
      onSettingsSaved?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteInferences = async () => {
    setSaving(true);
    setActionError("");
    try {
      await api.deleteJobHunterInferences();
      setNotice("Stored career inferences cleared.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete inferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={isCareer ? "career-jh-settings-loading" : "mail-view-empty"}>Loading Job Hunter settings…</p>;
  }
  if (error) {
    return <p className={isCareer ? "career-workspace-error" : "mail-view-error"}>{error}</p>;
  }
  if (!settings) return null;

  if (isCareer) {
    return (
      <section className="career-jh-settings">
        <header className="career-jh-settings-header">
          <div>
            <h2>Configure — Privacy & scanning</h2>
            <p>Tier B privacy controls, per-inbox scan flags, and career navigation preferences.</p>
          </div>
          {settings.careerNavUnlocked ? (
            <div className="career-jh-settings-cta">
              <Link className="career-workspace-btn career-workspace-btn--primary" to="/career">
                Open Career workspace
              </Link>
              <p className="career-jh-settings-hint">Track applications, build CVs, scan, and apply from one place.</p>
            </div>
          ) : null}
        </header>

        <JobHunterSettingsBody
          settings={settings}
          saving={saving}
          notice={notice}
          actionError={actionError}
          consentOpen={consentOpen}
          accepting={accepting}
          onAcceptConsent={() => void acceptConsent()}
          onSaveSettings={(patch) => void saveSettings(patch)}
          onDeleteInferences={() => void deleteInferences()}
          shell="career"
        />
      </section>
    );
  }

  return (
    <div className="mail-view-panel job-hunter-panel job-hunter-panel--minimal">
      <header className="mail-view-header">
        <h2>Job Hunter settings</h2>
        <p>Tier B privacy controls, per-inbox scan flags, and career navigation preferences.</p>
        {settings.careerNavUnlocked ? (
          <p className="job-hunter-workspace-cta">
            <Link className="career-workspace-btn" to="/career">
              Open Career workspace
            </Link>
            <span className="feature-form-hint">Track applications, build CVs, scan, and apply from one place.</span>
          </p>
        ) : null}
      </header>

      <JobHunterSettingsBody
        settings={settings}
        saving={saving}
        notice={notice}
        actionError={actionError}
        consentOpen={consentOpen}
        accepting={accepting}
        onAcceptConsent={() => void acceptConsent()}
        onSaveSettings={(patch) => void saveSettings(patch)}
        onDeleteInferences={() => void deleteInferences()}
        shell="mail"
      />
    </div>
  );
}
