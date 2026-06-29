import { getEnv } from "../config/env.js";
import { extractEmailAddress } from "../lib/list-unsubscribe.js";
import { prisma } from "../lib/prisma.js";
import { isPersonalReferralEmail } from "./referral-recipient-filter.js";
import { listMessages, moveMessagesToJunk, type MailCredentials, type MailMessageSummary } from "./imap.service.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";

const BOT_SUBJECT_PATTERNS = [
  /\bseo\b/i,
  /back[\s-]?links?/i,
  /rank(ing)? (on|in) google/i,
  /google (business|listing|maps)/i,
  /website (design|audit|traffic)/i,
  /increase (your )?(website )?traffic/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\bnft\b/i,
  /\bforex\b/i,
  /\bcasino\b/i,
  /you (have )?won/i,
  /million (dollars|usd|naira)/i,
  /act now/i,
  /limited time offer/i,
  /verify your (account|identity)/i,
  /unusual (sign-in|login|activity)/i,
  /password expir/i,
  /webinar invitation/i,
  /search engine optimization/i,
  /buy (followers|likes|reviews)/i,
  /loan (approved|offer)/i,
  /work from home/i,
  /make money (online|fast)/i,
];

const AUTOMATED_FROM_PATTERNS = [
  /^(mailer-daemon|postmaster|bounce|daemon|noreply|no-reply|donotreply|do-not-reply)@/i,
  /^notifications?@/i,
  /^newsletter@/i,
  /^marketing@/i,
  /^promo(tions)?@/i,
];

const BULK_SENDER_DOMAIN_SUFFIXES = [
  "amazonses.com",
  "sendgrid.net",
  "mailchimp.com",
  "constantcontact.com",
  "mcsv.net",
  "sparkpostmail.com",
  "mailgun.org",
  "mandrillapp.com",
  "facebookmail.com",
  "linkedin.com",
  "hubspotemail.net",
  "beehiiv.com",
  "substack.com",
];

export function isBotSpamFilterEnabled(): boolean {
  return getEnv().PMAIL_BOT_SPAM_FILTER_ENABLED;
}

function isBulkSenderDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase();
  return BULK_SENDER_DOMAIN_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

function hasBotSubjectSignals(text: string): boolean {
  return BOT_SUBJECT_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifyBotSpamMessage(
  message: Pick<MailMessageSummary, "from" | "subject" | "snippet">,
  mailboxEmail?: string,
): boolean {
  const fromEmail = extractEmailAddress(message.from).trim().toLowerCase();
  if (!fromEmail.includes("@")) return false;
  if (mailboxEmail && fromEmail === mailboxEmail.trim().toLowerCase()) return false;

  if (AUTOMATED_FROM_PATTERNS.some((pattern) => pattern.test(fromEmail))) {
    return true;
  }

  const domain = fromEmail.split("@")[1] ?? "";
  const combined = `${message.subject}\n${message.snippet}`.trim();
  const marketingText = /unsubscribe|promotional|marketing email|no longer wish to receive/i.test(combined);

  if (isBulkSenderDomain(domain)) {
    return true;
  }

  if (!isPersonalReferralEmail(fromEmail)) {
    if (hasBotSubjectSignals(combined)) return true;
    if (marketingText) return true;
  }

  if (hasBotSubjectSignals(combined) && /^(hello|hi|dear (sir|madam|owner|team))@/i.test(fromEmail)) {
    return true;
  }

  return false;
}

export async function purgeBotSpamFromMessageList(
  credentials: MailCredentials,
  folder: string,
  messages: MailMessageSummary[],
): Promise<{ messages: MailMessageSummary[]; removed: number }> {
  if (!isBotSpamFilterEnabled()) {
    return { messages, removed: 0 };
  }

  const spamUids = messages
    .filter((message) => classifyBotSpamMessage(message, credentials.email))
    .map((message) => message.uid);

  if (spamUids.length === 0) {
    return { messages, removed: 0 };
  }

  const moved = await moveMessagesToJunk(credentials, folder, spamUids);
  const removedUids = new Set(spamUids.slice(0, moved));
  return {
    messages: messages.filter((message) => !removedUids.has(message.uid)),
    removed: removedUids.size,
  };
}

export async function scanInboxForBotSpam(userId: string): Promise<number> {
  if (!isBotSpamFilterEnabled()) return 0;

  const credentials = await getLatestMailCredentials(userId);
  if (!credentials) return 0;

  const maxScan = getEnv().PMAIL_BOT_SPAM_FILTER_MAX_SCAN;
  let removed = 0;
  let page = 1;

  while (removed < maxScan) {
    const batch = await listMessages(credentials, "INBOX", {
      filter: "unread",
      page,
      pageSize: Math.min(25, maxScan - removed),
    });

    if (batch.messages.length === 0) break;

    const result = await purgeBotSpamFromMessageList(credentials, "INBOX", batch.messages);
    removed += result.removed;

    if (result.removed === 0) {
      page += 1;
      if (page > 4) break;
      continue;
    }

    if (batch.messages.length < batch.pageSize) break;
  }

  return removed;
}

export async function processBotSpamFilterForAllUsers(): Promise<{ users: number; removed: number }> {
  if (!isBotSpamFilterEnabled()) {
    return { users: 0, removed: 0 };
  }

  const sessions = await prisma.session.findMany({
    where: { expiresAt: { gt: new Date() } },
    select: { userId: true },
    distinct: ["userId"],
  });

  let removed = 0;
  let users = 0;

  for (const session of sessions) {
    try {
      const count = await scanInboxForBotSpam(session.userId);
      if (count > 0) {
        users += 1;
        removed += count;
      }
    } catch (err) {
      console.warn("[bot-spam-filter] scan failed", session.userId, err instanceof Error ? err.message : err);
    }
  }

  if (removed > 0) {
    console.info(`[bot-spam-filter] moved ${removed} bot message(s) to Junk across ${users} mailbox(es)`);
  }

  return { users, removed };
}
