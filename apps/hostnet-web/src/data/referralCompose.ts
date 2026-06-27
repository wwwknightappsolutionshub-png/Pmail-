import type { DemoMessage } from "./bespokeMailDemoData";
import type { DemoOutboundMail } from "./demoMailClient";
import { buildPmailReferralHtml, referralHtmlToPlainText } from "./referralBrandedEmail";
import { extractSenderEmail } from "./demoMailUtils";
import { isPersonalReferralEmail, referralRecipientDedupeKey } from "../utils/referralRecipientFilter";

export const REFERRAL_REWARD_TOAST =
  "Congratulations you can now enjoy the Platform tools free of charge for 7 days";

export type ReferralComposePayload = {
  subject: string;
  body: string;
  bodyHtml: string;
  bcc: string;
  recipientCount: number;
  inboxCount: number;
  sentCount: number;
};
const INBOX_RECIPIENT_LIMIT = 30;
const SENT_RECIPIENT_LIMIT = 10;
function collectUniqueEmails(values: string[], limit: number, excludeEmail: string, seen: Set<string>): string[] {
  const collected: string[] = [];
  const excludeKey = referralRecipientDedupeKey(excludeEmail);
  for (const value of values) {
    for (const email of parseAddressCandidates(value)) {
      if (!email || referralRecipientDedupeKey(email) === excludeKey) continue;
      if (!isPersonalReferralEmail(email)) continue;

      const dedupeKey = referralRecipientDedupeKey(email);
      if (seen.has(dedupeKey)) continue;

      seen.add(dedupeKey);
      collected.push(email);
      if (collected.length >= limit) return collected;
    }
  }
  return collected;
}

function parseAddressCandidates(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => extractSenderEmail(part))
    .filter((email) => email.includes("@"));
}

export function extractDemoReferralRecipients(
  inboxMessages: DemoMessage[],
  outboundMail: DemoOutboundMail[],
  userEmail: string,
): Pick<ReferralComposePayload, "bcc" | "recipientCount" | "inboxCount" | "sentCount"> {
  const excludeEmail = userEmail.trim().toLowerCase();
  const seen = new Set<string>();

  const inboxRecipients = collectUniqueEmails(
    inboxMessages.map((message) => message.from),
    INBOX_RECIPIENT_LIMIT,
    excludeEmail,
    seen,
  );

  const sentRecipients = collectUniqueEmails(
    outboundMail.map((mail) => mail.toEmail),
    SENT_RECIPIENT_LIMIT,
    excludeEmail,
    seen,
  );

  const recipients = [...inboxRecipients, ...sentRecipients];
  return {
    bcc: recipients.join(", "),
    recipientCount: recipients.length,
    inboxCount: inboxRecipients.length,
    sentCount: sentRecipients.length,
  };
}

export function buildDemoReferralCompose(input: {
  inboxMessages: DemoMessage[];
  outboundMail: DemoOutboundMail[];
  userEmail: string;
  userName?: string;
  signatureFooter?: string;
}): ReferralComposePayload {
  const recipientData = extractDemoReferralRecipients(input.inboxMessages, input.outboundMail, input.userEmail);
  const referralUrl = `${window.location.origin}/login?ref=${encodeURIComponent(input.userEmail)}`;
  const senderName = input.userName?.trim() || input.userEmail.split("@")[0] || "A PMail+ user";
  const footer = input.signatureFooter?.trim() || senderName;
  const bodyHtml = buildPmailReferralHtml({
    referralUrl,
    senderName,
    senderEmail: input.userEmail,
    signatureFooter: footer,
  });

  return {
    subject: "Explore More Possibilities With Mails On PMail+ | Join Me",
    body: referralHtmlToPlainText(bodyHtml),
    bodyHtml,
    ...recipientData,
  };
}