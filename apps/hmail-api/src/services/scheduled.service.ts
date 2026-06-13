import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";

export async function listScheduledMessages(tenantId: string, userId: string) {
  const rows = await prisma.scheduledMessage.findMany({
    where: { tenantId, userId, status: { in: ["pending", "failed"] } },
    orderBy: { scheduledFor: "asc" },
  });

  return rows.map(formatScheduled);
}

export async function createScheduledMessage(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
    scheduledFor: string;
  },
) {
  const scheduledFor = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime())) {
    throw new Error("Invalid scheduled date");
  }
  if (scheduledFor.getTime() <= Date.now()) {
    throw new Error("Scheduled time must be in the future");
  }

  const row = await prisma.scheduledMessage.create({
    data: {
      tenantId,
      userId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      scheduledFor,
      status: "pending",
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "scheduled_message.created",
    entityType: "scheduled_message",
    entityId: row.id,
    metadata: { subject: row.subject, scheduledFor: row.scheduledFor.toISOString() },
  });

  return formatScheduled(row);
}

export async function cancelScheduledMessage(
  tenantId: string,
  userId: string,
  userEmail: string,
  id: string,
) {
  const row = await prisma.scheduledMessage.findFirst({
    where: { id, tenantId, userId, status: "pending" },
  });
  if (!row) throw new Error("Scheduled message not found");

  await prisma.scheduledMessage.update({
    where: { id },
    data: { status: "cancelled" },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "scheduled_message.cancelled",
    entityType: "scheduled_message",
    entityId: id,
  });
}

export async function processDueScheduledMessages(): Promise<number> {
  const now = new Date();
  const due = await prisma.scheduledMessage.findMany({
    where: { status: "pending", scheduledFor: { lte: now } },
    take: 20,
  });

  for (const row of due) {
    await prisma.scheduledMessage.update({
      where: { id: row.id },
      data: { status: "sent", sentAt: now },
    });
  }

  return due.length;
}

function formatScheduled(row: {
  id: string;
  to: string;
  subject: string;
  scheduledFor: Date;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
}) {
  return {
    id: row.id,
    to: row.to,
    subject: row.subject,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status,
    sentAt: row.sentAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
  };
}
