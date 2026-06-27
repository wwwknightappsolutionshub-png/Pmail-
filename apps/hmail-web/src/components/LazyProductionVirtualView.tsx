import { useEffect, useRef, useState, type ReactNode } from "react";
import { PmailLoadingScreen } from "./PmailLoadingScreen";
import { loadDeferredProductionVirtualView } from "./loadDeferredProductionVirtualView";
import type { VirtualViewContext } from "./ProductionVirtualViews";

type LazyProductionVirtualViewProps = {
  activeFolder: string;
  ctx: VirtualViewContext;
  careerScannerPreloadKey?: string | number | null;
};

export function LazyProductionVirtualView({
  activeFolder,
  ctx,
  careerScannerPreloadKey,
}: LazyProductionVirtualViewProps) {
  const [panel, setPanel] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPanel(null);

    void loadDeferredProductionVirtualView(activeFolder, ctxRef.current)
      .then((node) => {
        if (!cancelled) {
          setPanel(node);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFolder, careerScannerPreloadKey]);

  if (loading) {
    return <PmailLoadingScreen subtitle="Loading workspace…" className="pmail-loading-screen--overlay" />;
  }

  return panel;
}
