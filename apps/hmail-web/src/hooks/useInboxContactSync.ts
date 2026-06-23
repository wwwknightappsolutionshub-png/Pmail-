import { useCallback, useEffect, useRef } from "react";
import { api } from "../api/client";

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

type UseInboxContactSyncOptions = {
  enabled?: boolean;
  onNewContacts?: (addedCount: number) => void;
};

export function useInboxContactSync({ enabled = true, onNewContacts }: UseInboxContactSyncOptions = {}) {
  const initialSyncDone = useRef(false);
  const syncingRef = useRef(false);

  const runSync = useCallback(
    async (force = false) => {
      if (!enabled || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const result = await api.syncInboxContacts({ force });
        if (result.addedCount > 0) {
          onNewContacts?.(result.addedCount);
        }
      } catch {
        // ignore background sync failures
      } finally {
        syncingRef.current = false;
      }
    },
    [enabled, onNewContacts],
  );

  useEffect(() => {
    if (!enabled) return;

    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      void runSync(true);
    }

    const timer = window.setInterval(() => {
      void runSync(false);
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, runSync]);

  return { runSync };
}
