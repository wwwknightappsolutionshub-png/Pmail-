import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import {
  appendVaultLinksToMessage,
  buildVaultDownloadUrl,
  FILE_VAULT_ADDON_SLUG,
  getVaultFilesForSend,
} from "./file-vault.service.js";
import { getUserDocumentsForSend } from "./job-hunter-documents.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "./job-hunter-settings.service.js";
import { appendToSentFolder, type MailCredentials } from "./imap.service.js";
import { markEmailSlaThreadResponded } from "./email-sla.service.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";
import { appendOutboundSignature } from "./default-signature.service.js";
import { sendMail } from "./smtp.service.js";
import {
  buildTrackingPixelUrl,
  createSentTracking,
  injectTrackingPixel,
  wrapTrackedLinksInHtml,
} from "./tracking.service.js";

export type OutgoingMailPayload = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  priority?: "normal" | "high";
  requestReadReceipt?: boolean;
  trackingEnabled?: boolean;
  vaultFileIds?: string[];
  userDocumentIds?: string[];
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
};

export async function executeOutgoingMailSend(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  apiPublicBase: string;
  payload: OutgoingMailPayload;
}) {
  const body = input.payload;
  if (!body.text?.trim() && !body.html?.trim()) {
    throw new Error("Message body is required");
  }

  const composeSettings = await getComposeSettingsByUserId(input.userId);
  const displayName = composeSettings.displayName?.trim();
  let htmlBody = body.html;
  let textBody = body.text;
  let trackingRecord: Awaited<ReturnType<typeof createSentTracking>> | null = null;

  const vaultFileIds = body.vaultFileIds ?? [];
  if (vaultFileIds.length > 0) {
    const vaultEntitled = await tenantHasAddonAccess(input.tenantId, FILE_VAULT_ADDON_SLUG);
    if (!vaultEntitled) {
      throw new Error("File vault addon required");
    }
    const vaultRows = await getVaultFilesForSend(input.userId, vaultFileIds);
    const merged = appendVaultLinksToMessage({
      html: htmlBody,
      text: textBody,
      links: vaultRows.map((row) => ({
        originalName: row.originalName,
        url: buildVaultDownloadUrl(row.downloadToken, input.apiPublicBase),
        fileSizeBytes: row.fileSizeBytes,
      })),
    });
    htmlBody = merged.html;
    textBody = merged.text;
  }

  if (body.trackingEnabled) {
    const entitled = await tenantHasAddonAccess(input.tenantId, "open-tracking");
    if (!entitled) {
      throw new Error("Open tracking addon required");
    }
    trackingRecord = await createSentTracking(input.userId, {
      toEmail: body.to,
      subject: body.subject,
    });
    const pixelUrl = buildTrackingPixelUrl(trackingRecord.trackingToken, input.apiPublicBase);
    if (htmlBody) {
      htmlBody = injectTrackingPixel(htmlBody, pixelUrl);
      htmlBody = await wrapTrackedLinksInHtml(htmlBody, trackingRecord.id, input.apiPublicBase);
    }
  }

  const signed = await appendOutboundSignature({
    userId: input.userId,
    tenantId: input.tenantId,
    html: htmlBody,
    text: textBody,
  });
  htmlBody = signed.html;
  textBody = signed.text;

  const creds = input.credentials;

  const userDocumentIds = body.userDocumentIds ?? [];
  let mergedAttachments = body.attachments ?? [];
  if (userDocumentIds.length > 0) {
    const jobHunterEntitled = await tenantHasAddonAccess(input.tenantId, JOB_HUNTER_ADDON_SLUG);
    if (!jobHunterEntitled) {
      throw new Error("Job Hunter addon required");
    }
    const documentAttachments = await getUserDocumentsForSend(input.userId, input.tenantId, userDocumentIds);
    mergedAttachments = [...mergedAttachments, ...documentAttachments];
  }

  const mailInput = {
    email: creds.email,
    password: creds.password,
    mailConfig: creds.mailConfig,
    fromName: displayName || undefined,
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    text: textBody,
    html: htmlBody,
    replyTo: body.replyTo,
    inReplyTo: body.inReplyTo,
    references: body.references,
    priority: body.priority,
    requestReadReceipt: body.requestReadReceipt,
    attachments: mergedAttachments.length
      ? mergedAttachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, "base64"),
          contentType: att.contentType,
        }))
      : undefined,
  };

  const result = await sendMail(mailInput);

  await markEmailSlaThreadResponded({
    userId: input.userId,
    tenantId: input.tenantId,
    to: body.to,
    subject: body.subject,
    inReplyTo: body.inReplyTo,
    references: body.references,
  });

  if (trackingRecord && result.messageId) {
    await prisma.sentMessageTracking.update({
      where: { id: trackingRecord.id },
      data: { smtpMessageId: result.messageId },
    });
  }

  let sentFolder: string | null = null;
  try {
    sentFolder = await appendToSentFolder(
      { email: creds.email, password: creds.password, mailConfig: creds.mailConfig },
      mailInput,
      result.messageId,
    );
  } catch {
    // non-fatal
  }

  return {
    messageId: result.messageId,
    sentFolder: sentFolder ?? undefined,
    trackingId: trackingRecord?.id,
  };
}

export async function getUndoSendSeconds(userId: string): Promise<number> {
  const settings = await prisma.userComposeSettings.findUnique({ where: { userId } });
  return settings?.undoSendSeconds ?? 10;
}

export const UNDO_SEND_OPTIONS = [0, 5, 10, 20, 30] as const;

export function normalizeUndoSendSeconds(value: number | undefined | null): number {
  if (value == null || Number.isNaN(value)) return 0;
  const rounded = Math.round(value);
  return UNDO_SEND_OPTIONS.includes(rounded as (typeof UNDO_SEND_OPTIONS)[number]) ? rounded : 0;
}

export async function queueUndoOutgoingMail(input: {
  tenantId: string;
  userId: string;
  payload: OutgoingMailPayload;
  undoSeconds: number;
}) {
  const scheduledFor = new Date(Date.now() + input.undoSeconds * 1000);
  const row = await prisma.scheduledMessage.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      to: input.payload.to,
      cc: input.payload.cc,
      bcc: input.payload.bcc,
      subject: input.payload.subject,
      text: input.payload.text,
      html: input.payload.html,
      scheduledFor,
      status: "pending",
      sendKind: "undo_send",
      payloadJson: JSON.stringify(input.payload),
    },
  });

  return {
    pendingId: row.id,
    undoSeconds: input.undoSeconds,
    undoUntil: scheduledFor.toISOString(),
    subject: row.subject,
    to: row.to,
  };
}

export async function cancelUndoOutgoingMail(userId: string, pendingId: string): Promise<boolean> {
  const row = await prisma.scheduledMessage.findFirst({
    where: { id: pendingId, userId, status: "pending", sendKind: "undo_send" },
  });
  if (!row) return false;

  await prisma.scheduledMessage.update({
    where: { id: row.id },
    data: { status: "cancelled" },
  });
  return true;
}
