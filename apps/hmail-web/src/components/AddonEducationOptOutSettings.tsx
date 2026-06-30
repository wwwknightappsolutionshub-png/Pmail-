import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import "./PwaPushSettings.css";

export function AddonEducationOptOutSettings() {
  const [optOut, setOptOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api
      .educationPreferences()
      .then((res) => setOptOut(res.preferences.optOut))
      .catch(() => setOptOut(false))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.updateEducationPreferences({ optOut: next });
      setOptOut(res.preferences.optOut);
      setMessage(next ? "Education emails turned off" : "Education emails turned on");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update preference");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="pwa-push-settings" aria-labelledby="addon-education-title">
      <div className="pwa-push-settings-head">
        <h3 id="addon-education-title">PMail+ education emails</h3>
        <p>Occasional tips about workspace and industry add-ons. You can turn these off anytime.</p>
      </div>
      <label className="pwa-push-toggle">
        <input
          type="checkbox"
          checked={!optOut}
          disabled={saving}
          onChange={(e) => void toggle(!e.target.checked)}
        />
        <span>{optOut ? "Education emails off" : "Education emails on"}</span>
      </label>
      {error ? <p className="pwa-push-error">{error}</p> : null}
      {message ? <p className="pwa-push-success">{message}</p> : null}
    </section>
  );
}
