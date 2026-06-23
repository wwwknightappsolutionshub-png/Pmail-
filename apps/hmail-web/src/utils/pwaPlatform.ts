const MOBILE_MAX_WIDTH_PX = 767;

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

export function shouldRequirePwaInstall(pathname = "/"): boolean {
  if (isLoginPath(pathname)) return false;
  return isPwaInstallGateEnabled() && isMobileScreen() && !isStandaloneDisplayMode();
}
