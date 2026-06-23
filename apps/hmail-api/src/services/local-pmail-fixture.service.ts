import type {
  MailCredentials,
  MailFolder,
  MailMessageDetail,
  MailMessageListResult,
  MailMessageSortField,
  MailMessageSortOrder,
} from "./imap.service.js";

const FIXTURE_FOLDERS: MailFolder[] = [
  {
    path: "INBOX",
    name: "INBOX",
    delimiter: "/",
    flags: [],
    listed: true,
    specialUse: "\\Inbox",
    unseen: 2,
  },
  {
    path: "Sent",
    name: "Sent",
    delimiter: "/",
    flags: [],
    listed: true,
    specialUse: "\\Sent",
    unseen: 0,
  },
  {
    path: "Drafts",
    name: "Drafts",
    delimiter: "/",
    flags: [],
    listed: true,
    specialUse: "\\Drafts",
    unseen: 0,
  },
  {
    path: "Trash",
    name: "Trash",
    delimiter: "/",
    flags: [],
    listed: true,
    specialUse: "\\Trash",
    unseen: 0,
  },
];

type FixtureMessage = MailMessageDetail;

type FixtureFlagOverrides = { seen?: boolean; flagged?: boolean };

const fixtureFlagOverrides = new Map<string, FixtureFlagOverrides>();

function fixtureMessageKey(email: string, folder: string, uid: number): string {
  return `${email}\0${folder}\0${uid}`;
}

function withFixtureFlagOverrides(email: string, message: FixtureMessage): FixtureMessage {
  const overrides = fixtureFlagOverrides.get(fixtureMessageKey(email, message.folder, message.uid));
  if (!overrides) return { ...message };
  return {
    ...message,
    seen: overrides.seen ?? message.seen,
    flagged: overrides.flagged ?? message.flagged,
  };
}

function fixtureMessages(email: string): FixtureMessage[] {
  return [
    {
      uid: 1,
      folder: "INBOX",
      subject: "Interview invitation — Product Manager at Northwind",
      from: "talent@northwind.com",
      to: email,
      cc: "",
      bcc: "",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      seen: false,
      flagged: false,
      hasAttachments: false,
      snippet: "We would like to schedule a phone screen for the Product Manager role.",
      html: "<p>We would like to schedule a phone screen for the Product Manager role.</p>",
      text: "We would like to schedule a phone screen for the Product Manager role.",
      attachments: [],
    },
    {
      uid: 2,
      folder: "INBOX",
      subject: "Thank you for applying to Backend Engineer",
      from: "careers@acme.example",
      to: email,
      cc: "",
      bcc: "",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      seen: false,
      flagged: false,
      hasAttachments: false,
      snippet: "We received your application and will review it shortly.",
      html: "<p>We received your application and will review it shortly.</p>",
      text: "We received your application and will review it shortly.",
      attachments: [],
    },
    {
      uid: 3,
      folder: "INBOX",
      subject: "Weekly team update",
      from: "manager@company.example",
      to: email,
      cc: "",
      bcc: "",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      seen: true,
      flagged: false,
      hasAttachments: false,
      snippet: "Sprint review notes and action items for this week.",
      html: "<p>Sprint review notes and action items for this week.</p>",
      text: "Sprint review notes and action items for this week.",
      attachments: [],
    },
    {
      uid: 101,
      folder: "Sent",
      subject: "Application for Backend Engineer at Acme Corp",
      from: email,
      to: "careers@acme.example",
      cc: "",
      bcc: "",
      date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      seen: true,
      flagged: false,
      hasAttachments: true,
      snippet: "Please find my resume attached for the Backend Engineer position.",
      html: "<p>Please find my resume attached for the Backend Engineer position.</p>",
      text: "Please find my resume attached for the Backend Engineer position.",
      attachments: [{ filename: "resume.pdf", contentType: "application/pdf", size: 120_000, partId: "1" }],
    },
  ];
}

