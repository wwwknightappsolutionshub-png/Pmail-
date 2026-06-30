import { getPlatformSeoSettings } from "./platform-seo.service.js";

type GscQueryRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  position?: number;
};

function formatGscDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getGscAccessToken(): Promise<string | null> {
  const settings = await getPlatformSeoSettings();
  const refreshToken =
    settings.gscRefreshToken?.trim() || process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN?.trim();
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim();
  if (!refreshToken || !clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export function buildGscOverviewUrl(propertyUrl?: string | null): string {
  const property = propertyUrl?.trim() || "sc-domain:prohost.cloud";
  return `https://search.google.com/search-console?resource_id=${encodeURIComponent(property)}`;
}

export async function syncPlatformGscAnalytics(): Promise<{
  connected: boolean;
  avgPosition: number | null;
  totalImpressions: number;
  totalClicks: number;
  queryRows: Array<{ keyword: string; position: number; impressions: number; clicks: number }>;
}> {
  const settings = await getPlatformSeoSettings();
  const accessToken = await getGscAccessToken();
  if (!accessToken) {
    return { connected: false, avgPosition: null, totalImpressions: 0, totalClicks: 0, queryRows: [] };
  }

  const siteUrl = encodeURIComponent(settings.gscPropertyUrl?.trim() || "sc-domain:prohost.cloud");
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 28 * 24 * 60 * 60 * 1000);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: formatGscDate(startDate),
        endDate: formatGscDate(endDate),
        dimensions: ["query"],
        rowLimit: 50,
      }),
      signal: AbortSignal.timeout(20000),
    },
  );

  if (!res.ok) {
    return { connected: false, avgPosition: null, totalImpressions: 0, totalClicks: 0, queryRows: [] };
  }

  const data = (await res.json()) as { rows?: GscQueryRow[] };
  const rows = data.rows ?? [];
  let totalImpressions = 0;
  let totalClicks = 0;
  let positionSum = 0;
  let positionWeight = 0;

  const queryRows = rows
    .map((row) => {
      const keyword = row.keys?.[0]?.trim();
      if (!keyword) return null;
      const impressions = row.impressions ?? 0;
      const clicks = row.clicks ?? 0;
      const position = row.position ?? 0;
      totalImpressions += impressions;
      totalClicks += clicks;
      if (impressions > 0) {
        positionSum += position * impressions;
        positionWeight += impressions;
      }
      return { keyword, position, impressions, clicks };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    connected: true,
    avgPosition: positionWeight > 0 ? Math.round((positionSum / positionWeight) * 10) / 10 : null,
    totalImpressions,
    totalClicks,
    queryRows,
  };
}
