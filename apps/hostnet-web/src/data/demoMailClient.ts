import type { DemoMessage } from "./bespokeMailDemoData";

export type MailFolderId =
  | "new-mail"
  | "inbox"
  | "outbox"
  | "drafts"
  | "scheduled"
  | "trash"
  | "documents";

export type OutboundMailStatus = "draft" | "outbox" | "scheduled" | "sent";

export type MailOpenTracking = {
  enabled: boolean;
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
};

export type DemoOutboundMail = {
  id: string;
  to: string;
  toEmail: string;
  subject: string;
  body: string;
  preview: string;
  time: string;
  status: OutboundMailStatus;
  scheduledFor?: string;
  attachment?: string;
  contactId?: string;
  openTracking?: MailOpenTracking;
};

export type DemoTrashItem = {
  id: string;
  kind: "inbox" | "outbound";
  sourceFolder: MailFolderId | "inbox";
  deletedAt: string;
  inboxMessage?: DemoMessage;
  outboundMail?: DemoOutboundMail;
  outboundBucket?: "drafts" | "outbox" | "scheduled";
};

export type DocumentAttachmentRow = {
  id: string;
  senderEmail: string;
  date: string;
  attachment: string;
  messageId: string;
  messageSubject: string;
};

export type ComposeMailDraft = {
  id?: string;
  toName: string;
  toEmail: string;
  ccEmail: string;
  bccEmail: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  attachment: string;
  scheduleDate: string;
  scheduleTime: string;
  contactId: string;
};

export const OUTLOOK_MAIL_FOLDERS: { id: MailFolderId; label: string }[] = [
  { id: "new-mail", label: "New Mail" },
  { id: "inbox", label: "Inbox" },
  { id: "outbox", label: "Outbox" },
  { id: "drafts", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "trash", label: "Trash" },
  { id: "documents", label: "Documents" },
];

export const DOCUMENTS_PAGE_SIZE = 4;

export function defaultOpenTracking(): MailOpenTracking {
  return { enabled: true, openCount: 0 };
}

export function openedOpenTracking(
  firstOpenedAt: string,
  lastOpenedAt?: string,
  openCount = 1,
): MailOpenTracking {
  return {
    enabled: true,
    openCount,
    firstOpenedAt,
    lastOpenedAt: lastOpenedAt ?? firstOpenedAt,
  };
}

export function mailIsOpened(tracking?: MailOpenTracking): boolean {
  return Boolean(tracking?.enabled && tracking.openCount > 0);
}

export function formatOpenTrackingSummary(tracking?: MailOpenTracking): string {
  if (!tracking?.enabled) return "Tracking off";
  if (tracking.openCount === 0) return "Not opened yet";
  if (tracking.openCount === 1) return "Opened once";
  return `Opened ${tracking.openCount} times`;
}

export function emptyComposeDraft(defaultContactId: string): ComposeMailDraft {
  return {
    toName: "",
    toEmail: "",
    ccEmail: "",
    bccEmail: "",
    subject: "",
    body: "",
    attachment: "",
    scheduleDate: "",
    scheduleTime: "09:00",
    contactId: defaultContactId,
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
  };
}

export function extractDocumentRows(
  inboxMessages: DemoMessage[],
  outboundMail: DemoOutboundMail[],
): DocumentAttachmentRow[] {
  const rows: DocumentAttachmentRow[] = [];

  for (const message of inboxMessages) {
    const senderEmail = message.from.match(/<([^>]+)>/)?.[1] ?? message.from;
    const attachmentNames = [
      ...(message.attachment ? [message.attachment] : []),
      ...(message.attachments ?? []),
    ];

    for (const attachment of attachmentNames) {
      rows.push({
        id: `doc-${message.id}-${attachment}`,
        senderEmail: senderEmail.trim().toLowerCase(),
        date: message.time,
        attachment,
        messageId: message.id,
        messageSubject: message.subject,
      });
    }
  }

  for (const mail of outboundMail) {
    if (!mail.attachment) continue;
    rows.push({
      id: `doc-out-${mail.id}-${mail.attachment}`,
      senderEmail: mail.toEmail.trim().toLowerCase(),
      date: mail.scheduledFor ?? mail.time,
      attachment: mail.attachment,
      messageId: mail.id,
      messageSubject: mail.subject,
    });
  }

  return rows.sort((a, b) => a.attachment.localeCompare(b.attachment));
}

export type MailClientSeedData = {
  drafts: DemoOutboundMail[];
  outbox: DemoOutboundMail[];
  scheduled: DemoOutboundMail[];
};
