import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export type WorkspaceTabCounts = {
  contacts: number;
  reminders: number;
  calendar: number;
  messaging: number;
};

const REFRESH_INTERVAL_MS = 30_000;

function computeMessagingCount(
  viewerEmail: string,
  organizationUsers: Array<{ email: string }>,
  contactsWithPhone: number,
): number {
  const orgPeers = organizationUsers.filter(
    (member) => member.email.trim().toLowerCase() !== viewerEmail.trim().toLowerCase(),
  ).length;
  return 1 + orgPeers + contactsWithPhone;
}

export function useWorkspaceTabCounts(
  enabled: boolean,
  viewerEmail: string,
  organizationUsers: Array<{ email: string }>,
) {
  const [counts, setCounts] = useState<WorkspaceTabCounts | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    try {
      const [contactsRes, remindersRes, calendarRes, orgUsersRes] = await Promise.all([
        api.contacts(),
        api.workspaceReminders("pending"),
        api.workspaceCalendar(),
        organizationUsers.length > 0
          ? Promise.resolve({ users: organizationUsers })
          : api.organizationUsers(),
      ]);

      const orgUsers = orgUsersRes.users;
      const contactsWithPhone = contactsRes.contacts.filter((contact) => contact.phone?.trim()).length;

      setCounts({
        contacts: contactsRes.contacts.length,
        reminders: remindersRes.reminders.length,
        calendar: calendarRes.events.length,
        messaging: computeMessagingCount(viewerEmail, orgUsers, contactsWithPhone),
      });
    } catch {
      setCounts(null);
    }
  }, [enabled, organizationUsers, viewerEmail]);

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, load]);

  return counts;
}
