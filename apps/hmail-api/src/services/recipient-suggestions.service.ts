import { prisma } from "../lib/prisma.js";
import { extractReferralRecipients } from "./referral.service.js";
import type { MailCredentials } from "./imap.service.js";

export type RecipientSuggestion = {
  email: string;
  label: string | null;
  source: "contact" | "inbox" | "sent";
};

function parseEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/<([^>]+)>/);
  const email = (match?.[1] ?? trimmed).trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

function matchesQuery(email: string, label: string | null, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (email.includes(needle)) return true;
  if (label?.toLowerCase().includes(needle)) return true;
  return false;
}

export async function listRecipientSuggestions(input: {
  userId: string;
  credentials: MailCredentials;
  userEmail: string;
  query?: string;
  limit?: number;
}): Promise<RecipientSuggestion[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const query = input.query?.trim().toLowerCase() ?? "";
  const seen = new Set<string>();
  const results: RecipientSuggestion[] = [];

  const push = (email: string, label: string | null, source: RecipientSuggestion["source"]) => {
    const normalized = parseEmailAddress(email);
    if (!normalized || seen.has(normalized)) return;
    if (normalized === input.userEmail.trim().toLowerCase()) return;
    if (!matchesQuery(normalized, label, query)) return;
    seen.add(normalized);
    results.push({ email: normalized, label, source });
  };

  const contacts = await prisma.mailContact.findMany({
    where: { userId: input.userId },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      email: true,
      firstName: true,
      lastName: true,
      company: true,
    },
  });

  for (const contact of contacts) {
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    const label = name || contact.company?.trim() || null;
    push(contact.email, label, "contact");
    if (results.length >= limit) return results;
  }

  const mailboxData = await extractReferralRecipients(input.credentials, input.userEmail);
  for (const email of mailboxData.inboxEmails) {
    push(email, null, "inbox");
    if (results.length >= limit) return results;
  }
  for (const email of mailboxData.sentEmails) {
    push(email, null, "sent");
    if (results.length >= limit) return results;
  }

  return results.slice(0, limit);
}
