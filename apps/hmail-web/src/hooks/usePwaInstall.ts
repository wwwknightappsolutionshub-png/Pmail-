import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  hasPwaExitReminderShownForSession,
  hasPwaInstallSessionBypass,
  isAndroidDevice,
  isIosDevice,
  isMobileScreen,
  isPwaInstallCandidateDevice,
  isStandaloneDisplayMode,
  markPwaExitReminderShownForSession,
  markPwaInstallAcceptedForSession,
  shouldOfferPwaInstall,
} from "../utils/pwaPlatform";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstallPromptMode = "initial" | "exit-intent";

export function usePwaInstall() {
  const location = useLocation();
  const [sessionBypass, setSessionBypass] = useState(() => hasPwaInstallSessionBypass());
  const [initialDismissed, setInitialDismissed] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptMode, setPromptMode] = useState<PwaInstallPromptMode>("initial");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");

  const isEligible = useCallback(() => {
    if (sessionBypass || hasPwaInstallSessionBypass()) return false;
    return shouldOfferPwaInstall(location.pathname);
  }, [location.pathname, sessionBypass]);

  const releaseInstallGate = useCallback(() => {
    markPwaInstallAcceptedForSession();
    setSessionBypass(true);
    setInstallError("");
    setPromptVisible(false);
  }, []);

  const openPrompt = useCallback(
    (mode: PwaInstallPromptMode) => {
      if (!isEligible()) return;
      if (mode === "exit-intent" && hasPwaExitReminderShownForSession()) return;
      setPromptMode(mode);
      setPromptVisible(true);
      if (mode === "exit-intent") {
        markPwaExitReminderShownForSession();
      }
    },
    [isEligible],
  );

  const dismissPrompt = useCallback(() => {
    setPromptVisible(false);
    setInstallError("");
    if (promptMode === "initial") {
      setInitialDismissed(true);
    }
  }, [promptMode]);

  const refreshEligibility = useCallback(() => {
    if (sessionBypass || hasPwaInstallSessionBypass()) {
      setPromptVisible(false);
    }
  }, [sessionBypass]);

  useEffect(() => {
    if (!isEligible()) {
      setPromptVisible(false);
      return;
    }

    if (!initialDismissed) {
      setPromptMode("initial");
      setPromptVisible(true);
    }
  }, [initialDismissed, isEligible, location.pathname]);

  useEffect(() => {
    const viewportQuery = window.matchMedia("(max-width: 1024px)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");

    const onViewportChange = () => refreshEligibility();
    viewportQuery.addEventListener("change", onViewportChange);
    standaloneQuery.addEventListener("change", onViewportChange);
    fullscreenQuery.addEventListener("change", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    document.addEventListener("visibilitychange", onViewportChange);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      releaseInstallGate();
    };

    const onExitIntentMouse = (event: MouseEvent) => {
      if (event.clientY > 24) return;
      if (!event.relatedTarget && event.target === document.documentElement) {
        openPrompt("exit-intent");
      }
    };

    let leftPage = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        leftPage = true;
        return;
      }
      if (document.visibilityState === "visible" && leftPage) {
        leftPage = false;
        openPrompt("exit-intent");
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    document.documentElement.addEventListener("mouseleave", onExitIntentMouse);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      viewportQuery.removeEventListener("change", onViewportChange);
      standaloneQuery.removeEventListener("change", onViewportChange);
      fullscreenQuery.removeEventListener("change", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("visibilitychange", onViewportChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      document.documentElement.removeEventListener("mouseleave", onExitIntentMouse);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [openPrompt, refreshEligibility, releaseInstallGate]);

  const triggerInstall = useCallback(async () => {
    if (!installPrompt) {
      if (isIosDevice()) {
        setInstallError("Tap Share in Safari, then choose Add to Home Screen.");
      } else {
        setInstallError("Use your browser menu to install PMail+ or add it to your home screen.");
      }
      return;
    }

    setInstalling(true);
    setInstallError("");

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        releaseInstallGate();
      } else {
        setInstallError("Install PMail+ from your home screen for the best experience.");
      }
    } catch {
      setInstallError("Install could not start. Follow the steps below to add PMail+.");
    } finally {
      setInstalling(false);
    }
  }, [installPrompt, releaseInstallGate]);

  return {
    promptVisible,
    promptMode,
    canPromptInstall: Boolean(installPrompt),
    installing,
    installError,
    isIos: isIosDevice(),
    isAndroid: isAndroidDevice(),
    isMobile: isMobileScreen(),
    isInstallCandidate: isPwaInstallCandidateDevice(),
    isStandalone: isStandaloneDisplayMode(),
    triggerInstall,
    dismissPrompt,
    continueAfterInstall: releaseInstallGate,
    refreshGate: refreshEligibility,
  };
}
