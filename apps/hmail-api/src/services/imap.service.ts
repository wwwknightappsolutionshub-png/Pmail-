import { ImapFlow } from "imapflow";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { simpleParser, type ParsedMail } from "mailparser";
import { encodeSenderKey, extractEmailAddress } from "../lib/list-unsubscribe.js";
import { buildImapCriteriaFromParsed, parseMailSearchQuery } from "../lib/mail-search-parser.js";
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

export type MailMessageSortField = "date" | "subject" | "sender";
export type MailMessageSortOrder = "asc" | "desc";

export interface MailMessageListResult {
  messages: MailMessageSummary[];
  total: number;
  page: number;
  pageSize: number;
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
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

/** Permanently remove a message; retries with sequence EXPUNGE when UID EXPUNGE is unsupported. */
async function permanentlyDeleteMessage(client: ImapFlow, uid: number): Promise<void> {
  const deletedByUid = await client.messageDelete(uid, { uid: true });
  if (deletedByUid) return;

  const message = await client.fetchOne(uid, { uid: true }, { uid: true });
  if (!message) return;

  const deletedBySeq = await client.messageDelete(message.seq, { uid: false });
  if (!deletedBySeq) {
    throw new Error("Could not permanently delete message");
  }
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
  const { useLocalPmailFixture, localFixtureListFolders } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    return localFixtureListFolders();
  }

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
    page?: number;
    pageSize?: number;
    search?: string;
    searchField?: "date" | "sender" | "subject" | "recipient" | "body";
    searchQuery?: string;
    filter?: "all" | "unread" | "read" | "starred";
    sortBy?: MailMessageSortField;
    sortOrder?: MailMessageSortOrder;
  } = {},
): Promise<MailMessageListResult> {
  const pageSize = options.pageSize ?? options.limit ?? 30;
  const page = options.page ?? Math.floor((options.offset ?? 0) / pageSize) + 1;
  const offset = options.offset ?? (page - 1) * pageSize;
  const { search, searchField, searchQuery, filter = "all", sortBy = "date", sortOrder = "desc" } =
    options;
  const queryText = (searchQuery ?? search ?? "").trim();

  const { useLocalPmailFixture, localFixtureListMessages } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    return localFixtureListMessages(credentials, folder, {
      page,
      pageSize,
      searchQuery: queryText,
      filter,
      sortBy,
      sortOrder,
    });
  }

  const client = buildImapClient(credentials);

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(folder);
    if (!mailbox.exists) {
      return { messages: [], total: 0, page, pageSize };
    }

    const criteria = buildImapSearchCriteria({ searchField, searchQuery: queryText, filter, legacySearch: search });
    const searchResult = await client.search(criteria, { uid: true });
    const uids = Array.isArray(searchResult) ? searchResult : [];
    if (uids.length === 0) {
      return { messages: [], total: 0, page, pageSize };
    }

    const total = uids.length;
    const canUseUidDatePaging = sortBy === "date" && !queryText;

    if (canUseUidDatePaging) {
      const orderedUids = [...uids].sort((a, b) => (sortOrder === "asc" ? a - b : b - a));
      const pageUids = orderedUids.slice(offset, offset + pageSize);
      const pageItems = await fetchMessageSummaries(client, folder, pageUids);
      await attachSnippets(client, pageItems);
      return { messages: pageItems, total, page, pageSize };
    }

    const summaries: MailMessageSummary[] = [];

    for await (const msg of client.fetch(
      uids,
      {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
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

      summaries.push({
        uid: msg.uid,
        folder,
        subject,
        from,
        to,
        date: envelope?.date?.toISOString() ?? new Date().toISOString(),
        seen: msg.flags?.has("\\Seen") ?? false,
        flagged: msg.flags?.has("\\Flagged") ?? false,
        hasAttachments: hasAttachments(msg.bodyStructure),
        snippet: "",
      });
    }

    const sorted = sortMessageSummaries(summaries, sortBy, sortOrder);
    const slowTotal = sorted.length;
    const pageItems = sorted.slice(offset, offset + pageSize);

    await attachSnippets(client, pageItems);

    return { messages: pageItems, total: slowTotal, page, pageSize };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

async function fetchMessageSummaries(
  client: ReturnType<typeof buildImapClient>,
  folder: string,
  uids: number[],
): Promise<MailMessageSummary[]> {
  if (uids.length === 0) return [];

  const byUid = new Map<number, MailMessageSummary>();

  for await (const msg of client.fetch(
    uids,
    {
      uid: true,
      envelope: true,
      flags: true,
      bodyStructure: true,
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

    byUid.set(msg.uid, {
      uid: msg.uid,
      folder,
      subject,
      from,
      to,
      date: envelope?.date?.toISOString() ?? new Date().toISOString(),
      seen: msg.flags?.has("\\Seen") ?? false,
      flagged: msg.flags?.has("\\Flagged") ?? false,
      hasAttachments: hasAttachments(msg.bodyStructure),
      snippet: "",
    });
  }

  return uids.map((uid) => byUid.get(uid)).filter((item): item is MailMessageSummary => Boolean(item));
}

async function attachSnippets(
  client: ReturnType<typeof buildImapClient>,
  pageItems: MailMessageSummary[],
): Promise<void> {
  if (pageItems.length === 0) return;

  const snippetByUid = new Map<number, string>();
  for await (const msg of client.fetch(
    pageItems.map((m) => m.uid),
    { uid: true, source: { start: 0, maxLength: 800 } },
    { uid: true },
  )) {
    if (!msg.source) continue;
    try {
      const parsed = await simpleParser(msg.source);
      snippetByUid.set(
        msg.uid,
        bodyPreview(parsed).slice(0, 160).replace(/\s+/g, " ").trim(),
      );
    } catch {
      snippetByUid.set(msg.uid, "");
    }
  }
  for (const item of pageItems) {
    item.snippet = snippetByUid.get(item.uid) ?? "";
  }
}

function sortMessageSummaries(
  messages: MailMessageSummary[],
  sortBy: MailMessageSortField,
  sortOrder: MailMessageSortOrder,
): MailMessageSummary[] {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...messages].sort((a, b) => {
    if (sortBy === "date") {
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    }
    if (sortBy === "subject") {
      return a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }) * dir;
    }
    return a.from.localeCompare(b.from, undefined, { sensitivity: "base" }) * dir;
  });
}

function buildImapSearchCriteria(options: {
  searchField?: "date" | "sender" | "subject" | "recipient" | "body";
  searchQuery?: string;
  filter?: "all" | "unread" | "read" | "starred";
  legacySearch?: string;
}): Record<string, unknown> {
  const query = (options.searchQuery ?? options.legacySearch ?? "").trim();
  const usesGmailSyntax =
    Boolean(query) &&
    (!options.searchField || /(^|\s)(is:|has:|in:|from:|to:|subject:|label:|filename:|before:|after:)/i.test(query));

  if (usesGmailSyntax) {
    const parsed = parseMailSearchQuery(query);
    if (options.filter && options.filter !== "all" && parsed.filter === "all") {
      parsed.filter = options.filter;
    }
    return buildImapCriteriaFromParsed(parsed);
  }

  const criteria: Record<string, unknown> = { all: true };

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
  const { useLocalPmailFixture, localFixtureGetMessage } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    return localFixtureGetMessage(credentials, folder, uid);
  }

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
  const { useLocalPmailFixture, localFixtureSetMessageFlags } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    localFixtureSetMessageFlags(credentials, folder, uid, flags);
    return;
  }

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
  const { useLocalPmailFixture, localFixtureMoveMessage } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    localFixtureMoveMessage(credentials, folder, uid, targetFolder);
    return;
  }

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
  const { useLocalPmailFixture, localFixtureDeleteMessage } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    localFixtureDeleteMessage(credentials, folder, uid);
    return;
  }

  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);
    await permanentlyDeleteMessage(client, uid);
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

  const { useLocalPmailFixture, localFixtureBulkMessageAction } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    localFixtureBulkMessageAction(credentials, folder, uids, action, targetFolder);
    return;
  }

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
          await permanentlyDeleteMessage(client, uid);
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

