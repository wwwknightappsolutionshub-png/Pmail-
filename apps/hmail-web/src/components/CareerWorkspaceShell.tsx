import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HMailLogo } from "./HMailLogo";
import "../pages/CareerWorkspacePage.css";

type CareerWorkspaceShellProps = {
  children: ReactNode;
  headerAction?: ReactNode;
  wide?: boolean;
  centered?: boolean;
};

export function CareerWorkspaceShell({
  children,
  headerAction,
  wide = false,
  centered = false,
}: CareerWorkspaceShellProps) {
  return (
    <div className="career-workspace-page">
      <header className="career-workspace-header">
        <div className="career-workspace-header-brand">
          <HMailLogo showWordmark productName="PMail+" />
          <span className="career-workspace-header-badge">Career</span>
        </div>
        <div className="career-workspace-header-actions">
          {headerAction ?? (
            <Link className="career-workspace-header-link" to="/">
              Back to mail
            </Link>
          )}
        </div>
      </header>

      <main
        className={`career-workspace-body${wide ? " career-workspace-body--wide" : ""}${
          centered ? " career-workspace-body--centered" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
