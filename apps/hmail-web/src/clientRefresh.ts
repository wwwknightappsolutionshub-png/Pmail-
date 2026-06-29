const STORAGE_KEY = "pmail_client_refresh_at";

async function clearBrowserCaches(): Promise<void> {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

export async function syncPmailClientRefresh(): Promise<void> {
  try {
    const response = await fetch("/api/public/pmail-client-refresh", { cache: "no-store" });
    if (!response.ok) return;

    const payload = (await response.json()) as { refreshAt?: string };
    const refreshAt = payload.refreshAt?.trim();
    if (!refreshAt) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, refreshAt);
      return;
    }

    if (stored === refreshAt) return;

    await clearBrowserCaches();
    localStorage.setItem(STORAGE_KEY, refreshAt);
    window.location.reload();
  } catch {
    // Non-blocking boot step.
  }
}
