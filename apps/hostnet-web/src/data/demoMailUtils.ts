import type { DemoCrmContact, DemoMessage } from "./bespokeMailDemoData";

export type SenderGroup = {
  senderEmail: string;
  senderName: string;
  contactId?: string;
  messages: DemoMessage[];
  unreadCount: number;
  latestTime: string;
};

export function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim().toLowerCase();
}

export function senderDisplayName(from: string): string {
  const label = from.replace(/<.+>/, "").trim();
  return label || extractSenderEmail(from);
}

export function formatFromHeader(name: string, email: string): string {
  return `${name} <${email}>`;
}

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function buildSenderGroups(messages: DemoMessage[], contacts: DemoCrmContact[]): SenderGroup[] {
  const bySender = new Map<string, DemoMessage[]>();

  for (const message of messages) {
    const senderEmail = extractSenderEmail(message.from);
    const bucket = bySender.get(senderEmail) ?? [];
    bucket.push(message);
    bySender.set(senderEmail, bucket);
  }

  const groups: SenderGroup[] = [];

  for (const [senderEmail, bucket] of bySender.entries()) {
    const linkedContact = contacts.find((contact) => contact.email.toLowerCase() === senderEmail);
    const senderName = linkedContact?.name ?? senderDisplayName(bucket[0]?.from ?? senderEmail);

    groups.push({
      senderEmail,
      senderName,
      contactId: linkedContact?.id ?? bucket.find((message) => message.contactId)?.contactId,
      messages: bucket,
      unreadCount: bucket.filter((message) => message.unread).length,
      latestTime: bucket[0]?.time ?? "",
    });
  }

  return groups.sort((a, b) => b.messages.length - a.messages.length);
}

export function messageCountForContact(contact: DemoCrmContact, messages: DemoMessage[]): number {
  const email = contact.email.toLowerCase();
  return messages.filter((message) => extractSenderEmail(message.from) === email).length;
}

export function filterMessagesByInboxFolder(
  messages: DemoMessage[],
  folder: string,
  allFolders: string[],
): DemoMessage[] {
  const allFolder = allFolders[0];
  if (!allFolder || folder === allFolder) return messages;

  const folderLower = folder.toLowerCase();
  return messages.filter((message) =>
    message.tags.some((tag) => {
      const tagLower = tag.toLowerCase();
      if (tagLower.includes(folderLower) || folderLower.includes(tagLower)) return true;
      return folderLower
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .some((word) => tagLower.includes(word));
    }),
  );
}
