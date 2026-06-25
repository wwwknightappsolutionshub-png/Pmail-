import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAddons } from "../context/AddonContext";
import type { SecondaryMailboxNotice } from "../components/SecondaryMailboxToast";

const POLL_MS = 45_000;

export function useSecondaryMailboxNotifications(enabled: boolean) {
  const { hasAddon } = useAddons();
  const entitled = hasAddon("multi-inbox-functionality");
  const [notice, setNotice] = useState<SecondaryMailboxNotice | null>(null);
  const previousUnreadRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  const poll = useCallback(async () => {
    if (!enabled || !entitled) return;
    try {
      const summary = await api.mailAccountsUnreadSummary();
      if (!seededRef.current) {
        for (const account of summary.accounts) {
          previousUnreadRef.current.set(account.id, account.unread);
        }
        seededRef.current = true;
        return;
      }

      for (const account of summary.accounts) {
        const previous = previousUnreadRef.current.get(account.id) ?? account.unread;
        if (!account.isActive && account.unread > previous) {
          setNotice({
            accountId: account.id,
            accountEmail: account.email,
            accountLabel: account.label,
            newCount: account.unread - previous,
          });
        }
        previousUnreadRef.current.set(account.id, account.unread);
      }
    } catch {
      // ignore polling errors
    }
  }, [enabled, entitled]);

  useEffect(() => {
    if (!enabled || !entitled) return;
    seededRef.current = false;
    previousUnreadRef.current = new Map();
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, entitled, poll]);

  const dismiss = useCallback(() => setNotice(null), []);

  const acknowledgeAccount = useCallback((accountId: string) => {
    const current = previousUnreadRef.current.get(accountId);
    if (current != null) {
      previousUnreadRef.current.set(accountId, current);
    }
    setNotice(null);
  }, []);

  return { notice, dismiss, acknowledgeAccount, refresh: poll };
}
