import { ImapFlow } from "imapflow";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { simpleParser, type ParsedMail } from "mailparser";
import type { TenantMailConfig } from "@prisma/client";
import { buildMailHeaders, type SendMailInput } from "./smtp.service.js";

export interface MailCredentials {
  email: string;
  password: string;
  mailConfig: TenantMailConfig;
}

export interface MailFolder {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  listed: boolean;
  specialUse?: string;
  unseen?: number;
}

export interface MailMessageSummary {
  uid: number;
  folder: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  hasAttachments: boolean;
  snippet: string;
}

export interface MailMessageDetail extends MailMessageSummary {
  cc: string;
  bcc: string;
  html: string | null;
  text: string | null;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    partId: string;
  }>;
}

function buildImapClient(credentials: MailCredentials): ImapFlow {
  const { mailConfig, email, password } = credentials;
  return new ImapFlow({
    host: mailConfig.imapHost,
    port: mailConfig.imapPort,
    secure: mailConfig.imapSecure,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

async function findSentFolderPath(client: ImapFlow): Promise<string | null> {
  const mailboxes = await client.list();
  const bySpecial = mailboxes.find((box) => box.specialUse === "\\Sent");
  if (bySpecial) return bySpecial.path;

  const byName = mailboxes.find((box) => {
    const path = box.path.toLowerCase();
    const name = box.name.toLowerCase();
    return (
      path === "sent" ||
      path.endsWith(".sent") ||
      name === "sent" ||
      name === "sent items" ||
      name === "sent mail"
    );
  });

  return byName?.path ?? null;
}

async function buildRawMessage(input: SendMailInput & { messageId?: string }): Promise<Buffer> {
  const headers = buildMailHeaders(input);
  const composer = new MailComposer({
    from: input.email,
    to: input.to,
    cc: input.cc || undefined,
    bcc: input.bcc || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    inReplyTo: input.inReplyTo,
    references: input.references,
    messageId: input.messageId,
    headers: Object.keys(headers).length ? headers : undefined,
    attachments: input.attachments,
  });

  const mimeNode = composer.compile();
  return mimeNode.build() as Promise<Buffer>;
}

/** Save a copy of a sent message to the Sent folder via IMAP APPEND. */
export async function appendToSentFolder(
  credentials: MailCredentials,
  input: SendMailInput,
  messageId?: string,
): Promise<string | null> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    const sentPath = await findSentFolderPath(client);
    if (!sentPath) return null;

    const raw = await buildRawMessage({ ...input, messageId });
    await client.append(sentPath, raw, ["\\Seen"], new Date());
    return sentPath;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function verifyImapLogin(credentials: MailCredentials): Promise<void> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen("INBOX");
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function listFolders(credentials: MailCredentials): Promise<MailFolder[]> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    const mailboxes = await client.list();
    const folders: MailFolder[] = [];

    for (const box of mailboxes) {
      let unseen: number | undefined;
      try {
        const status = await client.status(box.path, { unseen: true });
        unseen = status.unseen ?? 0;
      } catch {
        unseen = undefined;
      }

      folders.push({
        path: box.path,
        name: box.name,
        delimiter: box.delimiter,
        flags: [...box.flags],
        listed: box.listed,
        specialUse: box.specialUse,
        unseen,
      });
    }

    return folders;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function listMessages(
  credentials: MailCredentials,
  folder: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    searchField?: "date" | "sender" | "subject" | "recipient" | "body";
    searchQuery?: string;
    filter?: "all" | "unread" | "read" | "starred";
  } = {},
): Promise<MailMessageSummary[]> {
  const { limit = 50, offset = 0, search, searchField, searchQuery, filter = "all" } = options;
  const queryText = (searchQuery ?? search ?? "").trim();
  const client = buildImapClient(credentials);

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(folder);
    if (!mailbox.exists) return [];

    const criteria = buildImapSearchCriteria({ searchField, searchQuery: queryText, filter, legacySearch: search });
    const searchResult = await client.search(criteria, { uid: true });
    const uids = Array.isArray(searchResult) ? searchResult : [];
    const sortedUids = [...uids].sort((a, b) => b - a).slice(offset, offset + limit);

    if (sortedUids.length === 0) return [];

    const messages: MailMessageSummary[] = [];

    for await (const msg of client.fetch(
      sortedUids,
      {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: { start: 0, maxLength: 800 },
      },
      { uid: true },
    )) {
      const envelope = msg.envelope;
      const fromAddr = envelope?.from?.[0];
      const toAddr = envelope?.to?.[0];
      const subject = envelope?.subject ?? "(No subject)";
      const from = fromAddr
        ? `${fromAddr.name ? `${fromAddr.name} ` : ""}<${fromAddr.address}>`
        : "";
      const to = toAddr?.address ?? "";

      let snippet = "";
      if (msg.source) {
        try {
          const parsed = await simpleParser(msg.source);
          snippet = bodyPreview(parsed).slice(0, 160).replace(/\s+/g, " ").trim();
        } catch {
          snippet = "";
        }
      }

      messages.push({
        uid: msg.uid,
        folder,
        subject,
        from,
        to,
        date: envelope?.date?.toISOString() ?? new Date().toISOString(),
        seen: msg.flags?.has("\\Seen") ?? false,
        flagged: msg.flags?.has("\\Flagged") ?? false,
        hasAttachments: hasAttachments(msg.bodyStructure),
        snippet,
      });
    }

    return messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } finally {
    await client.logout().catch(() => undefined);
  }
}

function buildImapSearchCriteria(options: {
  searchField?: "date" | "sender" | "subject" | "recipient" | "body";
  searchQuery?: string;
  filter?: "all" | "unread" | "read" | "starred";
  legacySearch?: string;
}): Record<string, unknown> {
  const criteria: Record<string, unknown> = { all: true };
  const query = (options.searchQuery ?? options.legacySearch ?? "").trim();

  if (options.filter === "unread") {
    delete criteria.all;
    criteria.seen = false;
  } else if (options.filter === "read") {
    delete criteria.all;
    criteria.seen = true;
  } else if (options.filter === "starred") {
    delete criteria.all;
    criteria.flagged = true;
  }

  if (!query) return criteria;

  const field = options.searchField;
  if (!field) {
    return {
      or: [
        { ...stripAll(criteria), subject: query },
        { ...stripAll(criteria), from: query },
        { ...stripAll(criteria), to: query },
        { ...stripAll(criteria), body: query },
      ],
    };
  }

  delete criteria.all;
  const base = { ...criteria };

  switch (field) {
    case "sender":
      return { ...base, from: query };
    case "subject":
      return { ...base, subject: query };
    case "recipient":
      return { ...base, to: query };
    case "body":
      return { ...base, body: query };
    case "date": {
      const parsed = new Date(query);
      if (!Number.isNaN(parsed.getTime())) {
        return { ...base, on: parsed };
      }
      return { ...base, subject: query };
    }
    default:
      return criteria;
  }
}

function stripAll(criteria: Record<string, unknown>): Record<string, unknown> {
  const next = { ...criteria };
  delete next.all;
  return next;
}

function formatAddressField(value: ParsedMail["to"]): string {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => entry.text ?? "").filter(Boolean).join(", ");
  }
  return value.text ?? "";
}

