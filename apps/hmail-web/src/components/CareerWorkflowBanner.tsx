import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";

type WorkflowStep = {
  id: string;
  label: string;
  hint: string;
  to: string;
  done: boolean;
};

export function CareerWorkflowBanner() {
  const location = useLocation();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [settingsRes, appsRes, cvRes] = await Promise.all([
          api.getJobHunterSettings(),
          api.listJobApplications(),
          api.listJobHunterCvDocuments(),
        ]);
        if (cancelled) return;

        const settings = settingsRes.settings;
        const settingsReady =
          !settings.needsTierBDisclosure && settings.enabled && settings.careerNavUnlocked;
        const hasApplications = appsRes.applications.length > 0;
        const hasCv = cvRes.documents.length > 0;

        setSteps([
          {
            id: "settings",
            label: "Configure",
            hint: "Privacy & scan",
            to: "/career/settings",
            done: settingsReady,
          },
          {
            id: "history",
            label: "Track",
            hint: "Sync applications",
            to: "/career",
            done: hasApplications,
          },
          {
            id: "cv",
            label: "Build CV",
            hint: "Wizard builder",
            to: "/career/build",
            done: hasCv,
          },
          {
            id: "scanner",
            label: "Scan CV",
            hint: "ATS score",
            to: "/career/scanner",
            done: false,
          },
          {
            id: "apply",
            label: "Apply",
            hint: "Assist & prep",
            to: "/career/apply-assist",
            done: false,
          },
        ]);
      } catch {
        if (!cancelled) setSteps([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (steps.length === 0) return null;

  function stepIsActive(step: WorkflowStep): boolean {
    if (step.to === "/career") {
      return location.pathname === "/career" || location.pathname === "/career/";
    }
    return location.pathname === step.to || location.pathname.startsWith(`${step.to}/`);
  }

  const completedCount = steps.filter((step) => step.done).length;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => stepIsActive(step)),
  );

  return (
    <nav className="career-workflow-banner" aria-label="Career workflow">
      <div className="career-workflow-banner-head">
        <div>
          <p className="career-workflow-banner-lead">Your workflow</p>
          <p className="career-workflow-banner-progress">
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <div className="career-workflow-banner-meter" aria-hidden="true">
          <span style={{ width: `${(completedCount / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="career-workflow-steps">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = step.done;
          return (
            <li
              key={step.id}
              className={`career-workflow-step${isCurrent ? " career-workflow-step--current" : ""}${
                isComplete ? " career-workflow-step--done" : ""
              }`}
            >
              <Link to={step.to} className="career-workflow-step-link">
                <span className="career-workflow-step-index">{isComplete ? "✓" : index + 1}</span>
                <span className="career-workflow-step-text">
                  <strong>{step.label}</strong>
                  <small>{step.hint}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
