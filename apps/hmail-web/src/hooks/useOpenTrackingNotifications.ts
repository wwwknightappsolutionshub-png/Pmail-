import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export type TrackingOpenNotification = {
  id: string;
  sentMessageTrackingId: string;
  toEmail: string;
  subject: string;
  openedAt: string;
};

export function useOpenTrackingNotifications(enabled: boolean) {
  const [notification, setNotification] = useState<TrackingOpenNotification | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const { notifications } = await api.mailTrackingNotifications();
      const next = notifications.find((row) => !seenIdsRef.current.has(row.id));
      if (next) {
        seenIdsRef.current.add(next.id);
        setNotification(next);
      }
    } catch {
      // ignore polling errors
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void poll();
    const id = window.setInterval(() => void poll(), 30_000);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, poll]);

  const dismissNotification = useCallback(async () => {
    if (!notification) return;
    const id = notification.id;
    setNotification(null);
    try {
      await api.markMailTrackingNotificationsRead([id]);
    } catch {
      // ignore
    }
  }, [notification]);

  return { notification, dismissNotification };
}
