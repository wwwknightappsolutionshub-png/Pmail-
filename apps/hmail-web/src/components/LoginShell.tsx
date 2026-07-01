import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { hardRefreshPmailClient } from "../clientRefresh";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { isMobileScreen } from "../utils/pwaPlatform";
import { HMailLogo } from "./HMailLogo";
import type { TenantBranding } from "../types/mail";
import "../pages/LoginPage.css";

type LoginShellProps = {
  branding: TenantBranding;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  overlay?: ReactNode;
  layoutClassName?: string;
  brandPanelClassName?: string;
  formPanelClassName?: string;
  exploreHref?: string;
  showExploreLink?: boolean;
};

export function LoginShell({
  branding,
  leftPanel,
  rightPanel,
  overlay,
  layoutClassName = "",
  brandPanelClassName = "",
  formPanelClassName = "",
  exploreHref = "/welcome",
  showExploreLink = false,
}: LoginShellProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const enablePullToRefresh = isMobileScreen();
  const hardRefresh = useCallback(() => hardRefreshPmailClient(), []);
  const { pullDistance, isRefreshing, threshold } = usePullToRefresh(
    pageRef,
    hardRefresh,
    enablePullToRefresh,
    true,
  );
  const showPullIndicator = enablePullToRefresh && (pullDistance > 0 || isRefreshing);
  const pullIndicatorHeight = isRefreshing ? threshold : pullDistance;
  const pullIndicatorLabel = isRefreshing
    ? "Updating app…"
    : pullDistance >= threshold
      ? "Release to update"
      : "Pull to update app";

  const brandStyle = {
    "--brand-primary": branding.primaryColor,
    "--brand-accent": branding.accentColor,
    "--brand-bg": branding.backgroundColor,
  } as CSSProperties;

  useEffect(() => {
    const root = document.documentElement;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content") ?? null;

    root.classList.add("login-route");
    themeMeta?.setAttribute("content", "#f1f5f9");

    return () => {
      root.classList.remove("login-route");
      if (themeMeta) {
        if (previousTheme) themeMeta.setAttribute("content", previousTheme);
        else themeMeta.setAttribute("content", "#050a12");
      }
    };
  }, []);

  return (
    <div ref={pageRef} className="login-page" style={brandStyle}>
      {showPullIndicator ? (
        <div
          className={`login-pull-indicator${isRefreshing ? " is-refreshing" : ""}${
            pullDistance >= threshold ? " is-ready" : ""
          }`}
          style={{ height: `${pullIndicatorHeight}px` }}
          aria-live="polite"
        >
          <span>{pullIndicatorLabel}</span>
        </div>
      ) : null}
      <header className="login-topbar">
        <HMailLogo
          size="sm"
          showWordmark
          productName={branding.productName}
          subtitle="Prohost Cloud"
          className="login-topbar-logo"
        />
        {showExploreLink ? (
          <Link className="login-topbar-explore" to={exploreHref}>
            New here? Explore PMail+ Features
          </Link>
        ) : null}
      </header>

      <main className={`login-layout${layoutClassName ? ` ${layoutClassName}` : ""}`}>
        <section className={`login-brand-panel${brandPanelClassName ? ` ${brandPanelClassName}` : ""}`}>
          {leftPanel}
        </section>
        <section className={`login-form-panel${formPanelClassName ? ` ${formPanelClassName}` : ""}`}>
          {rightPanel}
        </section>
      </main>

      {overlay}
    </div>
  );
}

const DEFAULT_BRANDING: TenantBranding = {
  productName: "PMail+",
  logoUrl: null,
  primaryColor: "#0d4f6c",
  accentColor: "#0d9488",
  backgroundColor: "#0f2744",
  loginTagline: "Secure cloud mail powered by Prohost Cloud",
};

export function useTenantBranding(tenantSlug: string) {
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoadError("");
    api
      .getTenant(tenantSlug)
      .then((tenant) => {
        if (tenant.branding) setBranding(tenant.branding);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setLoadError(
            err.status === 404
              ? `${err.message} — contact your administrator or run npm run db:seed on the server.`
              : err.message,
          );
        } else {
          setLoadError("Cannot reach the mail service. Check that the API is running.");
        }
      });
  }, [tenantSlug]);

  return { branding, loadError };
}

export function buildWelcomePath(tenantSlug?: string, options?: { replay?: boolean }): string {
  const base = tenantSlug ? `/welcome/${tenantSlug}` : "/welcome";
  return options?.replay ? `${base}?replay=1` : base;
}

export function buildLoginPath(tenantSlug?: string, search = ""): string {
  const base = tenantSlug ? `/login/${tenantSlug}` : "/login";
  return search ? `${base}${search.startsWith("?") ? search : `?${search}`}` : base;
}
