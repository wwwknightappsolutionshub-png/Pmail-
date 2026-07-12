import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "./PwaShell.css";

export function PwaOfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="pwa-shell-banner pwa-shell-banner--offline" role="status" aria-live="polite">
      <div className="pwa-shell-banner-copy">
        <strong>Seems you are offline</strong>
        <span>Check your connection. Mail sync will resume when you’re back online.</span>
      </div>
    </div>
  );
}
