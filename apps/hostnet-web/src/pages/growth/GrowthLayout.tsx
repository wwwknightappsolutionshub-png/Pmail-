import { Outlet, Link, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { GrowthProvider, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  requiresAnalytics?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/growth/dashboard", label: "Dashboard", end: true },
  { to: "/growth/onboarding", label: "Onboarding" },
  { to: "/growth/studio", label: "Content studio" },
  { to: "/growth/pipeline", label: "Pipeline" },
  { to: "/growth/chatbot", label: "Chatbot" },
  { to: "/growth/analytics", label: "Analytics", requiresAnalytics: true },
  { to: "/growth/automations", label: "Automations" },
  { to: "/growth/optimization", label: "Optimization", requiresAnalytics: true },
  { to: "/growth/channels", label: "Channels", requiresAnalytics: true },
  { to: "/growth/ads-seo", label: "Ads & SEO", requiresAnalytics: true },
];

function GrowthSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { isOwner, loading, plan } = useGrowthContext();

  return (
    <>
      <div
        className={`growth-sidebar-backdrop${open ? " visible" : ""}`}
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="presentation"
        aria-hidden={!open}
      />
      <aside className={`growth-sidebar${open ? " open" : ""}`} aria-label="Growth navigation">
        <div className="growth-sidebar-brand">
          <strong>Prohost Growth</strong>
          <span>Marketing OS</span>
        </div>

        {!loading && plan ? (
          <div className="growth-sidebar-plan">
            <span className="growth-sidebar-plan-label">Plan</span>
            <span className="growth-sidebar-plan-value">{plan.planName ?? plan.planSlug}</span>
          </div>
        ) : null}

        <nav className="growth-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const locked = !loading && plan && item.requiresAnalytics && !plan.limits.analytics;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `growth-sidebar-link${isActive ? " active" : ""}${locked ? " growth-sidebar-link-locked" : ""}`
                }
                onClick={onClose}
              >
                <span>{item.label}</span>
                {locked ? <span className="growth-nav-badge">Pro</span> : null}
              </NavLink>
            );
          })}
          {!loading && isOwner ? (
            <NavLink
              to="/growth/settings"
              className={({ isActive }) => `growth-sidebar-link${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              Settings
            </NavLink>
          ) : null}
        </nav>

        <div className="growth-sidebar-footer">
          <Link to="/" className="growth-sidebar-link muted-link" onClick={onClose}>
            ← Marketing site
          </Link>
        </div>
      </aside>
    </>
  );
}

function GrowthLayoutShell() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    api
      .panelMe()
      .then(() => setAuthenticated(true))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/panel/login?return=${encodeURIComponent("/growth/dashboard")}`, { replace: true });
          return;
        }
        setAuthenticated(false);
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  if (checking) {
    return (
      <div className="growth-shell growth-app">
        <div className="growth-content growth-content-loading">Loading Prohost Growth…</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/panel/login" replace />;
  }

  return (
    <div className="growth-shell growth-app">
      <GrowthSidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="growth-content">
        <header className="growth-topbar">
          <button
            type="button"
            className="growth-menu-toggle"
            aria-expanded={navOpen}
            aria-controls="growth-sidebar"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="growth-menu-icon" aria-hidden="true" />
            <span className="sr-only">Toggle menu</span>
          </button>
          <div className="growth-topbar-title">
            <strong>Prohost Growth</strong>
          </div>
        </header>

        <main className="growth-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function GrowthLayout() {
  return (
    <GrowthProvider>
      <GrowthLayoutShell />
    </GrowthProvider>
  );
}
