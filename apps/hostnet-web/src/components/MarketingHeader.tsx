import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProhostLogo } from "./ProhostLogo";
import { useMarketingTheme } from "../hooks/useMarketingTheme";

type NavKey = "platform" | "solutions" | "security" | "bespoke";

type Props = {
  active?: NavKey;
};

function sectionHref(id: string) {
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    return `/#${id}`;
  }
  return `#${id}`;
}

export function MarketingHeader({ active }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useMarketingTheme();

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const navClass = (key: NavKey) => (active === key ? "marketing-nav-link marketing-nav-link--active" : "marketing-nav-link");

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          className="landing-nav-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <header className="landing-top">
        <Link to="/" className="landing-brand-link" onClick={() => setMenuOpen(false)}>
          <ProhostLogo size="md" />
        </Link>
        <button
          type="button"
          className="landing-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
        <nav className={`landing-nav${menuOpen ? " landing-nav--open" : ""}`}>
          <a href={sectionHref("platform")} className={navClass("platform")} onClick={() => setMenuOpen(false)}>
            Platform
          </a>
          <a href={sectionHref("solutions")} className={navClass("solutions")} onClick={() => setMenuOpen(false)}>
            Solutions
          </a>
          <a href={sectionHref("security")} className={navClass("security")} onClick={() => setMenuOpen(false)}>
            Security
          </a>
          <a href={sectionHref("pmail")} className={navClass("bespoke")} onClick={() => setMenuOpen(false)}>
            Bespoke mail
          </a>
          <a href={sectionHref("growth")} className="marketing-nav-link" onClick={() => setMenuOpen(false)}>
            Growth
          </a>
          <button
            type="button"
            className="marketing-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            title={theme === "light" ? "Dark theme" : "Light theme"}
          >
            {theme === "light" ? "◐ Dark" : "◑ Light"}
          </button>
          <div className="landing-nav-actions">
            <Link to="/panel/login" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
              Sign in
            </Link>
            <a href={sectionHref("register")} className="btn btn-primary" onClick={() => setMenuOpen(false)}>
              Get custom pricing
            </a>
          </div>
        </nav>
      </header>
    </>
  );
}
