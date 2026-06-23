import { randomBytes } from "node:crypto";
import { getEnv } from "../config/env.js";
import {
  buildSlaReferencesHeader,
  buildSlaThreadKey,
  computeSlaAtRiskAt,
  computeSlaDeadline,
  computeSlaThreadStatus,
  formatSlaDuration,
  normalizeSlaSubject,
  remainingMs,
  type MailSlaAlertType,
  type MailSlaThreadStatus,
} from "../lib/email-sla.js";
import { extractEmailAddress } from "../lib/list-unsubscribe.js";
import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import { readStoredFile, saveStoredFile } from "./file-storage.service.js";
import {
  scanInboundMessagesForSla,
  type MailCredentials,
  type SlaInboundMessage,
} from "./imap.service.js";

export const EMAIL_SLA_TRACKER_ADDON_SLUG = "email-sla-tracker-functionality";
const REPORT_NAMESPACE = "email-sla";
const REPORT_MIME = { "text/csv": ".csv" };

function maxScan(): number {
  return getEnv().EMAIL_SLA_MAX_SCAN;
}

function defaultResponseHours(): number {
  return getEnv().EMAIL_SLA_DEFAULT_HOURS;
}

function defaultAtRiskRatio(): number {
  return getEnv().EMAIL_SLA_AT_RISK_RATIO;
}

function reportLinkTtlDays(): number {
  return getEnv().EMAIL_SLA_REPORT_LINK_TTL_DAYS;
}

function shouldSkipImap(credentials: MailCredentials): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return credentials.mailConfig.imapHost === "local.pmail.test";
}

export function createSlaReportDownloadToken(): string {
  return randomBytes(24).toString("hex");
}

export function buildSlaReportDownloadUrl(token: string, apiPublicBase: string): string {
  const base = apiPublicBase.replace(/\/$/, "");
  return `${base}/api/public/sla-report/${token}`;
}

function defaultReportExpiresAt(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + reportLinkTtlDays());
  return expires;
}

async function getOrCreateSettings(tenantId: string, userId: string) {
  const existing = await prisma.userMailSlaSettings.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userMailSlaSettings.create({
    data: {
      tenantId,
      userId,
      responseHours: defaultResponseHours(),
      atRiskRatio: defaultAtRiskRatio(),
      scanFolder: "INBOX",
      enabled: true,
    },
  });
}

