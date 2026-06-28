import { useEffect } from "react";
import { api } from "../api/client";

const HEARTBEAT_INTERVAL_MS = 60_000;

export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      void api.presenceHeartbeat().catch(() => {
        // Heartbeat failures should not interrupt the mail client.
      });
    };

    ping();
    const id = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
