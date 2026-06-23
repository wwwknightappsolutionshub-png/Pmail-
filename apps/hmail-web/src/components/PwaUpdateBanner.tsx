import { useEffect, useState } from "react";
import { applyPwaUpdate, setPwaUpdateNotifier } from "../pwaRegistration";
import "./PwaShell.css";

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPwaUpdateNotifier(() => setVisible(true));
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-shell-banner pwa-shell-banner--update" role="status" aria-live="polite">
      <div className="pwa-shell-banner-copy">
        <strong>Update available</strong>
        <span>A new version of PMail+ is ready.</span>
      </div>
      <button type="button" className="pwa-shell-banner-btn" onClick={() => void applyPwaUpdate(true)}>
        Refresh
      </button>
    </div>
  );
}
