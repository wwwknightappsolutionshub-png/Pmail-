import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminPollSnapshot } from "../../types/site";

const POLL_INTERVAL_MS = 30_000;

export function useAdminPoll(enabled = true) {
  const [snapshot, setSnapshot] = useState<AdminPollSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await api.adminPoll();
        if (!cancelled) {
          setSnapshot(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Poll failed");
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return { snapshot, error, intervalMs: POLL_INTERVAL_MS };
}
