import { getEnv } from "../config/env.js";
import {
  buildUnsubscribeOptions,
  decodeSenderKey,
  executeUnsubscribeRequest,
  extractEmailAddress,
  type UnsubscribeOption,
} from "../lib/list-unsubscribe.js";
import { prisma } from "../lib/prisma.js";
import {
  analyzeInboxSenders,
  findArchiveFolderPath,
  getMessageUnsubscribeHeaders,
  performSenderCleanup,
  type MailCredentials,
  type SenderCleanupAction,
} from "./imap.service.js";

export const INBOX_CLEANUP_ADDON_SLUG = "inbox-cleanup-functionality";

function maxScanMessages(): number {
  return getEnv().INBOX_CLEANUP_MAX_SCAN;
}

function maxSenderResults(): number {
  return getEnv().INBOX_CLEANUP_SENDERS_LIMIT;
}

function shouldSkipImapOperations(credentials: MailCredentials): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return credentials.mailConfig.imapHost === "local.pmail.test";
}

export async function listCleanupSenders(credentials: MailCredentials, folder: string) {
  if (shouldSkipImapOperations(credentials)) {
    return { folder, scannedCount: 0, senders: [] as Awaited<ReturnType<typeof analyzeInboxSenders>>["senders"] };
  }

  return analyzeInboxSenders(credentials, folder, {
    maxScan: maxScanMessages(),
    maxSenders: maxSenderResults(),
  });
}

export async function runSenderCleanup(
  credentials: MailCredentials,
  folder: string,
  senderKey: string,
  action: SenderCleanupAction,
) {
  const senderEmail = decodeSenderKey(senderKey);
  if (!senderEmail.includes("@")) {
    throw new Error("Invalid sender key");
  }

  if (shouldSkipImapOperations(credentials)) {
    return { processedCount: 0, action, senderEmail };
  }

  let targetFolder: string | undefined;
  if (action === "archive") {
    targetFolder = (await findArchiveFolderPath(credentials)) ?? undefined;
    if (!targetFolder) {
      throw new Error("Archive folder not found on this mailbox");
    }
  }

  const processedCount = await performSenderCleanup(credentials, folder, senderEmail, action, targetFolder);
  return { processedCount, action, senderEmail };
}

export async function getUnsubscribeOptionsForMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
) {
  if (shouldSkipImapOperations(credentials)) {
    return {
      folder,
      uid,
      senderEmail: null as string | null,
      options: [] as UnsubscribeOption[],
    };
  }

  const headers = await getMessageUnsubscribeHeaders(credentials, folder, uid);
  if (!headers) {
    return { folder, uid, senderEmail: null, options: [] as UnsubscribeOption[] };
  }

  return {
    folder,
    uid,
    senderEmail: headers.from ? extractEmailAddress(headers.from) : null,
    options: buildUnsubscribeOptions(headers),
  };
}

export async function executeMessageUnsubscribe(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  folder: string;
  uid: number;
  preferredUrl?: string;
}) {
  const info = await getUnsubscribeOptionsForMessage(input.credentials, input.folder, input.uid);
  if (info.options.length === 0) {
    throw new Error("No supported unsubscribe link found in this message");
  }

  const option =
    (input.preferredUrl
      ? info.options.find((row) => row.url === input.preferredUrl)
      : undefined) ?? info.options[0];

  const result = await executeUnsubscribeRequest(option);
  const status = result.ok ? "success" : "failed";

  const log = await prisma.mailUnsubscribeLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      senderEmail: info.senderEmail ?? "unknown",
      folder: input.folder,
      messageUid: input.uid,
      unsubscribeUrl: option.url,
      method: option.method,
      status,
      httpStatus: result.status || null,
      errorMessage: result.error ?? (result.ok ? null : `HTTP ${result.status}`),
    },
  });

  return {
    log: serializeUnsubscribeLog(log),
    ok: result.ok,
  };
}

function serializeUnsubscribeLog(row: {
  id: string;
  senderEmail: string;
  folder: string;
  messageUid: number;
  unsubscribeUrl: string;
  method: string;
  status: string;
  httpStatus: number | null;
  errorMessage: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    senderEmail: row.senderEmail,
    folder: row.folder,
    messageUid: row.messageUid,
    unsubscribeUrl: row.unsubscribeUrl,
    method: row.method,
    status: row.status,
    httpStatus: row.httpStatus,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUnsubscribeLogs(userId: string, limit = 25) {
  const rows = await prisma.mailUnsubscribeLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serializeUnsubscribeLog);
}