function serializeSettings(row: {
  responseHours: number;
  atRiskRatio: number;
  scanFolder: string;
  enabled: boolean;
  updatedAt: Date;
}) {
  return {
    responseHours: row.responseHours,
    atRiskRatio: row.atRiskRatio,
    scanFolder: row.scanFolder,
    enabled: row.enabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeThread(row: {
  id: string;
  threadKey: string;
  folder: string;
  messageUid: number;
  subject: string;
  fromEmail: string;
  fromDisplay: string;
  messageId: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  firstInboundAt: Date;
  lastInboundAt: Date;
  deadlineAt: Date;
  atRiskAt: Date;
  respondedAt: Date | null;
  dismissedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const status = computeSlaThreadStatus({
    status: row.status,
    respondedAt: row.respondedAt,
    dismissedAt: row.dismissedAt,
    firstInboundAt: row.firstInboundAt,
    deadlineAt: row.deadlineAt,
    atRiskAt: row.atRiskAt,
  });
  const now = new Date();
  const overdue = status === "breached";
  return {
    id: row.id,
    threadKey: row.threadKey,
    folder: row.folder,
    messageUid: row.messageUid,
    subject: row.subject,
    normalizedSubject: normalizeSlaSubject(row.subject),
    fromEmail: row.fromEmail,
    fromDisplay: row.fromDisplay,
    messageId: row.messageId,
    inReplyTo: row.inReplyTo,
    referencesHeader: row.referencesHeader,
    firstInboundAt: row.firstInboundAt.toISOString(),
    lastInboundAt: row.lastInboundAt.toISOString(),
    deadlineAt: row.deadlineAt.toISOString(),
    atRiskAt: row.atRiskAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    dismissedAt: row.dismissedAt?.toISOString() ?? null,
    status,
    remainingMs: status === "responded" || status === "dismissed" ? 0 : remainingMs(row.deadlineAt, now),
    remainingLabel:
      status === "responded" || status === "dismissed"
        ? null
        : overdue
          ? `Overdue by ${formatSlaDuration(now.getTime() - row.deadlineAt.getTime())}`
          : `${formatSlaDuration(remainingMs(row.deadlineAt, now))} left`,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureAlert(input: {
  tenantId: string;
  userId: string;
  threadId: string;
  alertType: MailSlaAlertType;
}) {
  const existing = await prisma.mailSlaAlert.findFirst({
    where: {
      threadId: input.threadId,
      alertType: input.alertType,
      acknowledgedAt: null,
    },
  });
  if (existing) return existing;

  return prisma.mailSlaAlert.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      threadId: input.threadId,
      alertType: input.alertType,
    },
  });
}

async function upsertInboundMessage(input: {
  tenantId: string;
  userId: string;
  settings: { responseHours: number; atRiskRatio: number };
  folder: string;
  message: SlaInboundMessage;
}) {
  const threadKey = buildSlaThreadKey(input.message.subject, input.message.fromEmail);
  const firstInboundAt = new Date(input.message.date);
  const deadlineAt = computeSlaDeadline(firstInboundAt, input.settings.responseHours);
  const atRiskAt = computeSlaAtRiskAt(
    firstInboundAt,
    input.settings.responseHours,
    input.settings.atRiskRatio,
  );

  const existing = await prisma.mailSlaThread.findUnique({
    where: { userId_threadKey: { userId: input.userId, threadKey } },
  });

  if (!existing) {
    const status = computeSlaThreadStatus({
      status: "open",
      respondedAt: null,
      dismissedAt: null,
      firstInboundAt,
      deadlineAt,
      atRiskAt,
    });
    const row = await prisma.mailSlaThread.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        threadKey,
        folder: input.folder,
        messageUid: input.message.uid,
        subject: input.message.subject,
        fromEmail: input.message.fromEmail,
        fromDisplay: input.message.fromDisplay,
        messageId: input.message.messageId,
        inReplyTo: input.message.inReplyTo,
        referencesHeader: input.message.referencesHeader,
        firstInboundAt,
        lastInboundAt: firstInboundAt,
        deadlineAt,
        atRiskAt,
        status,
      },
    });
    if (status === "at_risk") {
      await ensureAlert({ tenantId: input.tenantId, userId: input.userId, threadId: row.id, alertType: "at_risk" });
    }
    if (status === "breached") {
      await ensureAlert({ tenantId: input.tenantId, userId: input.userId, threadId: row.id, alertType: "breached" });
    }
    return { created: true, updated: false };
  }

  if (existing.status === "dismissed") {
    return { created: false, updated: false };
  }

  const inboundMs = firstInboundAt.getTime();
  const lastRespondedMs = existing.respondedAt?.getTime() ?? 0;
  const isNewInbound = inboundMs > lastRespondedMs && inboundMs > existing.lastInboundAt.getTime();

  const firstInbound = isNewInbound ? firstInboundAt : existing.firstInboundAt;
  const nextDeadline = isNewInbound
    ? computeSlaDeadline(firstInboundAt, input.settings.responseHours)
    : existing.deadlineAt;
  const nextAtRisk = isNewInbound
    ? computeSlaAtRiskAt(firstInboundAt, input.settings.responseHours, input.settings.atRiskRatio)
    : existing.atRiskAt;

  const respondedAt = isNewInbound ? null : existing.respondedAt;
  const status = computeSlaThreadStatus({
    status: isNewInbound ? "open" : existing.status,
    respondedAt,
    dismissedAt: existing.dismissedAt,
    firstInboundAt: firstInbound,
    deadlineAt: nextDeadline,
    atRiskAt: nextAtRisk,
  });

  const row = await prisma.mailSlaThread.update({
    where: { id: existing.id },
    data: {
      folder: input.folder,
      messageUid: input.message.uid,
      subject: input.message.subject,
      fromEmail: input.message.fromEmail,
      fromDisplay: input.message.fromDisplay,
      messageId: input.message.messageId,
      inReplyTo: input.message.inReplyTo,
      referencesHeader: input.message.referencesHeader,
      firstInboundAt: firstInbound,
      lastInboundAt: isNewInbound ? firstInboundAt : existing.lastInboundAt,
      deadlineAt: nextDeadline,
      atRiskAt: nextAtRisk,
      respondedAt,
      status,
    },
  });

  if (status === "at_risk") {
    await ensureAlert({ tenantId: input.tenantId, userId: input.userId, threadId: row.id, alertType: "at_risk" });
  }
  if (status === "breached") {
    await ensureAlert({ tenantId: input.tenantId, userId: input.userId, threadId: row.id, alertType: "breached" });
  }

  return { created: false, updated: true };
}

