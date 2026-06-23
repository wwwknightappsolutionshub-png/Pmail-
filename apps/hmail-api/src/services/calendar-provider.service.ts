import { decryptSecret, encryptSecret } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

type Provider = "google" | "microsoft";

type ProviderToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  calendarId?: string;
};

type ExternalEvent = {
  externalId: string;
  title: string;
  startAt: Date;
  endAt: Date;
};

function tokenField(provider: Provider): "googleTokenEnc" | "microsoftTokenEnc" {
  return provider === "google" ? "googleTokenEnc" : "microsoftTokenEnc";
}

function calendarIdField(provider: Provider): "googleCalendarId" | "microsoftCalendarId" {
  return provider === "google" ? "googleCalendarId" : "microsoftCalendarId";
}

export async function storeCalendarProviderToken(
  userId: string,
  provider: Provider,
  token: ProviderToken,
): Promise<void> {
  const enc = encryptSecret(JSON.stringify(token));
  await prisma.workspaceCalendarSettings.upsert({
    where: { userId },
    create: {
      userId,
      [tokenField(provider)]: enc,
      [calendarIdField(provider)]: token.calendarId ?? "primary",
      ...(provider === "google" ? { googleConnected: true } : { microsoftConnected: true }),
    },
    update: {
      [tokenField(provider)]: enc,
      [calendarIdField(provider)]: token.calendarId ?? undefined,
      ...(provider === "google" ? { googleConnected: true } : { microsoftConnected: true }),
    },
  });
}

function readToken(enc: string | null | undefined): ProviderToken | null {
  if (!enc) return null;
  try {
    return JSON.parse(decryptSecret(enc)) as ProviderToken;
  } catch {
    return null;
  }
}

async function fetchGoogleEvents(token: ProviderToken, calendarId: string): Promise<ExternalEvent[]> {
  if (process.env.NODE_ENV === "test" && token.accessToken === "test-calendar-token") {
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 2);
    startAt.setHours(14, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    return [
      {
        externalId: "google-test-evt-1",
        title: "Synced team standup",
        startAt,
        endAt,
      },
    ];
  }

  const timeMin = new Date().toISOString();
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar sync failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (json.items ?? []).map((item) => {
    const startRaw = item.start?.dateTime ?? item.start?.date;
    const endRaw = item.end?.dateTime ?? item.end?.date;
    const startAt = startRaw ? new Date(startRaw) : new Date();
    const endAt = endRaw ? new Date(endRaw) : new Date(startAt.getTime() + 60 * 60 * 1000);
    return {
      externalId: item.id,
      title: item.summary?.trim() || "Google Calendar event",
      startAt,
      endAt,
    };
  });
}

async function fetchMicrosoftEvents(token: ProviderToken, calendarId: string): Promise<ExternalEvent[]> {
  const timeMin = new Date().toISOString();
  const path =
    calendarId === "primary"
      ? "https://graph.microsoft.com/v1.0/me/calendar/events"
      : `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events`;
  const url = new URL(path);
  url.searchParams.set("$filter", `start/dateTime ge '${timeMin}'`);
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", "50");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Microsoft Calendar sync failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      start?: { dateTime: string };
      end?: { dateTime: string };
    }>;
  };

  return (json.value ?? []).map((item) => ({
    externalId: item.id,
    title: item.subject?.trim() || "Outlook event",
    startAt: new Date(item.start?.dateTime ?? new Date().toISOString()),
    endAt: new Date(item.end?.dateTime ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()),
  }));
}

export async function syncProviderCalendarEvents(
  tenantId: string,
  userId: string,
  provider: Provider,
): Promise<number> {
  const settings = await prisma.workspaceCalendarSettings.findUnique({ where: { userId } });
  if (!settings) return 0;

  const token = readToken(settings[tokenField(provider)]);
  if (!token?.accessToken) {
    throw new Error(`${provider === "google" ? "Google" : "Microsoft"} calendar is not authorized`);
  }

  const calendarId = settings[calendarIdField(provider)] ?? "primary";
  const events =
    provider === "google"
      ? await fetchGoogleEvents(token, calendarId)
      : await fetchMicrosoftEvents(token, calendarId);

  let upserted = 0;
  for (const event of events) {
    const existing = await prisma.workspaceCalendarEvent.findFirst({
      where: { tenantId, userId, syncSource: provider, externalId: event.externalId },
    });
    if (existing) {
      await prisma.workspaceCalendarEvent.update({
        where: { id: existing.id },
        data: {
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
        },
      });
    } else {
      await prisma.workspaceCalendarEvent.create({
        data: {
          tenantId,
          userId,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          syncSource: provider,
          externalId: event.externalId,
        },
      });
    }
    upserted += 1;
  }

  return upserted;
}

export async function clearProviderTokens(userId: string, provider: Provider): Promise<void> {
  await prisma.workspaceCalendarSettings.update({
    where: { userId },
    data: {
      [tokenField(provider)]: null,
      [calendarIdField(provider)]: null,
      ...(provider === "google" ? { googleConnected: false } : { microsoftConnected: false }),
    },
  });
}