function readHeaderValue(headers: ParsedMail["headers"], name: string): string | null {
  const value = headers.get(name);
  if (!value) return null;
  return typeof value === "string" ? value : value.toString();
}

async function readListUnsubscribeHeaders(
  client: ImapFlow,
  uid: number,
): Promise<{ listUnsubscribe: string | null; listUnsubscribePost: string | null }> {
  const fetched = await client.fetchOne(
    uid,
    { uid: true, source: { start: 0, maxLength: 8192 } },
    { uid: true },
  );
  if (!fetched || !("source" in fetched) || !fetched.source) {
    return { listUnsubscribe: null, listUnsubscribePost: null };
  }

  const parsed = await simpleParser(fetched.source as Buffer);
  return {
    listUnsubscribe: readHeaderValue(parsed.headers, "list-unsubscribe"),
    listUnsubscribePost: readHeaderValue(parsed.headers, "list-unsubscribe-post"),
  };
}

export interface InboxSenderSummary {
  senderKey: string;
  senderEmail: string;
  displayFrom: string;
  messageCount: number;
  unreadCount: number;
  oldestDate: string | null;
  newestDate: string | null;
  hasUnsubscribe: boolean;
}

export async function findArchiveFolderPath(credentials: MailCredentials): Promise<string | null> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    const mailboxes = await client.list();
    const bySpecial = mailboxes.find((box) => box.specialUse === "\\Archive");
    if (bySpecial) return bySpecial.path;

    const byName = mailboxes.find((box) => {
      const path = box.path.toLowerCase();
      const name = box.name.toLowerCase();
      return path === "archive" || path.endsWith(".archive") || name === "archive" || name === "all mail";
    });
    return byName?.path ?? null;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function analyzeInboxSenders(
  credentials: MailCredentials,
  folder: string,
  options: { maxScan: number; maxSenders: number },
): Promise<{ folder: string; scannedCount: number; senders: InboxSenderSummary[] }> {
  const client = buildImapClient(credentials);

  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const searchResult = await client.search({ all: true }, { uid: true });
    const allUids = Array.isArray(searchResult) ? searchResult : [];
    const scanUids = allUids.slice(-options.maxScan);

    type SenderAgg = {
      senderEmail: string;
      displayFrom: string;
      messageCount: number;
      unreadCount: number;
      oldestMs: number;
      newestMs: number;
      latestUid: number;
    };

    const bySender = new Map<string, SenderAgg>();

    for await (const msg of client.fetch(
      scanUids,
      { uid: true, envelope: true, flags: true },
      { uid: true },
    )) {
      const fromAddr = msg.envelope?.from?.[0];
      const displayFrom = fromAddr
        ? `${fromAddr.name ? `${fromAddr.name} ` : ""}<${fromAddr.address}>`
        : "Unknown sender";
      const senderEmail = fromAddr?.address
        ? extractEmailAddress(fromAddr.address)
        : extractEmailAddress(displayFrom);
      const dateMs = msg.envelope?.date?.getTime() ?? Date.now();
      const seen = msg.flags?.has("\\Seen") ?? false;

      const existing = bySender.get(senderEmail);
      if (!existing) {
        bySender.set(senderEmail, {
          senderEmail,
          displayFrom,
          messageCount: 1,
          unreadCount: seen ? 0 : 1,
          oldestMs: dateMs,
          newestMs: dateMs,
          latestUid: msg.uid,
        });
        continue;
      }

      existing.messageCount += 1;
      if (!seen) existing.unreadCount += 1;
      if (dateMs < existing.oldestMs) existing.oldestMs = dateMs;
      if (dateMs >= existing.newestMs) {
        existing.newestMs = dateMs;
        existing.latestUid = msg.uid;
        existing.displayFrom = displayFrom;
      }
    }

    const ranked = [...bySender.values()].sort((a, b) => b.messageCount - a.messageCount);
    const top = ranked.slice(0, options.maxSenders);
    const unsubscribeBySender = new Map<string, boolean>();

    for (const sender of top) {
      const headerValues = await readListUnsubscribeHeaders(client, sender.latestUid);
      unsubscribeBySender.set(
        sender.senderEmail,
        Boolean(headerValues.listUnsubscribe && /https?:\/\//i.test(headerValues.listUnsubscribe)),
      );
    }

    const senders: InboxSenderSummary[] = top.map((sender) => ({
      senderKey: encodeSenderKey(sender.senderEmail),
      senderEmail: sender.senderEmail,
      displayFrom: sender.displayFrom,
      messageCount: sender.messageCount,
      unreadCount: sender.unreadCount,
      oldestDate: new Date(sender.oldestMs).toISOString(),
      newestDate: new Date(sender.newestMs).toISOString(),
      hasUnsubscribe: unsubscribeBySender.get(sender.senderEmail) ?? false,
    }));

    return { folder, scannedCount: scanUids.length, senders };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export async function getMessageUnsubscribeHeaders(
  credentials: MailCredentials,
  folder: string,
  uid: number,
): Promise<{ from: string | null; listUnsubscribe: string | null; listUnsubscribePost: string | null } | null> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);

    const fetched = await client.fetchOne(
      uid,
      { uid: true, envelope: true, source: { start: 0, maxLength: 8192 } },
      { uid: true },
    );
    if (!fetched) return null;

    const fromAddr = fetched.envelope?.from?.[0];
    const from = fromAddr
      ? `${fromAddr.name ? `${fromAddr.name} ` : ""}<${fromAddr.address}>`
      : null;

    const parsed =
      "source" in fetched && fetched.source ? await simpleParser(fetched.source as Buffer) : null;

    return {
      from,
      listUnsubscribe: parsed ? readHeaderValue(parsed.headers, "list-unsubscribe") : null,
      listUnsubscribePost: parsed ? readHeaderValue(parsed.headers, "list-unsubscribe-post") : null,
    };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export type SenderCleanupAction = "delete" | "archive" | "markRead";

export async function performSenderCleanup(
  credentials: MailCredentials,
  folder: string,
  senderEmail: string,
  action: SenderCleanupAction,
  archiveFolder?: string,
): Promise<number> {
  const client = buildImapClient(credentials);
  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const searchResult = await client.search({ from: senderEmail }, { uid: true });
    const uids = Array.isArray(searchResult) ? searchResult : [];
    if (uids.length === 0) return 0;

    for (const uid of uids) {
      switch (action) {
        case "markRead":
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          break;
        case "delete":
          await permanentlyDeleteMessage(client, uid);
          break;
        case "archive":
          if (!archiveFolder) throw new Error("Archive folder required");
          await client.messageMove(uid, archiveFolder, { uid: true });
          break;
      }
    }

    return uids.length;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export interface ScannedMessageAttachments {
  uid: number;
  subject: string;
  from: string;
  date: string;
  attachments: Array<{ partId: string; filename: string; contentType: string; size: number }>;
}

function collectAttachmentParts(structure: unknown): Array<{
  partId: string;
  filename: string;
  contentType: string;
  size: number;
}> {
  const results: Array<{ partId: string; filename: string; contentType: string; size: number }> = [];

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const part = node as {
      type?: string;
      subtype?: string;
      disposition?: string;
      dispositionParameters?: { filename?: string };
      parameters?: { name?: string; filename?: string };
      childNodes?: unknown[];
      size?: number;
    };

    const filename =
      part.dispositionParameters?.filename ??
      part.parameters?.filename ??
      part.parameters?.name ??
      "";
    const contentType =
      part.type && part.subtype ? `${part.type}/${part.subtype}`.toLowerCase() : "application/octet-stream";
    const isAttachment =
      part.disposition === "attachment" || (Boolean(filename) && part.disposition !== "inline");

    if (isAttachment && filename) {
      results.push({
        partId: String(results.length),
        filename,
        contentType,
        size: part.size ?? 0,
      });
    }

    for (const child of part.childNodes ?? []) {
      walk(child);
    }
  };

  walk(structure);
  return results;
}

export async function scanMessagesWithAttachments(
  credentials: MailCredentials,
  folder: string,
  maxMessages: number,
  onlyUid?: number,
): Promise<ScannedMessageAttachments[]> {
  const client = buildImapClient(credentials);

  try {
    await client.connect();
    await client.mailboxOpen(folder);

    let uids: number[];
    if (onlyUid) {
      uids = [onlyUid];
    } else {
      const searchResult = await client.search({ all: true }, { uid: true });
      const allUids = Array.isArray(searchResult) ? searchResult : [];
      uids = allUids.slice(-maxMessages);
    }

    const messages: ScannedMessageAttachments[] = [];

    for await (const msg of client.fetch(
      uids,
      { uid: true, envelope: true, bodyStructure: true },
      { uid: true },
    )) {
      const attachments = collectAttachmentParts(msg.bodyStructure);
      if (attachments.length === 0) continue;

      const envelope = msg.envelope;
      const fromAddr = envelope?.from?.[0];
      messages.push({
        uid: msg.uid,
        subject: envelope?.subject ?? "(No subject)",
        from: fromAddr
          ? `${fromAddr.name ? `${fromAddr.name} ` : ""}<${fromAddr.address}>`
          : "",
        date: envelope?.date?.toISOString() ?? new Date().toISOString(),
        attachments,
      });
    }

    return messages;
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export type SlaInboundMessage = {
  uid: number;
  subject: string;
  fromEmail: string;
  fromDisplay: string;
  date: string;
  messageId: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
};

export async function scanInboundMessagesForSla(
  credentials: MailCredentials,
  folder: string,
  options: { maxScan: number; userEmail: string },
): Promise<{ scannedCount: number; messages: SlaInboundMessage[] }> {
  const client = buildImapClient(credentials);
  const userEmail = extractEmailAddress(options.userEmail).toLowerCase();

  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const searchResult = await client.search({ all: true }, { uid: true });
    const allUids = Array.isArray(searchResult) ? searchResult : [];
    const scanUids = allUids.slice(-options.maxScan);
    const messages: SlaInboundMessage[] = [];

    for await (const msg of client.fetch(
      scanUids,
      { uid: true, source: { start: 0, maxLength: 8192 } },
      { uid: true },
    )) {
      if (!msg.source) continue;
      let parsed: ParsedMail;
      try {
        parsed = await simpleParser(msg.source);
      } catch {
        continue;
      }

      const fromText = parsed.from?.text ?? "";
      const fromEmail = parsed.from?.value?.[0]?.address
        ? extractEmailAddress(parsed.from.value[0].address)
        : extractEmailAddress(fromText);
      if (!fromEmail.includes("@")) continue;
      if (fromEmail.toLowerCase() === userEmail) continue;

      messages.push({
        uid: msg.uid,
        subject: parsed.subject ?? "(No subject)",
        fromEmail,
        fromDisplay: fromText || fromEmail,
        date: (parsed.date ?? new Date()).toISOString(),
        messageId: parsed.messageId ?? null,
        inReplyTo: parsed.inReplyTo ?? null,
        referencesHeader: Array.isArray(parsed.references)
          ? parsed.references.join(" ")
          : parsed.references ?? null,
      });
    }

    return { scannedCount: scanUids.length, messages };
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export type CareerMailMessage = {
  uid: number;
  subject: string;
  fromEmail: string;
  toEmails: string[];
  date: string;
  messageId: string | null;
  snippet: string;
  direction: "inbound" | "outbound";
};

export async function scanFolderMessagesForJobHunter(
  credentials: MailCredentials,
  folder: string,
  options: { maxScan: number; userEmail: string; direction: "inbound" | "outbound" },
): Promise<{ scannedCount: number; messages: CareerMailMessage[] }> {
  const client = buildImapClient(credentials);
  const userEmail = extractEmailAddress(options.userEmail).toLowerCase();

  try {
    await client.connect();
    await client.mailboxOpen(folder);
    const searchResult = await client.search({ all: true }, { uid: true });
    const allUids = Array.isArray(searchResult) ? searchResult : [];
    const scanUids = allUids.slice(-options.maxScan);
    const messages: CareerMailMessage[] = [];

    for await (const msg of client.fetch(
      scanUids,
      { uid: true, source: { start: 0, maxLength: 16384 } },
      { uid: true },
    )) {
      if (!msg.source) continue;
      let parsed: ParsedMail;
      try {
        parsed = await simpleParser(msg.source);
      } catch {
        continue;
      }

      const fromText = parsed.from?.text ?? "";
      const fromEmail = parsed.from?.value?.[0]?.address
        ? extractEmailAddress(parsed.from.value[0].address)
        : extractEmailAddress(fromText);
      const toEmails = formatAddressField(parsed.to)
        .split(",")
        .map((entry) => extractEmailAddress(entry.trim()))
        .filter((email) => email.includes("@"));

      const snippet = (parsed.text ?? parsed.html ?? "").toString().slice(0, 2000);
      const direction =
        fromEmail.toLowerCase() === userEmail ? ("outbound" as const) : ("inbound" as const);
      if (options.direction === "inbound" && direction !== "inbound") continue;
      if (options.direction === "outbound" && direction !== "outbound") continue;

      messages.push({
        uid: msg.uid,
        subject: parsed.subject ?? "(No subject)",
        fromEmail,
        toEmails,
        date: (parsed.date ?? new Date()).toISOString(),
        messageId: parsed.messageId ?? null,
        snippet,
        direction,
      });
    }

    return { scannedCount: scanUids.length, messages };
  } finally {
    await client.logout().catch(() => undefined);
  }
}