export function useLocalPmailFixture(credentials: MailCredentials): boolean {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return false;
  return credentials.mailConfig.imapHost === "local.pmail.test";
}

export function localFixtureListFolders(): MailFolder[] {
  return FIXTURE_FOLDERS.map((folder) => ({ ...folder }));
}

function sortMessages(
  messages: FixtureMessage[],
  sortBy: MailMessageSortField,
  sortOrder: MailMessageSortOrder,
): FixtureMessage[] {
  const dir = sortOrder === "asc" ? 1 : -1;
  return [...messages].sort((a, b) => {
    if (sortBy === "subject") return a.subject.localeCompare(b.subject) * dir;
    if (sortBy === "sender") return a.from.localeCompare(b.from) * dir;
    return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
  });
}

export function localFixtureListMessages(
  credentials: MailCredentials,
  folder: string,
  options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    filter?: "all" | "unread" | "read" | "starred";
    sortBy?: MailMessageSortField;
    sortOrder?: MailMessageSortOrder;
  } = {},
): MailMessageListResult {
  const pageSize = options.pageSize ?? 30;
  const page = options.page ?? 1;
  const sortBy = options.sortBy ?? "date";
  const sortOrder = options.sortOrder ?? "desc";
  const filter = options.filter ?? "all";
  const query = (options.searchQuery ?? "").trim().toLowerCase();

  let rows = fixtureMessages(credentials.email)
    .filter((msg) => msg.folder === folder)
    .map((msg) => withFixtureFlagOverrides(credentials.email, msg));
  if (filter === "unread") rows = rows.filter((msg) => !msg.seen);
  if (filter === "read") rows = rows.filter((msg) => msg.seen);
  if (filter === "starred") rows = rows.filter((msg) => msg.flagged);
  if (query) {
    rows = rows.filter(
      (msg) =>
        msg.subject.toLowerCase().includes(query) ||
        msg.from.toLowerCase().includes(query) ||
        msg.to.toLowerCase().includes(query) ||
        msg.snippet.toLowerCase().includes(query),
    );
  }

  rows = sortMessages(rows, sortBy, sortOrder);
  const total = rows.length;
  const offset = (page - 1) * pageSize;
  const slice = rows.slice(offset, offset + pageSize);

  return {
    messages: slice.map(({ html: _html, text: _text, cc: _cc, bcc: _bcc, attachments: _attachments, ...summary }) => summary),
    total,
    page,
    pageSize,
  };
}

export function localFixtureGetMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
): MailMessageDetail | null {
  const message = fixtureMessages(credentials.email).find((msg) => msg.folder === folder && msg.uid === uid);
  return message ? withFixtureFlagOverrides(credentials.email, message) : null;
}

export function localFixtureSetMessageFlags(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  flags: { seen?: boolean; flagged?: boolean },
): void {
  const message = fixtureMessages(credentials.email).find((msg) => msg.folder === folder && msg.uid === uid);
  if (!message) return;

  const key = fixtureMessageKey(credentials.email, folder, uid);
  const current = fixtureFlagOverrides.get(key) ?? {};
  fixtureFlagOverrides.set(key, {
    seen: flags.seen ?? current.seen,
    flagged: flags.flagged ?? current.flagged,
  });
}

export function localFixtureMoveMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  targetFolder: string,
): void {
  void credentials;
  void folder;
  void uid;
  void targetFolder;
}

export function localFixtureDeleteMessage(credentials: MailCredentials, folder: string, uid: number): void {
  void credentials;
  void folder;
  void uid;
}

export function localFixtureBulkMessageAction(
  credentials: MailCredentials,
  folder: string,
  uids: number[],
  _action: "markRead" | "markUnread" | "delete" | "move" | "reportSpam",
  _targetFolder?: string,
): void {
  for (const uid of uids) {
    if (_action === "markRead") {
      localFixtureSetMessageFlags(credentials, folder, uid, { seen: true });
    } else if (_action === "markUnread") {
      localFixtureSetMessageFlags(credentials, folder, uid, { seen: false });
    }
  }
}
