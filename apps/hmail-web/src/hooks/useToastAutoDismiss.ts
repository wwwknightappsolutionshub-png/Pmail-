import { useEffect, useRef } from "react";

export const TOAST_AUTO_DISMISS_MS = {
  info: 2000,
  action: 6000,
} as const;

export type ToastDismissTier = keyof typeof TOAST_AUTO_DISMISS_MS;

/**
 * Auto-dismiss after the tier delay. `onDismiss` is held in a ref so parent
 * re-renders (inline callbacks) do not reset the timer.
 */
export function useToastAutoDismiss(
  onDismiss: () => void,
  enabled: boolean,
  tier: ToastDismissTier = "info",
  overrideMs?: number,
) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled) return;
    const delay = overrideMs ?? TOAST_AUTO_DISMISS_MS[tier];
    const timer = window.setTimeout(() => {
      onDismissRef.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [enabled, overrideMs, tier]);
}
