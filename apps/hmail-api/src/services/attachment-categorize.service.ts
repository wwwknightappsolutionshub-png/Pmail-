import { getEnv } from "../config/env.js";
import {
  ATTACHMENT_CATEGORY_LABELS,
  ATTACHMENT_CATEGORIES,
  classifyAttachment,
  isAttachmentCategory,
  type AttachmentCategory,
} from "../lib/attachment-category.js";
import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import {
  downloadAttachment,
  getMessage,
  scanMessagesWithAttachments,
  type MailCredentials,
} from "./imap.service.js";
import {
  FILE_VAULT_ADDON_SLUG,
  uploadMailVaultFile,
} from "./file-vault.service.js";

export const ATTACHMENT_CATEGORIZE_ADDON_SLUG = "attachment-categorize-functionality";

function maxScanMessages(): number {
  return getEnv().ATTACHMENT_CATEGORIZE_MAX_SCAN;
}

function shouldSkipImapOperations(credentials: MailCredentials): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return credentials.mailConfig.imapHost === "local.pmail.test";
}

function serializeRecord(row: {
  id: string;
  folder: string;
  messageUid: number;
  partId: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  category: string;
  categorySource: string;
  messageSubject: string;
  messageFrom: string;
  messageDate: Date;
  vaultFileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const category = isAttachmentCategory(row.category) ? row.category : "other";
  return {
    id: row.id,
    folder: row.folder,
    messageUid: row.messageUid,
    partId: row.partId,
    filename: row.filename,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    category,
    categoryLabel: ATTACHMENT_CATEGORY_LABELS[category],
    categorySource: row.categorySource,
    messageSubject: row.messageSubject,
    messageFrom: row.messageFrom,
    messageDate: row.messageDate.toISOString(),
    vaultFileId: row.vaultFileId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function scanAndCategorizeAttachments(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  folder: string;
}) {
  if (shouldSkipImapOperations(input.credentials)) {
    return { folder: input.folder, scannedMessages: 0, upsertedAttachments: 0 };
  }

  const scanned = await scanMessagesWithAttachments(input.credentials, input.folder, maxScanMessages());
  let upsertedAttachments = 0;

  for (const message of scanned) {
    for (const attachment of message.attachments) {
      const category = classifyAttachment(attachment.filename, attachment.contentType);
      await prisma.categorizedMailAttachment.upsert({
        where: {
          userId_folder_messageUid_partId: {
            userId: input.userId,
            folder: input.folder,
            messageUid: message.uid,
            partId: attachment.partId,
          },
        },
        create: {
          tenantId: input.tenantId,
          userId: input.userId,
          folder: input.folder,
          messageUid: message.uid,
          partId: attachment.partId,
          filename: attachment.filename,
          mimeType: attachment.contentType,
          fileSizeBytes: attachment.size,
          category,
          categorySource: "auto",
          messageSubject: message.subject,
          messageFrom: message.from,
          messageDate: new Date(message.date),
        },
        update: {
          filename: attachment.filename,
          mimeType: attachment.contentType,
          fileSizeBytes: attachment.size,
          messageSubject: message.subject,
          messageFrom: message.from,
          messageDate: new Date(message.date),
          categorySource: "auto",
          category,
        },
      });
      upsertedAttachments += 1;
    }
  }

  return {
    folder: input.folder,
    scannedMessages: scanned.length,
    upsertedAttachments,
  };
}

export async function listCategorySummary(userId: string) {
  const grouped = await prisma.categorizedMailAttachment.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  });

  return (ATTACHMENT_CATEGORIES as readonly AttachmentCategory[]).map((category) => {
    const row = grouped.find((entry) => entry.category === category);
    return {
      category,
      label: ATTACHMENT_CATEGORY_LABELS[category],
      count: row?._count._all ?? 0,
    };
  });
}

export async function listCategorizedAttachments(
  userId: string,
  options: { category?: string; folder?: string; limit?: number } = {},
) {
  const rows = await prisma.categorizedMailAttachment.findMany({
    where: {
      userId,
      ...(options.category && isAttachmentCategory(options.category) ? { category: options.category } : {}),
      ...(options.folder ? { folder: options.folder } : {}),
    },
    orderBy: [{ messageDate: "desc" }, { filename: "asc" }],
    take: options.limit ?? 100,
  });

  return rows.map(serializeRecord);
}

