import { PmailLoadingScreen } from "./PmailLoadingScreen";

type RouteLoadingFallbackProps = {
  subtitle?: string;
};

export function RouteLoadingFallback({ subtitle = "Loading…" }: RouteLoadingFallbackProps) {
  return <PmailLoadingScreen subtitle={subtitle} className="pmail-loading-screen--overlay" />;
}
