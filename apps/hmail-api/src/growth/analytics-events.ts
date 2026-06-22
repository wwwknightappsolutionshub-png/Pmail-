export const GROWTH_ANALYTICS_EVENT_TYPES = [
  "page_view",
  "form_submit",
  "chat_open",
  "chat_complete",
] as const;

export type GrowthAnalyticsEventType = (typeof GROWTH_ANALYTICS_EVENT_TYPES)[number];

export function isGrowthAnalyticsEventType(value: string): value is GrowthAnalyticsEventType {
  return (GROWTH_ANALYTICS_EVENT_TYPES as readonly string[]).includes(value);
}

export function parseUtmFromSearch(search: string): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return {
    utmSource: params.get("utm_source") ?? params.get("utmSource") ?? undefined,
    utmMedium: params.get("utm_medium") ?? params.get("utmMedium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? params.get("utmCampaign") ?? undefined,
  };
}