export async function getMessageAttachmentCategories(
  userId: string,
  folder: string,
  uid: number,
) {
  const rows = await prisma.categorizedMailAttachment.findMany({
    where: { userId, folder, messageUid: uid },
    orderBy: { partId: "asc" },
  });
  return rows.map(serializeRecord);
}

export async function categorizeMessageAttachments(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  folder: string;
  uid: number;
}) {
  if (shouldSkipImapOperations(input.credentials)) {
    return { folder: input.folder, uid: input.uid, attachments: [] as ReturnType<typeof serializeRecord>[] };
  }

  const message = await getMessage(input.credentials, input.folder, input.uid);
  if (!message) {
    return { folder: input.folder, uid: input.uid, attachments: [] as ReturnType<typeof serializeRecord>[] };
  }

  for (const attachment of message.attachments) {
    const category = classifyAttachment(attachment.filename, attachment.contentType);
    await prisma.categorizedMailAttachment.upsert({
      where: {
        userId_folder_messageUid_partId: {
          userId: input.userId,
          folder: input.folder,
          messageUid: input.uid,
          partId: attachment.partId,
        },
      },
      create: {
        tenantId: input.tenantId,
        userId: input.userId,
        folder: input.folder,
        messageUid: input.uid,
        partId: attachment.partId,
        filename: attachment.filename,
        mimeType: attachment.contentType,
        fileSizeBytes: attachment.size,
        category,
        categorySource: "auto",
        messageSubject: message.subject,
        messageFrom: message.from,
        messageDate: new Date(message.date),
      },
      update: {
        filename: attachment.filename,
        mimeType: attachment.contentType,
        fileSizeBytes: attachment.size,
        messageSubject: message.subject,
        messageFrom: message.from,
        messageDate: new Date(message.date),
        category,
        categorySource: "auto",
      },
    });
  }

  const attachments = await getMessageAttachmentCategories(input.userId, input.folder, input.uid);
  return { folder: input.folder, uid: input.uid, attachments };
}

export async function updateAttachmentCategory(userId: string, id: string, category: string) {
  if (!isAttachmentCategory(category)) {
    throw new Error("Invalid attachment category");
  }

  const row = await prisma.categorizedMailAttachment.findFirst({
    where: { id, userId },
  });
  if (!row) return null;

  const updated = await prisma.categorizedMailAttachment.update({
    where: { id: row.id },
    data: { category, categorySource: "manual" },
  });
  return serializeRecord(updated);
}

export async function exportCategorizedAttachmentToVault(input: {
  tenantId: string;
  userId: string;
  credentials: MailCredentials;
  recordId: string;
}) {
  const entitled = await tenantHasAddonAccess(input.tenantId, FILE_VAULT_ADDON_SLUG);
  if (!entitled) {
    throw new Error("File vault addon required to export attachments");
  }

  const record = await prisma.categorizedMailAttachment.findFirst({
    where: { id: input.recordId, userId: input.userId },
  });
  if (!record) return null;
  if (record.vaultFileId) {
    const existing = await prisma.mailVaultFile.findFirst({
      where: { id: record.vaultFileId, userId: input.userId },
    });
    if (existing) {
      return { record: serializeRecord(record), vaultFileId: existing.id, reused: true };
    }
  }

  if (shouldSkipImapOperations(input.credentials)) {
    throw new Error("Mailbox unavailable in this environment");
  }

  const file = await downloadAttachment(
    input.credentials,
    record.folder,
    record.messageUid,
    record.partId,
  );
  if (!file) {
    throw new Error("Attachment not found on mailbox");
  }

  const uploaded = await uploadMailVaultFile(input.tenantId, input.userId, {
    fileName: file.filename,
    mimeType: file.contentType,
    dataBase64: file.content.toString("base64"),
  });

  const updated = await prisma.categorizedMailAttachment.update({
    where: { id: record.id },
    data: { vaultFileId: uploaded.id },
  });

  return {
    record: serializeRecord(updated),
    vaultFileId: uploaded.id,
    reused: false,
  };
}
