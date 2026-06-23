import { NavLink } from "react-router-dom";
import "./CareerJobHunterNav.css";

const JOB_HUNTER_NAV: Array<{ to: string; end?: boolean; label: string; hint: string }> = [
  { to: "/career", end: true, label: "CV Hub", hint: "Template Central" },
  { to: "/career/scan", label: "Scan CV", hint: "ATS benchmark" },
  { to: "/career/build", label: "Build CV", hint: "Wizard builder" },
  { to: "/career/apply", label: "Apply", hint: "Apply Assist" },
  { to: "/career/track", label: "Track", hint: "Applications" },
  { to: "/career/settings", label: "Configure", hint: "Privacy & scan" },
];

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
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
