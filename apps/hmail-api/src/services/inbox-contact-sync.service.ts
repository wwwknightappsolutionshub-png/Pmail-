import { extractEmailAddress } from "../lib/list-unsubscribe.js";
import { prisma } from "../lib/prisma.js";
import { analyzeInboxSenders } from "./imap.service.js";
import type { MailCredentials } from "./mail-account.service.js";
import { getMailCredentialsForAccount } from "./mail-account.service.js";
import { createContact, suggestContactsFromEmails } from "./contact.service.js";

const DEFAULT_MAX_SCAN = 250;
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

function parseDisplayName(displayFrom: string): { firstName: string | null; lastName: string | null } {
  const name = displayFrom.replace(/<[^>]+>/g, "").replace(/"/g, "").trim();
  if (!name || name.includes("@")) {
    return { firstName: null, lastName: null };
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: null, lastName: null };
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function isAutomatedSender(email: string): boolean {
  return /^(no-?reply|donotreply|mailer-daemon|postmaster|bounce|notifications?)@/i.test(email);
}

export async function syncInboxContactsForUser(
  userId: string,
  credentials: MailCredentials,
  options?: { force?: boolean },
): Promise<{ addedCount: number; addedEmails: string[]; skippedReason?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { addedCount: 0, addedEmails: [], skippedReason: "user_not_found" };

  if (!options?.force && user.inboxContactsSyncedAt) {
    const elapsed = Date.now() - user.inboxContactsSyncedAt.getTime();
    if (elapsed < SYNC_INTERVAL_MS) {
      return { addedCount: 0, addedEmails: [], skippedReason: "interval" };
    }
  }

  const userEmail = extractEmailAddress(credentials.email).toLowerCase();
  const { senders } = await analyzeInboxSenders(credentials, "INBOX", {
    maxScan: DEFAULT_MAX_SCAN,
    maxSenders: 500,
  });

  const candidateEmails = senders
    .map((sender) => extractEmailAddress(sender.senderEmail).toLowerCase())
    .filter((email) => email.includes("@") && email !== userEmail && !isAutomatedSender(email));

  const newEmails = await suggestContactsFromEmails(userId, candidateEmails);
  const addedEmails: string[] = [];

  for (const email of newEmails) {
    const sender = senders.find((row) => extractEmailAddress(row.senderEmail).toLowerCase() === email);
    const { firstName, lastName } = parseDisplayName(sender?.displayFrom ?? email);
    await createContact(userId, {
      email,
      firstName,
      lastName,
      notes: "Imported automatically from inbox",
    });
    addedEmails.push(email);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { inboxContactsSyncedAt: new Date() },
  });

  return { addedCount: addedEmails.length, addedEmails };
}

export async function syncInboxContactsForDueUsers(): Promise<void> {
  const cutoff = new Date(Date.now() - SYNC_INTERVAL_MS);
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ inboxContactsSyncedAt: null }, { inboxContactsSyncedAt: { lt: cutoff } }],
      mailAccounts: { some: {} },
    },
    select: {
      id: true,
      mailAccounts: {
        where: { isPrimary: true },
        take: 1,
        select: { id: true },
      },
    },
    take: 40,
  });

  for (const user of users) {
    const accountId = user.mailAccounts[0]?.id;
    if (!accountId) continue;
    try {
      const credentials = await getMailCredentialsForAccount(user.id, accountId);
      if (!credentials) continue;
      await syncInboxContactsForUser(user.id, credentials, { force: false });
    } catch (err) {
      console.error(`[inbox-contact-sync] user ${user.id}`, err);
    }
  }
}
