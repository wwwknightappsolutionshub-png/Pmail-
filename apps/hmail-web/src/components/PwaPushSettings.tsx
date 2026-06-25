import { useEffect, useState } from "react";
import { api } from "../api/client";
import { subscribeMailPush, unsubscribeMailPush } from "../hooks/useAutoMailPush";
import "./PwaPushSettings.css";

export function PwaPushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    void (async () => {
      const [policy, registration] = await Promise.all([
        api.pwaPushPolicy(),
        navigator.serviceWorker.ready,
      ]);
      const existing = await registration.pushManager.getSubscription();
      setPlatformEnabled(policy.platformMailPushEnabled);
      setEnabled(Boolean(existing) && policy.mailPushEnabled);
    })();
  }, []);

  const enablePush = async () => {
    setError("");
    try {
      await subscribeMailPush();
      await api.updateMailPushPreference(true);
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enable push notifications");
    }
  };

  const disablePush = async () => {
    setError("");
    try {
      await unsubscribeMailPush();
      await api.updateMailPushPreference(false);
      setEnabled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to disable push notifications");
    }
  };

  if (!("PushManager" in window)) return null;

  return (
    <section className="pwa-push-settings" aria-labelledby="pwa-push-title">
      <header className="pwa-push-settings-head">
        <h3 id="pwa-push-title">Mail push notifications</h3>
        <p>Get notified on this device when new mail arrives in PMail+.</p>
      </header>
      {!platformEnabled ? (
        <p className="pwa-push-settings-note">Mail push is currently disabled by your platform administrator.</p>
      ) : (
        <div className="pwa-push-settings-row">
          <span className="brand-settings-toggle-label">{enabled ? "Push enabled on this device" : "Push is off"}</span>
          <button
            type="button"
            className={`pwa-push-settings-btn${enabled ? " pwa-push-settings-btn--off" : ""}`}
            onClick={() => void (enabled ? disablePush() : enablePush())}
          >
            {enabled ? "Disable mail push" : "Enable mail push"}
          </button>
        </div>
      )}
      {error ? <p className="pwa-push-settings-error">{error}</p> : null}
    </section>
  );
}
