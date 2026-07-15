import type { MailMessageSummary, MailSortOrder } from "../types/mail";

export function messageTimestamp(message: MailMessageSummary): number {
  const timestamp = Date.parse(message.date);
  return Number.isFinite(timestamp) ? timestamp : message.uid;
}

export function compareMessagesByDate(
  a: MailMessageSummary,
  b: MailMessageSummary,
  sortOrder: MailSortOrder,
): number {
  const delta = messageTimestamp(a) - messageTimestamp(b);
  if (delta !== 0) {
    return sortOrder === "asc" ? delta : -delta;
  }
  return sortOrder === "asc" ? a.uid - b.uid : b.uid - a.uid;
}

export function sortMessagesByDate(
  messages: MailMessageSummary[],
  sortOrder: MailSortOrder,
): MailMessageSummary[] {
  return [...messages].sort((a, b) => compareMessagesByDate(a, b, sortOrder));
}
