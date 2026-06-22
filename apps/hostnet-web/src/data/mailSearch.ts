import type { DemoMessage } from "./bespokeMailDemoData";
import type { DemoOutboundMail, DemoTrashItem } from "./demoMailClient";
import { extractSenderEmail, senderDisplayName } from "./demoMailUtils";

export type MailSearchScope = "all" | "inbox" | "sent" | "drafts" | "scheduled" | "trash";

export type MailSearchSizePreset = "any" | "100k" | "1mb" | "5mb" | "10mb" | "20mb";

export type MailSearchAdvanced = {
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  hasWords: string;
  excludeWords: string;
  filename: string;
  label: string;
  scope: MailSearchScope;
  datePreset: "any" | "1d" | "3d" | "1w" | "1m" | "1y" | "custom";
  after: string;
  before: string;
  hasAttachment: boolean;
  unreadOnly: boolean;
  readOnly: boolean;
  sizeComparison: "greater" | "less";
  sizePreset: MailSearchSizePreset;
};

export type ParsedMailSearch = {
  freeText: string;
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  hasWords?: string;
  excludeWords?: string;
  filename?: string;
  label?: string;
  hasAttachment?: boolean;
  isUnread?: boolean;
  isRead?: boolean;
  sizeComparison?: "greater" | "less";
  sizePreset?: MailSearchSizePreset;
  scope: MailSearchScope;
  after?: Date;
  before?: Date;
};

export type MailSearchResultItem = {
  id: string;
  kind: "inbox" | "outbound" | "trash";
  folder: MailSearchScope;
  folderLabel: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  hasAttachment?: boolean;
  labels?: string[];
  inboxMessageId?: string;
  outboundId?: string;
  trashId?: string;
};

export type MailSearchRecord = {
  id: string;
  kind: "inbox" | "outbound" | "trash";
  folder: MailSearchScope;
  folderLabel: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  preview: string;
  time: string;
  unread?: boolean;
  hasAttachment?: boolean;
  attachmentNames: string[];
  labels: string[];
  inboxMessageId?: string;
  outboundId?: string;
  trashId?: string;
};

export type MailSearchContactSuggestion = {
  name: string;
  email: string;
};

export const MAIL_SEARCH_SCOPES: Array<{ value: MailSearchScope; label: string }> = [
  { value: "all", label: "All Mail" },
  { value: "inbox", label: "Inbox" },
  { value: "sent", label: "Sent Mail" },
  { value: "drafts", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "trash", label: "Trash" },
];

export const MAIL_SEARCH_SIZE_OPTIONS: Array<{ value: MailSearchSizePreset; label: string }> = [
  { value: "any", label: "Any size" },
  { value: "100k", label: "100 KB" },
  { value: "1mb", label: "1 MB" },
  { value: "5mb", label: "5 MB" },
  { value: "10mb", label: "10 MB" },
  { value: "20mb", label: "20 MB" },
];

export const MAIL_SEARCH_OPERATOR_GROUPS = [
  {
    title: "People & headers",
    items: [
      { operator: "from:", description: "Messages from a sender" },
      { operator: "to:", description: "Messages sent to a recipient" },
      { operator: "cc:", description: "Messages that copied an address" },
      { operator: "bcc:", description: "Messages that blind-copied an address" },
      { operator: "subject:", description: "Words in the subject line" },
    ],
  },
  {
    title: "Content & files",
    items: [
      { operator: "has:attachment", description: "Messages with attachments" },
      { operator: "filename:", description: "Attachment name contains text" },
      { operator: "label:", description: "Workspace label or tag" },
      { operator: "-word", description: "Exclude a word from results" },
    ],
  },
  {
    title: "Status & location",
    items: [
      { operator: "is:unread", description: "Unread messages only" },
      { operator: "is:read", description: "Read messages only" },
      { operator: "in:inbox", description: "Search inbox only" },
      { operator: "in:sent", description: "Search sent mail only" },
      { operator: "in:drafts", description: "Search drafts only" },
      { operator: "in:trash", description: "Search trash only" },
    ],
  },
];

