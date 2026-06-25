import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";
import {
  executeOutgoingMailSend,
  type OutgoingMailPayload,
} from "./mail-outgoing.service.js";
import { logComplianceEvent } from "./compliance.service.js";
import { appendToSentFolder } from "./imap.service.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";
import { appendOutboundSignature } from "./default-signature.service.js";
import { sendMail } from "./smtp.service.js";

export async function listScheduledMessages(tenantId: string, userId: string) {
  const rows = await prisma.scheduledMessage.findMany({
    where: { tenantId, userId, status: { in: ["pending", "failed"] }, sendKind: "scheduled" },
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
      sendKind: "scheduled",
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
    where: { id, tenantId, userId, status: "pending", sendKind: "scheduled" },
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
    orderBy: { scheduledFor: "asc" },
  });

  let sent = 0;
  const apiPublicBase = getEnv().PUBLIC_API_URL?.trim() || `http://localhost:${getEnv().API_PORT}`;

  for (const row of due) {
    try {
      const creds = await getLatestMailCredentials(row.userId);
      if (!creds) {
        await prisma.scheduledMessage.update({
          where: { id: row.id },
          data: {
            status: "failed",
            errorMessage: "No active mail session — user must log in to send scheduled mail",
          },
        });
        continue;
      }

      if (row.sendKind === "undo_send" && row.payloadJson) {
        const payload = JSON.parse(row.payloadJson) as OutgoingMailPayload;
        await executeOutgoingMailSend({
          tenantId: row.tenantId,
          userId: row.userId,
          credentials: creds,
          apiPublicBase,
          payload,
        });
      } else {
        const composeSettings = await getComposeSettingsByUserId(row.userId);
        const signed = await appendOutboundSignature({
          userId: row.userId,
          tenantId: row.tenantId,
          html: row.html ?? undefined,
          text: row.text ?? undefined,
        });
        const result = await sendMail({
          email: creds.email,
          password: creds.password,
          mailConfig: creds.mailConfig,
          fromName: composeSettings.displayName?.trim() || undefined,
          to: row.to,
          cc: row.cc ?? undefined,
          bcc: row.bcc ?? undefined,
          subject: row.subject,
          text: signed.text ?? undefined,
          html: signed.html ?? undefined,
        });

        try {
          await appendToSentFolder(
            { email: creds.email, password: creds.password, mailConfig: creds.mailConfig },
            {
              email: creds.email,
              password: creds.password,
              mailConfig: creds.mailConfig,
              to: row.to,
              subject: row.subject,
              text: signed.text ?? undefined,
              html: signed.html ?? undefined,
            },
            result.messageId,
          );
        } catch {
          // non-fatal
        }
      }

      await prisma.scheduledMessage.update({
        where: { id: row.id },
        data: { status: "sent", sentAt: now, errorMessage: null },
      });
      sent += 1;
    } catch (err) {
      await prisma.scheduledMessage.update({
        where: { id: row.id },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Send failed",
        },
      });
    }
  }

  return sent;
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