async function refreshOpenThreadStatuses(tenantId: string, userId: string) {
  const rows = await prisma.mailSlaThread.findMany({
    where: {
      userId,
      dismissedAt: null,
      respondedAt: null,
    },
  });

  for (const row of rows) {
    const status = computeSlaThreadStatus({
      status: row.status,
      respondedAt: row.respondedAt,
      dismissedAt: row.dismissedAt,
      firstInboundAt: row.firstInboundAt,
      deadlineAt: row.deadlineAt,
      atRiskAt: row.atRiskAt,
    });
    if (status === row.status) continue;

    await prisma.mailSlaThread.update({
      where: { id: row.id },
      data: { status },
    });
    if (status === "at_risk") {
      await ensureAlert({ tenantId, userId, threadId: row.id, alertType: "at_risk" });
    }
    if (status === "breached") {
      await ensureAlert({ tenantId, userId, threadId: row.id, alertType: "breached" });
    }
  }
}

export async function getEmailSlaSettings(tenantId: string, userId: string) {
  const row = await getOrCreateSettings(tenantId, userId);
  return serializeSettings(row);
}

export async function updateEmailSlaSettings(
  tenantId: string,
  userId: string,
  input: { responseHours?: number; atRiskRatio?: number; scanFolder?: string; enabled?: boolean },
) {
  await getOrCreateSettings(tenantId, userId);
  const row = await prisma.userMailSlaSettings.update({
    where: { userId },
    data: {
      responseHours: input.responseHours,
      atRiskRatio: input.atRiskRatio,
      scanFolder: input.scanFolder?.trim(),
      enabled: input.enabled,
    },
  });
  return serializeSettings(row);
}

export async function listEmailSlaThreads(userId: string, status?: MailSlaThreadStatus) {
  const rows = await prisma.mailSlaThread.findMany({
    where: { userId },
    orderBy: { deadlineAt: "asc" },
    take: 200,
  });
  const serialized = rows.map(serializeThread);
  if (!status) return serialized;
  return serialized.filter((row) => row.status === status);
}

