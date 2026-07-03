import { useCallback, useEffect, useMemo, useState } from "react";
import type { PanelWorkspaceTrialStatus } from "../types/addon";

export type PanelWorkspaceTrialReminderKind = "hours72" | "hours24";

const DISMISS_PREFIX = "pmail-panel-trial-reminder-dismissed:";

function dismissKey(userId: string, kind: PanelWorkspaceTrialReminderKind): string {
  return `${DISMISS_PREFIX}${userId}:${kind}`;
}

function isDismissed(userId: string, kind: PanelWorkspaceTrialReminderKind): boolean {
  try {
    return localStorage.getItem(dismissKey(userId, kind)) === "1";
  } catch {
    return false;
  }
}

function markDismissed(userId: string, kind: PanelWorkspaceTrialReminderKind): void {
  try {
    localStorage.setItem(dismissKey(userId, kind), "1");
  } catch {
    // Private mode or quota — reminder may reappear on next visit.
  }
}

function trialHoursLeft(panelWorkspaceTrial: PanelWorkspaceTrialStatus | null): number | null {
  if (!panelWorkspaceTrial?.active || !panelWorkspaceTrial.endsAt) return null;
  return Math.max(
    0,
    Math.ceil((new Date(panelWorkspaceTrial.endsAt).getTime() - Date.now()) / (60 * 60 * 1000)),
  );
}

export function usePanelWorkspaceTrialReminder(
  userId: string | undefined,
  panelWorkspaceTrial: PanelWorkspaceTrialStatus | null,
) {
  const [tick, setTick] = useState(0);

  const hoursLeft = useMemo(() => trialHoursLeft(panelWorkspaceTrial), [panelWorkspaceTrial, tick]);

  const activeReminder = useMemo((): PanelWorkspaceTrialReminderKind | null => {
    if (!userId || !panelWorkspaceTrial?.active || hoursLeft == null) return null;

    if (hoursLeft <= 24 && !isDismissed(userId, "hours24")) {
      return "hours24";
    }
    if (hoursLeft <= 72 && !isDismissed(userId, "hours72")) {
      return "hours72";
    }
    return null;
  }, [userId, panelWorkspaceTrial?.active, hoursLeft, tick]);

  useEffect(() => {
    if (!userId || !panelWorkspaceTrial?.active) return;

    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [userId, panelWorkspaceTrial?.active, panelWorkspaceTrial?.endsAt]);

  const dismiss = useCallback(() => {
    if (!userId || !activeReminder) return;
    markDismissed(userId, activeReminder);
    setTick((value) => value + 1);
  }, [userId, activeReminder]);

  return { activeReminder, hoursLeft, dismiss };
}
