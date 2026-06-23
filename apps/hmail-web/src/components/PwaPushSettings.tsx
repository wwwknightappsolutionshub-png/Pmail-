import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./PwaPushSettings.css";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function PwaPushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setEnabled(Boolean(existing));
    });
  }, []);

  const enablePush = async () => {
    setError("");
    try {
      const { publicKey } = await api.pwaVapidPublicKey();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      await api.savePwaPushSubscription({
        endpoint: json.endpoint ?? subscription.endpoint,
        keys: {
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
        },
      });
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enable push notifications");
    }
  };

  const disablePush = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.removePwaPushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setEnabled(false);
  };

  if (!("PushManager" in window)) return null;

  return (
    <section className="pwa-push-settings" aria-labelledby="pwa-push-title">
      <header className="pwa-push-settings-head">
        <h3 id="pwa-push-title">Mail push notifications</h3>
        <p>Get notified on this device when new mail arrives in PMail+.</p>
      </header>
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
      {error ? <p className="pwa-push-settings-error">{error}</p> : null}
    </section>
  );
}