export async function listEmailSlaAlerts(userId: string) {
  const rows = await prisma.mailSlaAlert.findMany({
    where: { userId, acknowledgedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { thread: true },
  });
  return rows.map((row) => ({
    id: row.id,
    alertType: row.alertType,
    createdAt: row.createdAt.toISOString(),
    thread: serializeThread(row.thread),
  }));
}

export async function acknowledgeEmailSlaAlert(userId: string, alertId: string) {
  const row = await prisma.mailSlaAlert.findFirst({ where: { id: alertId, userId } });
  if (!row) return null;
  const updated = await prisma.mailSlaAlert.update({
    where: { id: row.id },
    data: { acknowledgedAt: new Date() },
  });
  return {
    id: updated.id,
    acknowledgedAt: updated.acknowledgedAt?.toISOString() ?? null,
  };
}

export async function dismissEmailSlaThread(userId: string, threadId: string) {
  const row = await prisma.mailSlaThread.findFirst({ where: { id: threadId, userId } });
  if (!row) return null;
  const updated = await prisma.mailSlaThread.update({
    where: { id: row.id },
    data: { status: "dismissed", dismissedAt: new Date() },
  });
  return serializeThread(updated);
}

export async function scanEmailSlaThreads(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  folder?: string;
}) {
  const settings = await getOrCreateSettings(input.tenantId, input.userId);
  if (!settings.enabled) {
    return { folder: settings.scanFolder, scannedMessages: 0, createdThreads: 0, updatedThreads: 0 };
  }

  const folder = input.folder?.trim() || settings.scanFolder;
  if (shouldSkipImap(input.credentials)) {
    return { folder, scannedMessages: 0, createdThreads: 0, updatedThreads: 0 };
  }

  const scan = await scanInboundMessagesForSla(input.credentials, folder, {
    maxScan: maxScan(),
    userEmail: input.credentials.email,
  });

  let createdThreads = 0;
  let updatedThreads = 0;
  const sortedMessages = [...scan.messages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  for (const message of sortedMessages) {
    const result = await upsertInboundMessage({
      tenantId: input.tenantId,
      userId: input.userId,
      settings,
      folder,
      message,
    });
    if (result.created) createdThreads += 1;
    if (result.updated) updatedThreads += 1;
  }

  await refreshOpenThreadStatuses(input.tenantId, input.userId);

  return {
    folder,
    scannedMessages: scan.scannedCount,
    createdThreads,
    updatedThreads,
  };
}

export async function markEmailSlaThreadResponded(input: {
  userId: string;
  tenantId: string;
  to: string;
  subject: string;
  inReplyTo?: string;
  references?: string;
}) {
  const entitled = await tenantHasAddonAccess(input.tenantId, EMAIL_SLA_TRACKER_ADDON_SLUG);
  if (!entitled) return;

  const counterparty = extractEmailAddress(input.to).toLowerCase();
  if (!counterparty.includes("@")) return;

  const threadKey = buildSlaThreadKey(input.subject, counterparty);
  const row = await prisma.mailSlaThread.findUnique({
    where: { userId_threadKey: { userId: input.userId, threadKey } },
  });
  if (!row || row.status === "dismissed") return;

  const messageIds = new Set(
    [input.inReplyTo, ...(input.references?.split(/\s+/) ?? [])]
      .map((value) => value?.trim())
      .filter(Boolean) as string[],
  );
  const matchesThread =
    (row.messageId && messageIds.has(row.messageId)) ||
    threadKey === buildSlaThreadKey(input.subject, counterparty);

  if (!matchesThread) return;

  await prisma.mailSlaThread.update({
    where: { id: row.id },
    data: { status: "responded", respondedAt: new Date() },
  });
}

export function buildEmailSlaComposeHandoff(thread: {
  fromEmail: string;
  subject: string;
  messageId: string | null;
  referencesHeader: string | null;
  normalizedSubject: string;
}) {
  const subjectBase = thread.normalizedSubject || normalizeSlaSubject(thread.subject);
  const subject = /^re:/i.test(thread.subject.trim()) ? thread.subject.trim() : `Re: ${subjectBase}`;
  return {
    mode: "reply" as const,
    to: thread.fromEmail,
    subject,
    inReplyTo: thread.messageId ?? undefined,
    references: buildSlaReferencesHeader({
      messageId: thread.messageId,
      referencesHeader: thread.referencesHeader,
    }),
  };
}

export async function getEmailSlaComposeHandoff(userId: string, threadId: string) {
  const row = await prisma.mailSlaThread.findFirst({ where: { id: threadId, userId } });
  if (!row) return null;
  const thread = serializeThread(row);
  return buildEmailSlaComposeHandoff(thread);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportEmailSlaReport(input: {
  tenantId: string;
  userId: string;
  apiPublicBase: string;
}) {
  const threads = await listEmailSlaThreads(input.userId);
  const header = [
    "subject",
    "from_email",
    "status",
    "first_inbound_at",
    "deadline_at",
    "responded_at",
    "remaining_label",
  ];
  const lines = [header.join(",")];
  for (const thread of threads) {
    lines.push(
      [
        csvEscape(thread.subject),
        csvEscape(thread.fromEmail),
        csvEscape(thread.status),
        csvEscape(thread.firstInboundAt),
        csvEscape(thread.deadlineAt),
        csvEscape(thread.respondedAt ?? ""),
        csvEscape(thread.remainingLabel ?? ""),
      ].join(","),
    );
  }

  const csv = `${lines.join("\n")}\n`;
  const dataBase64 = Buffer.from(csv, "utf8").toString("base64");
  const stored = await saveStoredFile({
    namespace: REPORT_NAMESPACE,
    tenantId: input.tenantId,
    fileName: `email-sla-report-${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: "text/csv",
    dataBase64,
    maxBytes: 2 * 1024 * 1024,
    allowedMime: REPORT_MIME,
  });

  const token = createSlaReportDownloadToken();
  const row = await prisma.mailSlaReportExport.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      storagePath: stored.storagePath,
      fileSizeBytes: stored.fileSizeBytes,
      downloadToken: token,
      expiresAt: defaultReportExpiresAt(),
      rowCount: threads.length,
    },
  });

  return {
    id: row.id,
    rowCount: row.rowCount,
    downloadUrl: buildSlaReportDownloadUrl(token, input.apiPublicBase),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function recordSlaReportDownload(token: string): Promise<{
  buffer: Buffer;
  fileName: string;
  mimeType: string;
} | null> {
  const row = await prisma.mailSlaReportExport.findUnique({ where: { downloadToken: token } });
  if (!row || row.expiresAt <= new Date()) return null;

  await prisma.mailSlaReportExport.update({
    where: { id: row.id },
    data: {
      downloadCount: row.downloadCount + 1,
      lastDownloadAt: new Date(),
    },
  });

  const buffer = await readStoredFile(REPORT_NAMESPACE, row.tenantId, row.storagePath);
  return {
    buffer,
    fileName: `email-sla-report-${row.createdAt.toISOString().slice(0, 10)}.csv`,
    mimeType: "text/csv",
  };
}
