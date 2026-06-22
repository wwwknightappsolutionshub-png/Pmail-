import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";

const DEFAULT_STAGES = [
  { slug: "lead", label: "Lead", sortOrder: 0 },
  { slug: "active", label: "Active", sortOrder: 1 },
  { slug: "negotiation", label: "Negotiation", sortOrder: 2 },
  { slug: "won", label: "Won", sortOrder: 3 },
  { slug: "inactive", label: "Inactive", sortOrder: 4 },
];

export async function ensurePipelineStages(tenantId: string) {
  const count = await prisma.crmPipelineStage.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.crmPipelineStage.createMany({
    data: DEFAULT_STAGES.map((stage) => ({ tenantId, ...stage })),
  });
}

export async function listPipelineStages(tenantId: string) {
  await ensurePipelineStages(tenantId);
  return prisma.crmPipelineStage.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listCrmRecords(tenantId: string, userId: string, search?: string) {
  return prisma.crmRecord.findMany({
    where: {
      tenantId,
      userId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { organization: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createCrmRecord(
  tenantId: string,
  userId: string,
  input: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    stage?: string;
    notes?: string;
  },
) {
  if (!input.name.trim() || !input.email.trim()) throw new Error("Name and email are required");
  return prisma.crmRecord.create({
    data: {
      tenantId,
      userId,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      organization: input.organization?.trim() || null,
      stage: input.stage?.trim() || "lead",
      notes: input.notes?.trim() || null,
      lastActivity: "Added just now",
    },
  });
}

export async function updateCrmRecord(
  tenantId: string,
  userId: string,
  id: string,
  input: Partial<{
    name: string;
    phone: string;
    organization: string;
    stage: string;
    notes: string;
    lastActivity: string;
  }>,
) {
  const row = await prisma.crmRecord.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("CRM record not found");
  return prisma.crmRecord.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      phone: input.phone?.trim() ?? undefined,
      organization: input.organization?.trim() ?? undefined,
      stage: input.stage?.trim() ?? undefined,
      notes: input.notes?.trim() ?? undefined,
      lastActivity: input.lastActivity ?? "Updated just now",
    },
  });
}

export async function deleteCrmRecord(tenantId: string, userId: string, id: string) {
  const row = await prisma.crmRecord.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("CRM record not found");
  await prisma.crmRecord.delete({ where: { id } });
}

export async function listReminders(
  tenantId: string,
  userId: string,
  status?: "pending" | "done" | "all",
) {
  return prisma.workspaceReminder.findMany({
    where: {
      tenantId,
      userId,
      ...(status && status !== "all" ? { status } : {}),
    },
    orderBy: { dueAt: "asc" },
    include: { crmRecord: true },
  });
}

export async function createReminder(
  tenantId: string,
  userId: string,
  input: {
    title: string;
    dueAt: string;
    crmRecordId?: string;
    channel?: string;
  },
) {
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");
  if (!input.title.trim()) throw new Error("Title is required");
  return prisma.workspaceReminder.create({
    data: {
      tenantId,
      userId,
      title: input.title.trim(),
      dueAt,
      crmRecordId: input.crmRecordId || null,
      channel: input.channel ?? "email",
      status: "pending",
    },
  });
}

export async function updateReminder(
  tenantId: string,
  userId: string,
  id: string,
  input: Partial<{ title: string; dueAt: string; status: string; channel: string }>,
) {
  const row = await prisma.workspaceReminder.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("Reminder not found");
  return prisma.workspaceReminder.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? undefined,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      status: input.status ?? undefined,
      channel: input.channel ?? undefined,
    },
  });
}

export async function deleteReminder(tenantId: string, userId: string, id: string) {
  const row = await prisma.workspaceReminder.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("Reminder not found");
  await prisma.workspaceReminder.delete({ where: { id } });
}

export async function listCalendarEvents(
  tenantId: string,
  userId: string,
  from?: string,
  to?: string,
) {
  const startFilter: { gte?: Date; lte?: Date } = {};
  if (from) {
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) throw new Error("Invalid from date");
    startFilter.gte = fromDate;
  }
  if (to) {
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) throw new Error("Invalid to date");
    startFilter.lte = toDate;
  }

  return prisma.workspaceCalendarEvent.findMany({
    where: {
      tenantId,
      userId,
      ...(Object.keys(startFilter).length ? { startAt: startFilter } : {}),
    },
    orderBy: { startAt: "asc" },
  });
}

