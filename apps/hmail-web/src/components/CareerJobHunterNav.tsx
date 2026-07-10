import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import "./CareerJobHunterNav.css";

type NavIcon = "hub" | "scan" | "build" | "apply" | "track" | "settings";

const JOB_HUNTER_NAV: Array<{
  to: string;
  end?: boolean;
  label: string;
  hint: string;
  shortLabel: string;
  icon: NavIcon;
}> = [
  { to: "/career", end: true, label: "CV Hub", shortLabel: "Hub", hint: "Template Central", icon: "hub" },
  { to: "/career/scan", label: "Scan CV", shortLabel: "Scan", hint: "ATS benchmark", icon: "scan" },
  { to: "/career/build", label: "Build CV", shortLabel: "Build", hint: "Wizard builder", icon: "build" },
  { to: "/career/apply", label: "Apply Assist", shortLabel: "Assist", hint: "Tailored apps", icon: "apply" },
  { to: "/career/track", label: "Track", shortLabel: "Track", hint: "Applications", icon: "track" },
  { to: "/career/settings", label: "Configure", shortLabel: "Setup", hint: "Privacy & scan", icon: "settings" },
];

function NavGlyph({ icon }: { icon: NavIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    focusable: false as const,
    className: "career-jh-nav-icon",
  };

  const paths: Record<NavIcon, ReactNode> = {
    hub: (
      <path
        fill="currentColor"
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11zm2.5-.5a.5.5 0 0 0-.5.5v11c0 .28.22.5.5.5H10V6H6.5zm5.5 0v12h5.5a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5H12z"
      />
    ),
    scan: (
      <path
        fill="currentColor"
        d="M5 4h4v2H7v2H5V4zm10 0h4v4h-2V6h-2V4zM5 16h2v2h2v2H5v-4zm12 2h-2v2h4v-4h-2v2zM8 8h8v8H8V8zm2 2v4h4v-4h-4z"
      />
    ),
    build: (
      <path
        fill="currentColor"
        d="M14.06 4.42 19.58 9.94l-9.9 9.9H4.16v-5.52l9.9-9.9zm1.41-1.41 2.12-2.12a1 1 0 0 1 1.42 0l2.12 2.12a1 1 0 0 1 0 1.42l-2.12 2.12-3.54-3.54z"
      />
    ),
    apply: (
      <path
        fill="currentColor"
        d="M5 4h10a2 2 0 0 1 2 2v3h-2V6H5v12h6v2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm10.6 8.2 1.4-1.4L20.8 14.6 17 18.4l-1.4-1.4 2.4-2.4-2.4-2.4zM7 8h6v2H7V8zm0 4h4v2H7v-2z"
      />
    ),
    track: (
      <path
        fill="currentColor"
        d="M4 19h16v2H4v-2zm2.5-3.5 3.2-4.2 2.8 2.1 4.5-5.9 1.6 1.2-5.9 7.7-2.9-2.2-2.2 2.9L6.5 15.5z"
      />
    ),
    settings: (
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    ),
  };

  return <svg {...common}>{paths[icon]}</svg>;
}

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "career-jh-nav-link active" : "career-jh-nav-link";
}

export function CareerJobHunterNav() {
  return (
    <nav className="career-jh-nav" aria-label="Job Hunter dashboard">
      <div className="career-jh-nav-intro">
        <p className="career-jh-nav-eyebrow">Job Hunter</p>
        <h1 className="career-jh-nav-title">Career workspace</h1>
      </div>
      <div className="career-jh-nav-tabs">
        {JOB_HUNTER_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navClass}
            title={`${item.label} — ${item.hint}`}
          >
            <span className="career-jh-nav-link-icon" aria-hidden="true">
              <NavGlyph icon={item.icon} />
            </span>
            <span className="career-jh-nav-link-copy">
              <strong className="career-jh-nav-link-label">{item.label}</strong>
              <strong className="career-jh-nav-link-label-short">{item.shortLabel}</strong>
              <small>{item.hint}</small>
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
