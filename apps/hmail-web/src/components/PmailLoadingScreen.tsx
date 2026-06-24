import { HMailLogo } from "./HMailLogo";
import "./PmailLoadingScreen.css";

type PmailLoadingScreenProps = {
  productName?: string;
  subtitle?: string;
  className?: string;
};

export function PmailLoadingScreen({
  productName = "PMail+",
  subtitle = "Loading your workspace…",
  className = "",
}: PmailLoadingScreenProps) {
  return (
    <div className={`pmail-loading-screen ${className}`.trim()} role="status" aria-live="polite" aria-busy="true">
      <div className="pmail-loading-screen__card">
        <HMailLogo size="xl" showWordmark productName={productName} subtitle={subtitle} />
        <div className="pmail-loading-screen__spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