export const MAIL_SEARCH_SUGGESTIONS = MAIL_SEARCH_OPERATOR_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ label: item.description, value: item.operator.endsWith(":") ? item.operator : item.operator })),
);

export const MAIL_SEARCH_QUICK_FILTERS: Array<{
  id: string;
  label: string;
  apply: (advanced: MailSearchAdvanced) => MailSearchAdvanced;
}> = [
  {
    id: "unread",
    label: "Unread",
    apply: (advanced) => ({ ...advanced, unreadOnly: true, readOnly: false }),
  },
  {
    id: "read",
    label: "Read",
    apply: (advanced) => ({ ...advanced, readOnly: true, unreadOnly: false }),
  },
  {
    id: "attachment",
    label: "Has attachment",
    apply: (advanced) => ({ ...advanced, hasAttachment: true }),
  },
  {
    id: "week",
    label: "Last 7 days",
    apply: (advanced) => ({ ...advanced, datePreset: "1w", after: "", before: "" }),
  },
  {
    id: "month",
    label: "Last 30 days",
    apply: (advanced) => ({ ...advanced, datePreset: "1m", after: "", before: "" }),
  },
  {
    id: "inbox",
    label: "In inbox",
    apply: (advanced) => ({ ...advanced, scope: "inbox" }),
  },
];

const RECENT_SEARCHES_KEY = "pmail-mail-search-recent";
const RECENT_SEARCH_LIMIT = 8;

export function emptyMailSearchAdvanced(scope: MailSearchScope = "all"): MailSearchAdvanced {
  return {
    from: "",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    hasWords: "",
    excludeWords: "",
    filename: "",
    label: "",
    scope,
    datePreset: "any",
    after: "",
    before: "",
    hasAttachment: false,
    unreadOnly: false,
    readOnly: false,
    sizeComparison: "greater",
    sizePreset: "any",
  };
}

export function loadRecentMailSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function rememberMailSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = loadRecentMailSearches().filter((entry) => entry !== trimmed);
  current.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(current.slice(0, RECENT_SEARCH_LIMIT)));
}

function parseSearchDate(raw: string): Date | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const slashMatch = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (slashMatch) {
    const date = new Date(Number(slashMatch[1]), Number(slashMatch[2]) - 1, Number(slashMatch[3]));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeScope(raw: string): MailSearchScope | undefined {
  const value = raw.trim().toLowerCase();
  if (value === "inbox") return "inbox";
  if (value === "sent" || value === "outbox") return "sent";
  if (value === "drafts" || value === "draft") return "drafts";
  if (value === "scheduled") return "scheduled";
  if (value === "trash") return "trash";
  if (value === "anywhere" || value === "all") return "all";
  return undefined;
}

function parseSizePreset(raw: string): MailSearchSizePreset | undefined {
  const value = raw.trim().toUpperCase();
  if (value === "100K" || value === "100KB") return "100k";
  if (value === "1M" || value === "1MB") return "1mb";
  if (value === "5M" || value === "5MB") return "5mb";
  if (value === "10M" || value === "10MB") return "10mb";
  if (value === "20M" || value === "20MB") return "20mb";
  return undefined;
}

function tokenizeQuery(query: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(query)) !== null) {
    tokens.push(match[1] ?? match[2] ?? "");
  }
  return tokens;
}

