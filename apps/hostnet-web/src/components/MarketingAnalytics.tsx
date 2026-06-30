import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function injectGtag(measurementId: string) {
  if (document.getElementById("ga4-script")) return;

  const script = document.createElement("script");
  script.id = "ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

export function MarketingAnalytics() {
  useEffect(() => {
    const envId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
    if (envId) {
      injectGtag(envId);
      return;
    }

    let cancelled = false;
    void fetch("/api/public/site-seo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { platformSeo?: { ga4MeasurementId?: string | null } } | null) => {
        if (cancelled) return;
        const id = data?.platformSeo?.ga4MeasurementId?.trim();
        if (id) injectGtag(id);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