function bodyPreview(parsed: ParsedMail): string {
  if (typeof parsed.text === "string") return parsed.text;
  if (typeof parsed.html === "string") return parsed.html;
  return "";
}

function hasAttachments(structure: unknown): boolean {
  if (!structure || typeof structure !== "object") return false;
  const node = structure as { disposition?: string; childNodes?: unknown[] };
  if (node.disposition === "attachment") return true;
  return (node.childNodes ?? []).some((child) => hasAttachments(child));
}

export async function getMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
): Promise<MailMessageDetail | null> {
  const client = buildImapClient(credentials);

  try {
    await client.connect();
    await client.mailboxOpen(folder);

    const fetched = await client.fetchOne(
      uid,
      { uid: true, envelope: true, flags: true, source: true, bodyStructure: true },
      { uid: true },
    );

    if (!fetched) return null;

    const parsed: ParsedMail = await simpleParser(fetched.source as Buffer);
    const envelope = fetched.envelope;
    const fromAddr = envelope?.from?.[0];
    const toAddr = envelope?.to?.[0];

    return {
      uid,
      folder,
      subject: parsed.subject ?? envelope?.subject ?? "(No subject)",
      from: fromAddr
        ? `${fromAddr.name ? `${fromAddr.name} ` : ""}<${fromAddr.address}>`
        : (parsed.from?.text ?? ""),
      to: formatAddressField(parsed.to) || toAddr?.address || "",
      cc: formatAddressField(parsed.cc),
      bcc: formatAddressField(parsed.bcc),
      date: (parsed.date ?? envelope?.date ?? new Date()).toISOString(),
      seen: fetched.flags?.has("\\Seen") ?? false,
      flagged: fetched.flags?.has("\\Flagged") ?? false,
      hasAttachments: (parsed.attachments?.length ?? 0) > 0,
      snippet: (parsed.text ?? "").slice(0, 160),
      html: parsed.html ? String(parsed.html) : null,
      text: parsed.text ?? null,
      attachments: (parsed.attachments ?? []).map((att, index) => ({
        filename: att.filename ?? `attachment-${index + 1}`,
        contentType: att.contentType,
        size: att.size,
        partId: String(index),
      })),
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function setMessageFlags(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  flags: { seen?: boolean; flagged?: boolean },
): Promise<void> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);

    if (flags.seen === true) await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    if (flags.seen === false) await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
    if (flags.flagged === true) await client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
    if (flags.flagged === false) await client.messageFlagsRemove(uid, ["\\Flagged"], { uid: true });
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function moveMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  targetFolder: string,
): Promise<void> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);
    await client.messageMove(uid, targetFolder, { uid: true });
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function deleteMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
): Promise<void> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);
    await client.messageDelete(uid, { uid: true });
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function createMailbox(
  credentials: MailCredentials,
  name: string,
  parentPath?: string,
): Promise<MailFolder> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    const mailboxes = await client.list();
    const parent = parentPath
      ? mailboxes.find((box) => box.path === parentPath)
      : mailboxes.find((box) => box.specialUse === "\\Inbox") ?? mailboxes[0];

    const delimiter = parent?.delimiter ?? ".";
    const folderPath = parent?.path ? `${parent.path}${delimiter}${name}` : name;

    await client.mailboxCreate(folderPath);
    const refreshed = await client.list();
    const created = refreshed.find((box) => box.path === folderPath);

    return {
      path: folderPath,
      name: created?.name ?? name,
      delimiter: created?.delimiter ?? delimiter,
      flags: [...(created?.flags ?? [])],
      listed: created?.listed ?? true,
      specialUse: created?.specialUse,
      unseen: 0,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export type BulkMailAction = "markRead" | "markUnread" | "delete" | "move" | "reportSpam";

export async function bulkMessageAction(
  credentials: MailCredentials,
  folder: string,
  uids: number[],
  action: BulkMailAction,
  targetFolder?: string,
): Promise<void> {
  if (uids.length === 0) return;

  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);

    for (const uid of uids) {
      switch (action) {
        case "markRead":
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          break;
        case "markUnread":
          await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
          break;
        case "delete":
          await client.messageDelete(uid, { uid: true });
          break;
        case "move":
          if (!targetFolder) throw new Error("Target folder required");
          await client.messageMove(uid, targetFolder, { uid: true });
          break;
        case "reportSpam":
          if (!targetFolder) throw new Error("Spam folder required");
          await client.messageMove(uid, targetFolder, { uid: true });
          break;
      }
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function downloadAttachment(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  partId: string,
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const message = await getMessage(credentials, folder, uid);
  if (!message) return null;

  const index = Number(partId);
  const attachment = message.attachments[index];
  if (!attachment) return null;

  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const fetched = await client.fetchOne(uid, { source: true }, { uid: true });
    if (!fetched) return null;
    const source = fetched.source;
    if (!source) return null;

    const parsed = await simpleParser(source as Buffer);
    const att = parsed.attachments?.[index];
    if (!att?.content) return null;

    return {
      filename: att.filename ?? attachment.filename,
      contentType: att.contentType,
      content: att.content,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
