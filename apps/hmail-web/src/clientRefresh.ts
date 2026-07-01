import { applyPwaUpdate } from "./pwaRegistration";

const STORAGE_KEY = "pmail_client_refresh_at";

async function clearIndexedDatabases(): Promise<void> {
  if (!("indexedDB" in window)) return;

  try {
    const databases = await indexedDB.databases?.();
    if (!databases?.length) return;

    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            const name = database.name?.trim();
            if (!name) {
              resolve();
              return;
            }
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
  } catch {
    // Non-blocking cleanup step.
  }
}

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

/**
 * Hard-reset the installed PWA: fetch updates, wipe caches, unregister workers,
 * and clear persisted browser storage before reloading.
 */
export async function hardRefreshPmailClient(): Promise<void> {
  try {
    await fetch("/api/public/pmail-client-refresh", { cache: "no-store" }).catch(() => undefined);
  } catch {
    // Non-blocking preflight.
  }

  try {
    await applyPwaUpdate(false);
  } catch {
    // Login route may load before the service worker is ready.
  }

  await clearBrowserCaches();

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Non-blocking cleanup step.
  }

  await clearIndexedDatabases();

  const url = new URL(window.location.href);
  url.searchParams.set("refresh", String(Date.now()));
  window.location.replace(url.toString());
}
