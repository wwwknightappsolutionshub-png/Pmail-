import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type CareerFeature = {
  title: string;
  description: string;
  icon: ReactNode;
};

type CareerGateViewProps = {
  eyebrow: string;
  title: string;
  description: string;
  features: CareerFeature[];
  steps?: Array<{ title: string; detail: string }>;
  error?: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
};

function FeatureIcon({ children }: { children: ReactNode }) {
  return <span className="career-gate-feature-icon">{children}</span>;
}

export const CAREER_LOCKED_FEATURES: CareerFeature[] = [
  {
    title: "Application history",
    description: "Track every role you apply to from sent mail and recruiter replies.",
    icon: (
      <FeatureIcon>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm2 2h8v1.5H8V10zm0 3h5v1.5H8V13z" fill="currentColor" />
        </svg>
      </FeatureIcon>
    ),
  },
  {
    title: "CV builder",
    description: "Build and export a polished CV with a guided step-by-step wizard.",
    icon: (
      <FeatureIcon>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 1.5V9h4.5L13 4.5zM8 11h8v1.5H8V11zm0 3h8v1.5H8V14zm0 3h5v1.5H8V17z"
            fill="currentColor"
          />
        </svg>
      </FeatureIcon>
    ),
  },
  {
    title: "Interview prep",
    description: "Generate tailored talking points and practice questions per application.",
    icon: (
      <FeatureIcon>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2a7 7 0 0 0-4 12.74V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3.26A7 7 0 0 0 12 2zm0 2a5 5 0 0 1 3.16 8.9l-.41.27V18h-5.5v-4.83l-.41-.27A5 5 0 0 1 12 4zm-1 19h2v1.5h-2V23z"
            fill="currentColor"
          />
        </svg>
      </FeatureIcon>
    ),
  },
];

export const CAREER_MARKETPLACE_FEATURES: CareerFeature[] = [
  {
    title: "Mail scanning",
    description: "Detect job applications and recruiter threads automatically from your inbox.",
    icon: CAREER_LOCKED_FEATURES[0].icon,
  },
  {
    title: "Career tools",
    description: "CV builder, ATS scanner, job sites, and apply assist in one workspace.",
    icon: CAREER_LOCKED_FEATURES[1].icon,
  },
  {
    title: "Privacy controls",
    description: "Choose which mailboxes to scan and pause inference whenever you need.",
    icon: CAREER_LOCKED_FEATURES[2].icon,
  },
];

export function CareerGateView({
  eyebrow,
  title,
  description,
  features,
  steps,
  error,
  primaryAction,
  secondaryAction,
}: CareerGateViewProps) {
  return (
    <section className="career-gate">
      <div className="career-gate-hero">
        <div className="career-gate-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 2a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V7a3 3 0 0 1 3-3zm-1 10a1 1 0 0 1 2 0v3a1 1 0 0 1-2 0v-3z"
              fill="currentColor"
            />
          </svg>
        </div>
        <p className="career-gate-eyebrow">{eyebrow}</p>
        <h1 className="career-gate-title">{title}</h1>
        <p className="career-gate-description">{description}</p>
        {error ? <p className="career-workspace-error career-gate-error">{error}</p> : null}
        <div className="career-gate-actions">
          {primaryAction}
          {secondaryAction}
        </div>
      </div>

      <div className="career-gate-features">
        {features.map((feature) => (
          <article key={feature.title} className="career-gate-feature">
            {feature.icon}
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </div>

      {steps && steps.length > 0 ? (
        <div className="career-gate-steps">
          <h3>How to unlock</h3>
          <ol>
            {steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

export function CareerGatePrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="career-workspace-btn career-workspace-btn--primary" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function CareerGateSecondaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="career-workspace-btn career-workspace-btn--secondary" to={to}>
      {children}
    </Link>
  );
}
