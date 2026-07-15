import { useEffect } from "react";

export const TOAST_AUTO_DISMISS_MS = {
  info: 2000,
  action: 6000,
} as const;

export type ToastDismissTier = keyof typeof TOAST_AUTO_DISMISS_MS;

export function useToastAutoDismiss(
  onDismiss: () => void,
  enabled: boolean,
  tier: ToastDismissTier = "info",
  overrideMs?: number,
) {
  useEffect(() => {
    if (!enabled) return;
    const delay = overrideMs ?? TOAST_AUTO_DISMISS_MS[tier];
    const timer = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timer);
  }, [enabled, onDismiss, overrideMs, tier]);
}
