/** Public site URL for a hosted domain (maps demo .local domains to dev origin). */
export function resolvePrimarySiteUrl(domain: string): string {
  const configured = import.meta.env.VITE_HOSTNET_WEB_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const host = domain.trim().toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) {
      return window.location.origin;
    }
  }

  return `https://${domain.replace(/^https?:\/\//, "")}`;
}
