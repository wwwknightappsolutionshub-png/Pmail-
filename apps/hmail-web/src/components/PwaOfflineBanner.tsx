import { useOnlineStatus } from "../hooks/useOnlineStatus";
import "./PwaShell.css";

export function PwaOfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div className="pwa-shell-banner pwa-shell-banner--offline" role="status" aria-live="polite">
      <strong>Offline</strong>
      <span>Mail sync will resume when your connection returns.</span>
    </div>
  );
}
