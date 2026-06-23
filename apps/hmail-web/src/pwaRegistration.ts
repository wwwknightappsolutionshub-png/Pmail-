import { registerSW } from "virtual:pwa-register";

let refreshApp: ((reloadPage?: boolean) => Promise<void>) | null = null;
let notifyUpdate: (() => void) | null = null;

export function setPwaUpdateNotifier(notifier: () => void) {
  notifyUpdate = notifier;
}

export function initPwaRegistration() {
  refreshApp = registerSW({
    immediate: true,
    onNeedRefresh() {
      notifyUpdate?.();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const syncMail = () => {
        if (document.visibilityState === "visible") {
          void fetch("/api/pwa/mail-sync/trigger", { method: "POST", credentials: "include" });
        }
      };
      window.setInterval(syncMail, 2 * 60 * 1000);
      registration.addEventListener("updatefound", () => syncMail());
    },
  });
}

export async function applyPwaUpdate(reloadPage = true) {
  await refreshApp?.(reloadPage);
}