export async function createCalendarEvent(
  tenantId: string,
  userId: string,
  input: {
    title: string;
    startAt: string;
    endAt?: string;
    allDay?: boolean;
    location?: string;
    notes?: string;
  },
) {
  const startAt = new Date(input.startAt);
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start date");
  if (!input.title.trim()) throw new Error("Title is required");
  const endAt = input.endAt ? new Date(input.endAt) : null;
  if (endAt && Number.isNaN(endAt.getTime())) throw new Error("Invalid end date");

  await prisma.workspaceCalendarEvent.create({
    data: {
      tenantId,
      userId,
      title: input.title.trim(),
      startAt,
      endAt,
      allDay: input.allDay ?? false,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      syncSource: "local",
    },
  });

  await applyCalendarReminderSequences(tenantId, userId);

  return prisma.workspaceCalendarEvent.findFirstOrThrow({
    where: { tenantId, userId, title: input.title.trim(), startAt },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateCalendarEvent(
  tenantId: string,
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    startAt: string;
    endAt: string | null;
    allDay: boolean;
    location: string;
    notes: string;
  }>,
) {
  const row = await prisma.workspaceCalendarEvent.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("Event not found");

  let endAt: Date | null | undefined;
  if (input.endAt === null) {
    endAt = null;
  } else if (input.endAt) {
    endAt = new Date(input.endAt);
    if (Number.isNaN(endAt.getTime())) throw new Error("Invalid end date");
  }

  return prisma.workspaceCalendarEvent.update({
    where: { id },
    data: {
      title: input.title?.trim() ?? undefined,
      startAt: input.startAt ? new Date(input.startAt) : undefined,
      endAt,
      allDay: input.allDay ?? undefined,
      location: input.location?.trim() ?? undefined,
      notes: input.notes?.trim() ?? undefined,
    },
  });
}

export async function deleteCalendarEvent(tenantId: string, userId: string, id: string) {
  const row = await prisma.workspaceCalendarEvent.findFirst({ where: { id, tenantId, userId } });
  if (!row) throw new Error("Event not found");
  await prisma.workspaceCalendarEvent.delete({ where: { id } });
}

export type CalendarReminderTrigger = {
  id: string;
  label: string;
  daysBefore: number;
  hoursBefore: number;
  channel: "email" | "in-app";
};

export type CalendarReminderSequence = {
  id: string;
  name: string;
  crmRecordId?: string | null;
  active: boolean;
  triggers: CalendarReminderTrigger[];
};

const DEFAULT_REMINDER_SEQUENCES: CalendarReminderSequence[] = [
  {
    id: "seq-default",
    name: "Client appointment reminders",
    active: true,
    triggers: [
      { id: "t-7d", label: "7 days before", daysBefore: 7, hoursBefore: 0, channel: "email" },
      { id: "t-1d", label: "1 day before", daysBefore: 1, hoursBefore: 0, channel: "email" },
      { id: "t-2h", label: "2 hours before", daysBefore: 0, hoursBefore: 2, channel: "in-app" },
    ],
  },
];

function parseReminderSequences(raw: string): CalendarReminderSequence[] {
  try {
    const parsed = JSON.parse(raw) as CalendarReminderSequence[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REMINDER_SEQUENCES;
  } catch {
    return DEFAULT_REMINDER_SEQUENCES;
  }
}

async function getOrCreateCalendarSettings(userId: string) {
  const existing = await prisma.workspaceCalendarSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.workspaceCalendarSettings.create({
    data: {
      userId,
      reminderSequencesJson: JSON.stringify(DEFAULT_REMINDER_SEQUENCES),
    },
  });
}

export async function getCalendarSettings(tenantId: string, userId: string) {
  const settings = await getOrCreateCalendarSettings(userId);
  return {
    googleConnected: settings.googleConnected,
    microsoftConnected: settings.microsoftConnected,
    lastSyncAt: settings.lastSyncAt?.toISOString() ?? null,
    capacityHoursPerWeek: settings.capacityHoursPerWeek,
    reminderSequences: parseReminderSequences(settings.reminderSequencesJson),
  };
}

export async function updateCalendarSettings(
  userId: string,
  input: Partial<{ capacityHoursPerWeek: number }>,
) {
  await getOrCreateCalendarSettings(userId);
  return prisma.workspaceCalendarSettings.update({
    where: { userId },
    data: {
      capacityHoursPerWeek: input.capacityHoursPerWeek ?? undefined,
    },
  });
}

async function seedProviderEvents(
  tenantId: string,
  userId: string,
  provider: "google" | "microsoft",
) {
  const existing = await prisma.workspaceCalendarEvent.count({
    where: { tenantId, userId, syncSource: provider },
  });
  if (existing > 0) return;

  const base = new Date();
  base.setDate(base.getDate() + (provider === "google" ? 2 : 4));
  const firstStart = new Date(base);
  firstStart.setHours(10, 0, 0, 0);
  const firstEnd = new Date(firstStart);
  firstEnd.setHours(11, 0, 0, 0);

  const secondDay = new Date(base);
  secondDay.setDate(secondDay.getDate() + 1);
  const secondStart = new Date(secondDay);
  secondStart.setHours(14, 30, 0, 0);
  const secondEnd = new Date(secondStart);
  secondEnd.setHours(15, 30, 0, 0);

  const prefix = provider === "google" ? "Google Calendar" : "Microsoft Outlook";
  const rows = [
    {
      tenantId,
      userId,
      title: `${prefix}: Client review`,
      startAt: firstStart,
      endAt: firstEnd,
      syncSource: provider,
    },
    {
      tenantId,
      userId,
      title: `${prefix}: Team coverage block`,
      startAt: secondStart,
      endAt: secondEnd,
      syncSource: provider,
    },
  ];

  await prisma.workspaceCalendarEvent.createMany({ data: rows });
}

function reminderDueFromEvent(startAt: Date, trigger: CalendarReminderTrigger): Date {
  const due = new Date(startAt);
  due.setDate(due.getDate() - trigger.daysBefore);
  due.setHours(due.getHours() - trigger.hoursBefore);
  return due;
}

async function applyCalendarReminderSequences(tenantId: string, userId: string) {
  const settings = await getOrCreateCalendarSettings(userId);
  const sequences = parseReminderSequences(settings.reminderSequencesJson).filter((seq) => seq.active);
  if (sequences.length === 0) return;

  const events = await prisma.workspaceCalendarEvent.findMany({
    where: { tenantId, userId, startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  });

  for (const event of events) {
    for (const sequence of sequences) {
      if (sequence.crmRecordId && event.crmRecordId !== sequence.crmRecordId) continue;
      for (const trigger of sequence.triggers) {
        const title = `${sequence.name}: ${event.title}`;
        const dueAt = reminderDueFromEvent(event.startAt, trigger);
        const existing = await prisma.workspaceReminder.findFirst({
          where: { tenantId, userId, title, dueAt },
        });
        if (existing) continue;
        await prisma.workspaceReminder.create({
          data: {
            tenantId,
            userId,
            title,
            dueAt,
            crmRecordId: event.crmRecordId,
            channel: trigger.channel,
            status: "pending",
          },
        });
      }
    }
  }
}

export async function setCalendarProviderConnection(
  tenantId: string,
  userId: string,
  provider: "google" | "microsoft",
  connected: boolean,
) {
  await getOrCreateCalendarSettings(userId);

  if (connected) {
    await prisma.workspaceCalendarSettings.update({
      where: { userId },
      data: provider === "google" ? { googleConnected: true } : { microsoftConnected: true },
    });
    await seedProviderEvents(tenantId, userId, provider);
  } else {
    await prisma.workspaceCalendarEvent.deleteMany({
      where: { tenantId, userId, syncSource: provider },
    });
    await prisma.workspaceCalendarSettings.update({
      where: { userId },
      data: provider === "google" ? { googleConnected: false } : { microsoftConnected: false },
    });
  }

  await syncCalendarProviders(tenantId, userId);
}

export async function syncCalendarProviders(tenantId: string, userId: string) {
  const settings = await getOrCreateCalendarSettings(userId);
  if (settings.googleConnected) await seedProviderEvents(tenantId, userId, "google");
  if (settings.microsoftConnected) await seedProviderEvents(tenantId, userId, "microsoft");

  await prisma.workspaceCalendarSettings.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  });

  await applyCalendarReminderSequences(tenantId, userId);
}

export async function updateCalendarReminderSequences(userId: string, sequences: CalendarReminderSequence[]) {
  await getOrCreateCalendarSettings(userId);
  return prisma.workspaceCalendarSettings.update({
    where: { userId },
    data: { reminderSequencesJson: JSON.stringify(sequences) },
  });
}

export async function getCalendarTeamCapacity(tenantId: string, weekStartIso?: string) {
  const weekStart = weekStartIso ? new Date(weekStartIso) : new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const users = await prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, email: true, displayName: true },
    orderBy: { email: "asc" },
  });

  const rows = await Promise.all(
    users.map(async (member) => {
      const settings = await prisma.workspaceCalendarSettings.findUnique({ where: { userId: member.id } });
      const hoursAvailable = settings?.capacityHoursPerWeek ?? 40;
      const events = await prisma.workspaceCalendarEvent.findMany({
        where: {
          tenantId,
          userId: member.id,
          startAt: { gte: weekStart, lt: weekEnd },
        },
      });
      let hoursBooked = 0;
      for (const event of events) {
        const end = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
        hoursBooked += Math.max(0, (end.getTime() - event.startAt.getTime()) / (1000 * 60 * 60));
      }
      hoursBooked = Math.round(hoursBooked * 10) / 10;
      const utilization = hoursAvailable > 0 ? Math.min(100, Math.round((hoursBooked / hoursAvailable) * 100)) : 0;
      const coverage = utilization >= 90 ? "high" : utilization >= 70 ? "medium" : "ok";
      return {
        userId: member.id,
        displayName: member.displayName ?? member.email,
        email: member.email,
        eventCount: events.length,
        hoursBooked,
        hoursAvailable,
        utilization,
        coverage,
      };
    }),
  );

  return { weekStart: weekStart.toISOString(), members: rows };
}

