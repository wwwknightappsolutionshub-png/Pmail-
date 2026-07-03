import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { readWorkspaceMessagingThreadCount } from "../utils/workspaceMessagingCount";

export type WorkspaceTabCounts = {
  contacts: number;
  reminders: number;
  calendar: number;
  messaging: number;
};

const REFRESH_INTERVAL_MS = 30_000;
const WORKSPACE_STORAGE_PREFIX = "bespoke-demo-workspace:";

export function useWorkspaceTabCounts(enabled: boolean, demoUseCaseId = "platform") {
  const [counts, setCounts] = useState<WorkspaceTabCounts | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    try {
      const [contactsRes, remindersRes, calendarRes] = await Promise.all([
        api.contacts(),
        api.workspaceReminders("pending"),
        api.workspaceCalendar(),
      ]);

      setCounts({
        contacts: contactsRes.contacts.length,
        reminders: remindersRes.reminders.length,
        calendar: calendarRes.events.length,
        messaging: readWorkspaceMessagingThreadCount(demoUseCaseId),
      });
    } catch {
      setCounts(null);
    }
  }, [demoUseCaseId, enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    const messagingTimer = window.setInterval(() => {
      setCounts((current) => {
        if (!current) return current;
        const messaging = readWorkspaceMessagingThreadCount(demoUseCaseId);
        return messaging === current.messaging ? current : { ...current, messaging };
      });
    }, 5_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onWorkspaceStorage = (event: StorageEvent) => {
      if (event.key === `${WORKSPACE_STORAGE_PREFIX}${demoUseCaseId}`) {
        void load();
      }
    };
    window.addEventListener("storage", onWorkspaceStorage);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(messagingTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onWorkspaceStorage);
    };
  }, [demoUseCaseId, enabled, load]);

  return counts;
}
