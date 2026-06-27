import { useEffect, useState, type ReactNode } from "react";
import { PmailLoadingScreen } from "../PmailLoadingScreen";
import { loadIndustryToolPanel } from "./loadIndustryToolPanel";

type LazyIndustryToolPanelProps = {
  useCaseId: string;
  toolId: string;
  applyComposeTemplate: (template: { subject: string; html: string; label?: string }) => void;
};

export function LazyIndustryToolPanel({ useCaseId, toolId, applyComposeTemplate }: LazyIndustryToolPanelProps) {
  const [panel, setPanel] = useState<ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPanel(null);

    void loadIndustryToolPanel(useCaseId, toolId, applyComposeTemplate)
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
  }, [useCaseId, toolId, applyComposeTemplate]);

  if (loading) {
    return <PmailLoadingScreen subtitle="Loading tool…" />;
  }

  return panel;
}