const INDUSTRY_TOOL_DEFAULTS: Record<string, Record<string, unknown>> = {
  "matter-registry": { title: "Matter registry", activeCount: 14, items: [] },
  "deadline-guard": { title: "Deadline guard", dueThisWeek: 3, items: [] },
  "listing-board": { title: "Listing board", activeListings: 8, items: [] },
  "patient-registry": { title: "Patient registry", activeCharts: 12, items: [] },
};

export async function getIndustryToolState(
  tenantId: string,
  userId: string,
  toolSlug: string,
): Promise<Record<string, unknown>> {
  const row = await prisma.industryToolState.findUnique({
    where: { tenantId_userId_toolSlug: { tenantId, userId, toolSlug } },
  });
  if (row) return JSON.parse(row.stateJson) as Record<string, unknown>;
  return INDUSTRY_TOOL_DEFAULTS[toolSlug] ?? { title: toolSlug, items: [] };
}

export async function saveIndustryToolState(
  tenantId: string,
  userId: string,
  toolSlug: string,
  state: Record<string, unknown>,
) {
  const stateJson = JSON.stringify(state);
  return prisma.industryToolState.upsert({
    where: { tenantId_userId_toolSlug: { tenantId, userId, toolSlug } },
    create: { tenantId, userId, toolSlug, stateJson },
    update: { stateJson },
  });
}

export async function runIndustryToolAction(
  tenantId: string,
  userId: string,
  toolSlug: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const state = await getIndustryToolState(tenantId, userId, toolSlug);
  const items = Array.isArray(state.items) ? [...(state.items as unknown[])] : [];

  if (action === "add-item" && typeof payload.label === "string") {
    items.push({ id: randomBytes(6).toString("hex"), label: payload.label, createdAt: new Date().toISOString() });
    state.items = items;
    if (typeof state.activeCount === "number") state.activeCount = items.length;
  } else if (action === "remove-item" && typeof payload.id === "string") {
    state.items = items.filter((item) => (item as { id?: string }).id !== payload.id);
  }

  await saveIndustryToolState(tenantId, userId, toolSlug, state);
  return state;
}
