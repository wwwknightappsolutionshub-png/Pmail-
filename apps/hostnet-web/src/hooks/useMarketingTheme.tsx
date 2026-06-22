import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export type MarketingTheme = "default" | "light";

const STORAGE_KEY = "prohost-marketing-theme";

const APP_SHELL_PREFIXES = ["/panel", "/admin", "/growth"];

function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

type MarketingThemeContextValue = {
  theme: MarketingTheme;
  setTheme: (theme: MarketingTheme) => void;
  toggleTheme: () => void;
};

const MarketingThemeContext = createContext<MarketingThemeContextValue | null>(null);

function readStoredTheme(): MarketingTheme {
  if (typeof window === "undefined") return "default";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" ? "light" : "default";
}

export function MarketingThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [theme, setThemeState] = useState<MarketingTheme>(readStoredTheme);

  const applyTheme = useCallback((next: MarketingTheme) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  useEffect(() => {
    if (isAppShellRoute(location.pathname)) {
      document.documentElement.removeAttribute("data-marketing-theme");
      return;
    }
    document.documentElement.setAttribute("data-marketing-theme", theme);
  }, [location.pathname, theme]);

  const setTheme = useCallback(
    (next: MarketingTheme) => {
      applyTheme(next);
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "light" ? "default" : "light");
  }, [applyTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <MarketingThemeContext.Provider value={value}>{children}</MarketingThemeContext.Provider>;
}

export function useMarketingTheme() {
  const ctx = useContext(MarketingThemeContext);
  if (!ctx) throw new Error("useMarketingTheme must be used within MarketingThemeProvider");
  return ctx;
}
