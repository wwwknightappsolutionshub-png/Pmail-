import type { ReactNode } from "react";
import "./ProductionWorkspaceFrame.css";

type ProductionWorkspaceFrameProps = {
  title: string;
  children: ReactNode;
};

export function ProductionWorkspaceFrame({ title, children }: ProductionWorkspaceFrameProps) {
  return (
    <section className="production-workspace-frame" aria-label={title}>
      <header className="list-header list-header--virtual production-workspace-frame__header">
        <div className="list-header-main">
          <h2>{title}</h2>
        </div>
      </header>
      <div className="production-workspace-frame__body">{children}</div>
    </section>
  );
}
