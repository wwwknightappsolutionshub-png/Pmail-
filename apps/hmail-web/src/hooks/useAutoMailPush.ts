import { useEffect, useRef } from "react";
import { api } from "../api/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function subscribeMailPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

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
  return true;
}

export async function unsubscribeMailPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await api.removePwaPushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}

export function useAutoMailPush(userId: string | undefined) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!userId || attemptedRef.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    attemptedRef.current = true;

    void (async () => {
      try {
        const policy = await api.pwaPushPolicy();
        if (!policy.autoSubscribe || !policy.vapidConfigured) return;

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) return;

        if (typeof Notification !== "undefined" && Notification.permission === "denied") {
          return;
        }

        await subscribeMailPush();
      } catch {
        // Browser may block permission prompts without a user gesture.
      }
    })();
  }, [userId]);
}
