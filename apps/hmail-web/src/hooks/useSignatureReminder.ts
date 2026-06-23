import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import {
  canShowSignatureReminderToast,
  setSignatureReminderDontAskAgain,
} from "../lib/signatureReminderPrefs";
import { hasActiveEmailSignature } from "../utils/signatureBuilder";

const SIGNATURE_TOAST_DELAY_MS = 320_000;
const SIGNATURE_POLL_MS = 120_000;

type UseSignatureReminderOptions = {
  enabled?: boolean;
  onOpenBrandSettings?: () => void;
};

export function useSignatureReminder({ enabled = true, onOpenBrandSettings }: UseSignatureReminderOptions = {}) {
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);
  const toastEligibleRef = useRef(false);

  const evaluate = useCallback(async () => {
    if (!enabled || dismissedRef.current || !toastEligibleRef.current) {
      setVisible(false);
      return false;
    }
    try {
      const { settings } = await api.composeSettings();
      if (hasActiveEmailSignature(settings)) {
        setVisible(false);
        dismissedRef.current = false;
        return true;
      }
      if (!canShowSignatureReminderToast()) {
        setVisible(false);
        return false;
      }
      setVisible(true);
      return false;
    } catch {
      setVisible(false);
      return false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    toastEligibleRef.current = false;
    const delayTimer = window.setTimeout(() => {
      toastEligibleRef.current = true;
      void evaluate();
    }, SIGNATURE_TOAST_DELAY_MS);
    const pollTimer = window.setInterval(() => {
      if (toastEligibleRef.current) {
        void evaluate();
      }
    }, SIGNATURE_POLL_MS);
    return () => {
      window.clearTimeout(delayTimer);
      window.clearInterval(pollTimer);
    };
  }, [enabled, evaluate]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setVisible(false);
  }, []);

  const dontAskAgain = useCallback(() => {
    setSignatureReminderDontAskAgain();
    dismissedRef.current = true;
    setVisible(false);
  }, []);

  const openBrandSettings = useCallback(() => {
    dismissedRef.current = true;
    setVisible(false);
    onOpenBrandSettings?.();
  }, [onOpenBrandSettings]);

  return {
    visible,
    evaluate,
    dismiss,
    dontAskAgain,
    openBrandSettings,
  };
}
