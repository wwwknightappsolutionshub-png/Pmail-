import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "pmail_mail_list_pane_width_px";
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 300;
const MAX_WIDTH_RATIO = 0.62;

function readStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= MIN_WIDTH ? parsed : DEFAULT_WIDTH;
}

export function useMailListPaneResize(enabled: boolean) {
  const [listPaneWidth, setListPaneWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clampWidth = useCallback((width: number) => {
    const maxWidth = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * MAX_WIDTH_RATIO));
    return Math.min(maxWidth, Math.max(MIN_WIDTH, width));
  }, []);

  const startResize = useCallback(
    (clientX: number) => {
      if (!enabled) return;
      dragRef.current = { startX: clientX, startWidth: listPaneWidth };
      setIsResizing(true);
    },
    [enabled, listPaneWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: MouseEvent | TouchEvent) => {
      const point = "touches" in event ? event.touches[0] : event;
      if (!point || !dragRef.current) return;
      const delta = point.clientX - dragRef.current.startX;
      setListPaneWidth(clampWidth(dragRef.current.startWidth + delta));
    };

    const onEnd = () => {
      dragRef.current = null;
      setIsResizing(false);
      setListPaneWidth((current) => {
        const next = clampWidth(current);
        window.localStorage.setItem(STORAGE_KEY, String(Math.round(next)));
        return next;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [clampWidth, isResizing]);

  return { listPaneWidth, isResizing, startResize };
}
