import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  isAndroidDevice,
  isIosDevice,
  isMobileScreen,
  isStandaloneDisplayMode,
  shouldRequirePwaInstall,
} from "../utils/pwaPlatform";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function usePwaInstall() {
  const location = useLocation();
  const [gateActive, setGateActive] = useState(() => shouldRequirePwaInstall(location.pathname));
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");

  const refreshGate = useCallback(() => {
    setGateActive(shouldRequirePwaInstall(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    refreshGate();

    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    const onViewportChange = () => refreshGate();
    mobileQuery.addEventListener("change", onViewportChange);
    standaloneQuery.addEventListener("change", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    document.addEventListener("visibilitychange", onViewportChange);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstallPrompt(null);
      setInstallError("");
      refreshGate();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      mobileQuery.removeEventListener("change", onViewportChange);
      standaloneQuery.removeEventListener("change", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("visibilitychange", onViewportChange);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [refreshGate]);

  const triggerInstall = useCallback(async () => {
    if (!installPrompt) {
      setInstallError("Use the steps below to add PMail+ to your home screen.");
      return;
    }

    setInstalling(true);
    setInstallError("");

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        refreshGate();
      } else {
        setInstallError("Install PMail+ from your home screen to continue on mobile.");
      }
    } catch {
      setInstallError("Install could not start. Follow the manual steps below.");
    } finally {
      setInstalling(false);
    }
  }, [installPrompt, refreshGate]);

  return {
    gateActive,
    canPromptInstall: Boolean(installPrompt),
    installing,
    installError,
    isIos: isIosDevice(),
    isAndroid: isAndroidDevice(),
    isMobile: isMobileScreen(),
    isStandalone: isStandaloneDisplayMode(),
    triggerInstall,
    refreshGate,
  };
}
