import type { ReactNode } from "react";

type PlatformToolsShellProps = {
  children: ReactNode;
  /** Wide screens: pin form/tools left, scroll results right (E-sign, Email SLA). */
  layout?: "stack" | "split";
  className?: string;
};

export function PlatformToolsShell({ children, layout = "stack", className = "" }: PlatformToolsShellProps) {
  return (
    <div
      className={`mail-view-panel platform-tools-panel platform-tools-panel--enterprise${
        layout === "split" ? " platform-tools-panel--split" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <div className="platform-tools-panel__scroll">
        {children}
        <div className="platform-tools-panel__footer-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}

type PlatformToolsSectionProps = {
  children: ReactNode;
  title?: string;
  /** Sticky on split layout (forms, toolbars). */
  pin?: boolean;
  className?: string;
};

export function PlatformToolsSection({
  children,
  title,
  pin = false,
  className = "",
}: PlatformToolsSectionProps) {
  return (
    <section
      className={`platform-tools-section${pin ? " platform-tools-section--pin" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {title ? <h3 className="platform-tools-section__title">{title}</h3> : null}
      {children}
    </section>
  );
}

type PlatformToolsResultsProps = {
  children: ReactNode;
  title?: string;
};

export function PlatformToolsResults({ children, title }: PlatformToolsResultsProps) {
  return (
    <section className="platform-tools-results">
      {title ? <h3 className="platform-tools-results__title">{title}</h3> : null}
      <div className="platform-tools-results__body">{children}</div>
    </section>
  );
}
