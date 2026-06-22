import { useState } from "react";
import { api, ApiError } from "../api/client";
import { HMailLogo } from "../components/HMailLogo";
import { useAuth } from "../context/AuthContext";
import type { BusinessVertical } from "../types/mail";
import { WORKSPACE_VERTICAL_ICONS } from "../data/workspaceVerticalIcons";
import "./BusinessVerticalPage.css";

const BUSINESS_VERTICALS: Array<{
  id: BusinessVertical;
  title: string;
  subtitle: string;
  bullets: string[];
  instant?: boolean;
}> = [
  {
    id: "standard",
    title: "Standard",
    subtitle:
      "Explore regular mailing in a unique workspace. All platform tools are available in your environment, upgrade at anytime to use them.",
    bullets: ["Mail workspace", "Platform tools ready", "Upgrade anytime"],
    instant: true,
  },
  {
    id: "free-basic",
    title: "Free / Basic",
    subtitle: "Default PMail+ mailbox workspace for users who want to browse add-ons before subscribing.",
    bullets: ["Mail workspace", "Addon preview", "Paid tools gated"],
  },
  {
    id: "legal",
    title: "Legal & Immigration",
    subtitle: "Matter-ready mail for law firms, immigration teams, and RCIC practices.",
    bullets: ["Client portals", "Compliance logs", "Program checklists"],
  },
  {
    id: "real-estate",
    title: "Real Estate",
    subtitle: "Lead, listing, showing, and deal room workflows for agents and brokerages.",
    bullets: ["Listing board", "Showing scheduler", "Deal room"],
  },
  {
    id: "accounting",
    title: "Accounting",
    subtitle: "Document intake, tax deadlines, secure exchange, and client entity tracking.",
    bullets: ["Document vault", "Tax calendar", "Entity ledger"],
  },
  {
    id: "recruitment",
    title: "Recruitment",
    subtitle: "Candidate pipeline, interviews, outreach campaigns, and placement tracking.",
    bullets: ["Role pipeline", "Interview desk", "Talent search"],
  },
  {
    id: "b2b-services",
    title: "B2B Services",
    subtitle: "Client workspace, delivery, proposal, and SLA workflows for service teams.",
    bullets: ["Client workspaces", "Proposal desk", "SLA monitor"],
  },
  {
    id: "healthcare",
    title: "Healthcare",
    subtitle: "Patient registry, appointments, referrals, and access audit workflows.",
    bullets: ["Patient registry", "Referral tracker", "HIPAA audit"],
  },
];

export function BusinessVerticalPage() {
  const { user, setUser, logout } = useAuth();
  const [selected, setSelected] = useState<BusinessVertical | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const branding = user?.tenant.branding;

  const chooseVertical = async (vertical: BusinessVertical) => {
    setSelected(vertical);
    setSubmitting(true);
    setError("");
    try {
      const result = await api.selectBusinessVertical(vertical);
      setUser(result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not provision workspace");
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="business-vertical-page"
      style={
        branding
          ? ({
              "--brand-primary": branding.primaryColor,
              "--brand-accent": branding.accentColor,
              "--brand-bg": branding.backgroundColor,
            } as React.CSSProperties)
          : undefined
      }
    >
      <header className="business-vertical-topbar">
        <HMailLogo size="sm" showWordmark productName={branding?.productName ?? "PMail+"} subtitle={user?.tenant.name} />
        <button type="button" onClick={() => logout()}>
          Sign out
        </button>
      </header>

      <section className="business-vertical-hero">
        <p className="business-vertical-kicker">Workspace setup</p>
        <h1>Choose Your Business Workspace</h1>
        <p>
          Choose Standard to explore regular mail, Free / Basic to browse add-ons first, or select a paid industry
          workspace. Platform tools stay available in your environment and unlock when you upgrade.
        </p>
      </section>

      {error ? <div className="business-vertical-error">{error}</div> : null}

      <section className="business-vertical-grid" aria-label="Business vertical options">
        {BUSINESS_VERTICALS.map((vertical) => (
          <button
            key={vertical.id}
            type="button"
            className="business-vertical-card"
            onClick={() => void chooseVertical(vertical.id)}
            disabled={submitting}
          >
            <span className="business-vertical-card-icon" aria-hidden="true">
              {selected === vertical.id && submitting ? "…" : WORKSPACE_VERTICAL_ICONS[vertical.id]}
            </span>
            <strong>{vertical.title}</strong>
            <span>{vertical.subtitle}</span>
            <ul>
              {vertical.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </button>
        ))}
      </section>
    </main>
  );
}
