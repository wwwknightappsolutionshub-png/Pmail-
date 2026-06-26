import { useEffect, useState } from "react";
import { api } from "../api/client";
import { subscribeMailPush, unsubscribeMailPush } from "../hooks/useAutoMailPush";
import "./PwaPushSettings.css";

export function PwaPushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [platformEnabled, setPlatformEnabled] = useState(true);
  const [vapidConfigured, setVapidConfigured] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    void (async () => {
      try {
        const [policy, registration] = await Promise.all([
          api.pwaPushPolicy(),
          navigator.serviceWorker.ready,
        ]);
        const existing = await registration.pushManager.getSubscription();
        setPlatformEnabled(policy.platformMailPushEnabled);
        setVapidConfigured(policy.vapidConfigured);
        setEnabled(Boolean(existing) && policy.mailPushEnabled);
      } catch {
        setVapidConfigured(false);
      }
    })();
  }, []);

  const enablePush = async () => {
    setError("");
    if (!vapidConfigured) {
      setError(
        "Push is not configured on the server yet. Ask your administrator to set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, then restart the API.",
      );
      return;
    }

    try {
      await api.updateMailPushPreference(true);
      await subscribeMailPush();
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
      {!vapidConfigured ? (
        <p className="pwa-push-settings-note">
          Push is not configured on this server. Your administrator must add VAPID keys to the API environment and
          restart the mail service.
        </p>
      ) : null}
      {!platformEnabled ? (
        <p className="pwa-push-settings-note">Mail push is currently disabled by your platform administrator.</p>
      ) : (
        <div className="pwa-push-settings-row">
          <span className="brand-settings-toggle-label">{enabled ? "Push enabled on this device" : "Push is off"}</span>
          <button
            type="button"
            className={`pwa-push-settings-btn${enabled ? " pwa-push-settings-btn--off" : ""}`}
            disabled={!vapidConfigured || !platformEnabled}
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