export function parseGmailQuery(query: string, fallbackScope: MailSearchScope = "all"): ParsedMailSearch {
  const parsed: ParsedMailSearch = {
    freeText: "",
    scope: fallbackScope,
  };
  const freeText: string[] = [];

  for (const token of tokenizeQuery(query)) {
    const lower = token.toLowerCase();

    if (lower.startsWith("from:")) {
      parsed.from = token.slice(5).trim();
      continue;
    }
    if (lower.startsWith("to:")) {
      parsed.to = token.slice(3).trim();
      continue;
    }
    if (lower.startsWith("cc:")) {
      parsed.cc = token.slice(3).trim();
      continue;
    }
    if (lower.startsWith("bcc:")) {
      parsed.bcc = token.slice(4).trim();
      continue;
    }
    if (lower.startsWith("subject:")) {
      parsed.subject = token.slice(8).trim();
      continue;
    }
    if (lower.startsWith("filename:")) {
      parsed.filename = token.slice(9).trim();
      continue;
    }
    if (lower.startsWith("label:")) {
      parsed.label = token.slice(6).trim();
      continue;
    }
    if (lower.startsWith("has:") && lower.slice(4) === "attachment") {
      parsed.hasAttachment = true;
      continue;
    }
    if (lower === "is:unread") {
      parsed.isUnread = true;
      continue;
    }
    if (lower === "is:read") {
      parsed.isRead = true;
      continue;
    }
    if (lower.startsWith("in:")) {
      const scope = normalizeScope(token.slice(3));
      if (scope) parsed.scope = scope;
      continue;
    }
    if (lower.startsWith("after:")) {
      parsed.after = parseSearchDate(token.slice(6));
      continue;
    }
    if (lower.startsWith("before:")) {
      parsed.before = parseSearchDate(token.slice(7));
      continue;
    }
    if (lower.startsWith("larger:")) {
      parsed.sizeComparison = "greater";
      parsed.sizePreset = parseSizePreset(token.slice(7)) ?? "1mb";
      continue;
    }
    if (lower.startsWith("smaller:")) {
      parsed.sizeComparison = "less";
      parsed.sizePreset = parseSizePreset(token.slice(8)) ?? "1mb";
      continue;
    }
    if (token.startsWith("-") && token.length > 1) {
      parsed.excludeWords = parsed.excludeWords ? `${parsed.excludeWords} ${token.slice(1)}` : token.slice(1);
      continue;
    }

    freeText.push(token);
  }

  parsed.freeText = freeText.join(" ").trim();
  if (parsed.hasWords === undefined && parsed.freeText) {
    parsed.hasWords = parsed.freeText;
  }
  return parsed;
}

