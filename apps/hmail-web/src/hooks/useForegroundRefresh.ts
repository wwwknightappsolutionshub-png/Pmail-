import { useEffect, useRef } from "react";

const MIN_HIDDEN_MS = 1500;

/**
 * Runs `onRefresh` when the document returns to the foreground after being hidden.
 */
export function useForegroundRefresh(onRefresh: () => Promise<void>, enabled = true) {
  const onRefreshRef = useRef(onRefresh);
  const busyRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState !== "visible") return;

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt == null) return;

      const hiddenMs = Date.now() - hiddenAt;
      if (hiddenMs < MIN_HIDDEN_MS || busyRef.current) return;

      busyRef.current = true;
      void onRefreshRef
        .current()
        .catch(() => undefined)
        .finally(() => {
          busyRef.current = false;
        });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled]);
}
