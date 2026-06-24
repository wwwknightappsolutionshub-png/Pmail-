const MOBILE_MAX_WIDTH_PX = 767;
const PWA_INSTALL_SESSION_BYPASS_KEY = "pmail:pwa-install-session-bypass";

export function isMobileScreen(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isPwaInstallGateEnabled(): boolean {
  if (import.meta.env.VITE_PWA_INSTALL_GATE === "false") return false;
  if (import.meta.env.VITE_PWA_INSTALL_GATE === "true") return true;
  return import.meta.env.PROD;
}

export function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

/** User accepted install or confirmed manual add — allow this browser session to continue. */
export function markPwaInstallAcceptedForSession(): void {
  try {
    sessionStorage.setItem(PWA_INSTALL_SESSION_BYPASS_KEY, "1");
  } catch {
    // Storage may be blocked in private mode; gate dismissal also uses in-memory state.
  }
}

export function hasPwaInstallSessionBypass(): boolean {
  try {
    return sessionStorage.getItem(PWA_INSTALL_SESSION_BYPASS_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldRequirePwaInstall(pathname = "/"): boolean {
  if (isLoginPath(pathname)) return false;
  if (isStandaloneDisplayMode()) return false;
  if (hasPwaInstallSessionBypass()) return false;
  return isPwaInstallGateEnabled() && isMobileScreen();
}
