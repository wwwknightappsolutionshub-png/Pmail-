import { HMailLogo } from "./HMailLogo";
import "./PmailLoadingScreen.css";

type PmailLoadingScreenProps = {
  productName?: string;
  subtitle?: string;
  /** When set, shown as the main heading; productName becomes the subheading. */
  heading?: string;
  className?: string;
};

export function PmailLoadingScreen({
  productName = "PMail+",
  subtitle = "Loading your workspace…",
  heading,
  className = "",
}: PmailLoadingScreenProps) {
  const wordmark = heading ?? productName;
  const subline = heading ? productName : subtitle;

  return (
    <div className={`pmail-loading-screen ${className}`.trim()} role="status" aria-live="polite" aria-busy="true">
      <div className="pmail-loading-screen__card">
        <HMailLogo size="xl" showWordmark productName={wordmark} subtitle={subline} />
        <div className="pmail-loading-screen__spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