function deriveDatePreset(parsed: ParsedMailSearch): MailSearchAdvanced["datePreset"] {
  if (parsed.after && parsed.before) return "custom";
  if (!parsed.after) return "any";
  const now = Date.now();
  const diffDays = Math.ceil((now - parsed.after.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 1) return "1d";
  if (diffDays <= 3) return "3d";
  if (diffDays <= 7) return "1w";
  if (diffDays <= 31) return "1m";
  if (diffDays <= 366) return "1y";
  return "custom";
}

export function advancedFromParsed(parsed: ParsedMailSearch, fallbackScope: MailSearchScope): MailSearchAdvanced {
  return {
    from: parsed.from ?? "",
    to: parsed.to ?? "",
    cc: parsed.cc ?? "",
    bcc: parsed.bcc ?? "",
    subject: parsed.subject ?? "",
    hasWords: parsed.hasWords ?? parsed.freeText ?? "",
    excludeWords: parsed.excludeWords ?? "",
    filename: parsed.filename ?? "",
    label: parsed.label ?? "",
    scope: parsed.scope ?? fallbackScope,
    datePreset: parsed.after || parsed.before ? deriveDatePreset(parsed) : "any",
    after: parsed.after ? formatDateInput(parsed.after) : "",
    before: parsed.before ? formatDateInput(parsed.before) : "",
    hasAttachment: Boolean(parsed.hasAttachment),
    unreadOnly: Boolean(parsed.isUnread),
    readOnly: Boolean(parsed.isRead),
    sizeComparison: parsed.sizeComparison ?? "greater",
    sizePreset: parsed.sizePreset ?? "any",
  };
}

export function advancedToParsed(advanced: MailSearchAdvanced): ParsedMailSearch {
  const parsed: ParsedMailSearch = {
    freeText: advanced.hasWords.trim(),
    from: advanced.from.trim() || undefined,
    to: advanced.to.trim() || undefined,
    cc: advanced.cc.trim() || undefined,
    bcc: advanced.bcc.trim() || undefined,
    subject: advanced.subject.trim() || undefined,
    hasWords: advanced.hasWords.trim() || undefined,
    excludeWords: advanced.excludeWords.trim() || undefined,
    filename: advanced.filename.trim() || undefined,
    label: advanced.label.trim() || undefined,
    hasAttachment: advanced.hasAttachment || undefined,
    isUnread: advanced.unreadOnly || undefined,
    isRead: advanced.readOnly || undefined,
    sizeComparison: advanced.sizePreset === "any" ? undefined : advanced.sizeComparison,
    sizePreset: advanced.sizePreset === "any" ? undefined : advanced.sizePreset,
    scope: advanced.scope,
  };

  const now = new Date();
  if (advanced.datePreset === "custom") {
    parsed.after = parseSearchDate(advanced.after);
    parsed.before = parseSearchDate(advanced.before);
  } else if (advanced.datePreset !== "any") {
    const start = new Date(now);
    if (advanced.datePreset === "1d") start.setDate(start.getDate() - 1);
    if (advanced.datePreset === "3d") start.setDate(start.getDate() - 3);
    if (advanced.datePreset === "1w") start.setDate(start.getDate() - 7);
    if (advanced.datePreset === "1m") start.setMonth(start.getMonth() - 1);
    if (advanced.datePreset === "1y") start.setFullYear(start.getFullYear() - 1);
    parsed.after = start;
  }

  return parsed;
}

export function parsedToQuery(parsed: ParsedMailSearch): string {
  const parts: string[] = [];
  if (parsed.from) parts.push(`from:${quoteToken(parsed.from)}`);
  if (parsed.to) parts.push(`to:${quoteToken(parsed.to)}`);
  if (parsed.cc) parts.push(`cc:${quoteToken(parsed.cc)}`);
  if (parsed.bcc) parts.push(`bcc:${quoteToken(parsed.bcc)}`);
  if (parsed.subject) parts.push(`subject:${quoteToken(parsed.subject)}`);
  if (parsed.filename) parts.push(`filename:${quoteToken(parsed.filename)}`);
  if (parsed.label) parts.push(`label:${quoteToken(parsed.label)}`);
  if (parsed.hasAttachment) parts.push("has:attachment");
  if (parsed.isUnread) parts.push("is:unread");
  if (parsed.isRead) parts.push("is:read");
  if (parsed.scope !== "all") parts.push(`in:${parsed.scope === "sent" ? "sent" : parsed.scope}`);
  if (parsed.after) parts.push(`after:${formatSearchDate(parsed.after)}`);
  if (parsed.before) parts.push(`before:${formatSearchDate(parsed.before)}`);
  if (parsed.sizePreset && parsed.sizePreset !== "any") {
    const sizeToken = parsed.sizePreset === "100k" ? "100K" : `${parsed.sizePreset.replace("mb", "M").toUpperCase()}`;
    parts.push(`${parsed.sizeComparison === "less" ? "smaller" : "larger"}:${sizeToken}`);
  }
  if (parsed.excludeWords) {
    for (const word of parsed.excludeWords.split(/\s+/).filter(Boolean)) {
      parts.push(`-${quoteToken(word)}`);
    }
  }
  if (parsed.hasWords) parts.push(quoteToken(parsed.hasWords));
  else if (parsed.freeText) parts.push(quoteToken(parsed.freeText));
  return parts.join(" ").trim();
}

function quoteToken(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function formatSearchDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function attachmentNamesForMessage(message: DemoMessage): string[] {
  const names = [...(message.attachments ?? [])];
  if (message.attachment) names.push(message.attachment);
  return names;
}

function attachmentNamesForOutbound(mail: DemoOutboundMail): string[] {
  return mail.attachment ? [mail.attachment] : [];
}

function messageHasAttachment(message: DemoMessage): boolean {
  return attachmentNamesForMessage(message).length > 0;
}

function outboundHasAttachment(mail: DemoOutboundMail): boolean {
  return attachmentNamesForOutbound(mail).length > 0;
}

function parseMessageTime(time: string): Date | undefined {
  const parsed = new Date(time);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function passesSizeFilter(record: MailSearchRecord, parsed: ParsedMailSearch): boolean {
  if (!parsed.sizePreset || parsed.sizePreset === "any") return true;
  if (!record.hasAttachment) return parsed.sizeComparison === "less";
  return true;
}

function matchesParsed(record: MailSearchRecord, parsed: ParsedMailSearch): boolean {
  if (parsed.scope !== "all" && record.folder !== parsed.scope) return false;

  if (parsed.from && !includesText(record.from, parsed.from) && !includesText(record.to, parsed.from)) return false;
  if (parsed.to && !includesText(record.to, parsed.to) && !includesText(record.from, parsed.to)) return false;
  if (parsed.cc && !includesText(record.cc, parsed.cc) && !includesText(record.body, parsed.cc)) return false;
  if (parsed.bcc && !includesText(record.bcc, parsed.bcc) && !includesText(record.body, parsed.bcc)) return false;
  if (parsed.subject && !includesText(record.subject, parsed.subject)) return false;

  if (parsed.label) {
    const labelMatch = record.labels.some((label) => includesText(label, parsed.label!));
    if (!labelMatch) return false;
  }

  if (parsed.filename) {
    const filenameMatch = record.attachmentNames.some((name) => includesText(name, parsed.filename!));
    if (!filenameMatch) return false;
  }

  if (parsed.hasWords) {
    const blob = `${record.subject} ${record.preview} ${record.body} ${record.from} ${record.to} ${record.labels.join(" ")}`.toLowerCase();
    for (const word of parsed.hasWords.split(/\s+/).filter(Boolean)) {
      if (!blob.includes(word.toLowerCase())) return false;
    }
  }

  if (parsed.excludeWords) {
    const blob = `${record.subject} ${record.preview} ${record.body}`.toLowerCase();
    for (const word of parsed.excludeWords.split(/\s+/).filter(Boolean)) {
      if (blob.includes(word.toLowerCase())) return false;
    }
  }

  if (parsed.hasAttachment && !record.hasAttachment) return false;
  if (parsed.isUnread && !record.unread) return false;
  if (parsed.isRead && record.unread) return false;
  if (!passesSizeFilter(record, parsed)) return false;

  const time = parseMessageTime(record.time);
  if (parsed.after && time && time < parsed.after) return false;
  if (parsed.before && time && time > parsed.before) return false;

  return true;
}

export function buildMailSearchCorpus(input: {
  messages: DemoMessage[];
  outbox: DemoOutboundMail[];
  drafts: DemoOutboundMail[];
  scheduled: DemoOutboundMail[];
  trash: DemoTrashItem[];
  outboundFromHeader: string;
}): MailSearchRecord[] {
  const records: MailSearchRecord[] = [];

  for (const message of input.messages) {
    records.push({
      id: `inbox-${message.id}`,
      kind: "inbox",
      folder: "inbox",
      folderLabel: "Inbox",
      from: message.from,
      to: input.outboundFromHeader,
      cc: "",
      bcc: "",
      subject: message.subject,
      body: message.body,
      preview: message.preview,
      time: message.time,
      unread: message.unread,
      hasAttachment: messageHasAttachment(message),
      attachmentNames: attachmentNamesForMessage(message),
      labels: message.tags,
      inboxMessageId: message.id,
    });
  }

  for (const mail of input.outbox) {
    records.push({
      id: `sent-${mail.id}`,
      kind: "outbound",
      folder: "sent",
      folderLabel: "Sent",
      from: input.outboundFromHeader,
      to: `${mail.to} <${mail.toEmail}>`,
      cc: "",
      bcc: "",
      subject: mail.subject,
      body: mail.body,
      preview: mail.preview,
      time: mail.time,
      hasAttachment: outboundHasAttachment(mail),
      attachmentNames: attachmentNamesForOutbound(mail),
      labels: ["Sent"],
      outboundId: mail.id,
    });
  }

  for (const mail of input.drafts) {
    records.push({
      id: `draft-${mail.id}`,
      kind: "outbound",
      folder: "drafts",
      folderLabel: "Drafts",
      from: input.outboundFromHeader,
      to: `${mail.to} <${mail.toEmail}>`,
      cc: "",
      bcc: "",
      subject: mail.subject,
      body: mail.body,
      preview: mail.preview,
      time: mail.time,
      hasAttachment: outboundHasAttachment(mail),
      attachmentNames: attachmentNamesForOutbound(mail),
      labels: ["Draft"],
      outboundId: mail.id,
    });
  }

  for (const mail of input.scheduled) {
    records.push({
      id: `scheduled-${mail.id}`,
      kind: "outbound",
      folder: "scheduled",
      folderLabel: "Scheduled",
      from: input.outboundFromHeader,
      to: `${mail.to} <${mail.toEmail}>`,
      cc: "",
      bcc: "",
      subject: mail.subject,
      body: mail.body,
      preview: mail.preview,
      time: mail.scheduledFor ?? mail.time,
      hasAttachment: outboundHasAttachment(mail),
      attachmentNames: attachmentNamesForOutbound(mail),
      labels: ["Scheduled"],
      outboundId: mail.id,
    });
  }

  for (const item of input.trash) {
    if (item.inboxMessage) {
      const message = item.inboxMessage;
      records.push({
        id: `trash-inbox-${item.id}`,
        kind: "trash",
        folder: "trash",
        folderLabel: "Trash",
        from: message.from,
        to: input.outboundFromHeader,
        cc: "",
        bcc: "",
        subject: message.subject,
        body: message.body,
        preview: message.preview,
        time: message.time,
        unread: message.unread,
        hasAttachment: messageHasAttachment(message),
        attachmentNames: attachmentNamesForMessage(message),
        labels: message.tags,
        inboxMessageId: message.id,
        trashId: item.id,
      });
    } else if (item.outboundMail) {
      const mail = item.outboundMail;
      records.push({
        id: `trash-outbound-${item.id}`,
        kind: "trash",
        folder: "trash",
        folderLabel: "Trash",
        from: input.outboundFromHeader,
        to: `${mail.to} <${mail.toEmail}>`,
        cc: "",
        bcc: "",
        subject: mail.subject,
        body: mail.body,
        preview: mail.preview,
        time: mail.time,
        hasAttachment: outboundHasAttachment(mail),
        attachmentNames: attachmentNamesForOutbound(mail),
        labels: ["Trash"],
        outboundId: mail.id,
        trashId: item.id,
      });
    }
  }

  return records;
}

export function searchMailRecords(records: MailSearchRecord[], parsed: ParsedMailSearch): MailSearchResultItem[] {
  return records
    .filter((record) => matchesParsed(record, parsed))
    .map((record) => ({
      id: record.id,
      kind: record.kind,
      folder: record.folder,
      folderLabel: record.folderLabel,
      from: record.from,
      to: record.to,
      subject: record.subject,
      preview: record.preview,
      time: record.time,
      unread: record.unread,
      hasAttachment: record.hasAttachment,
      labels: record.labels,
      inboxMessageId: record.inboxMessageId,
      outboundId: record.outboundId,
      trashId: record.trashId,
    }));
}

export function resultSenderLabel(result: MailSearchResultItem): string {
  if (result.kind === "inbox" || result.kind === "trash") {
    return senderDisplayName(result.from);
  }
  return result.to ? senderDisplayName(result.to) : "Recipient";
}

export function resultSenderEmail(result: MailSearchResultItem): string {
  if (result.kind === "inbox" || result.kind === "trash") {
    return extractSenderEmail(result.from);
  }
  return extractSenderEmail(result.to);
}
