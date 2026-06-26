import { useEffect, useState } from "react";
import { api } from "../api/client";

export type WorkspaceTabCounts = {
  contacts: number;
  reminders: number;
  calendar: number;
  messaging: number;
};

export function useWorkspaceTabCounts(
  enabled: boolean,
  viewerEmail: string,
  organizationUsers: Array<{ email: string }>,
) {
  const [counts, setCounts] = useState<WorkspaceTabCounts | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [contactsRes, remindersRes, calendarRes] = await Promise.all([
          api.contacts(),
          api.workspaceReminders("pending"),
          api.workspaceCalendar(),
        ]);
        if (cancelled) return;

        const orgPeers = organizationUsers.filter(
          (member) => member.email.trim().toLowerCase() !== viewerEmail.trim().toLowerCase(),
        ).length;
        const whatsappContacts = contactsRes.contacts.filter((contact) => contact.phone?.trim()).length;

        setCounts({
          contacts: contactsRes.contacts.length,
          reminders: remindersRes.reminders.length,
          calendar: calendarRes.events.length,
          messaging: 1 + orgPeers + whatsappContacts,
        });
      } catch {
        if (!cancelled) setCounts(null);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, viewerEmail, organizationUsers]);

  return counts;
}
