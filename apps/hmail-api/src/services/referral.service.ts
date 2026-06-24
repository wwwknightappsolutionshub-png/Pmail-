import { getEnv } from "../config/env.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";
import { renderEmailTemplate } from "./email-template.service.js";
import { listFolders, listMessages, type MailCredentials } from "./imap.service.js";

export const PMail_REFERRAL_TEMPLATE_SLUG = "pmail-refer-friend";
export const PMail_REFERRAL_SUBJECT = "Explore More Possibilities With Mails On PMail+ | Join Me";

const INBOX_RECIPIENT_LIMIT = 30;
const SENT_RECIPIENT_LIMIT = 10;

export type ReferralComposeResult = {
  subject: string;
  body: string;
  bodyHtml: string;
  bcc: string;
  recipientCount: number;
  inboxCount: number;
  sentCount: number;
};

function resolveAppOrigin(): string {
  const origins = getEnv()
    .CORS_ORIGIN.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return origins.find((entry) => entry.includes("5174")) ?? origins[0] ?? "http://localhost:5174";
}

function parseEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/<([^>]+)>/);
  const email = (match?.[1] ?? trimmed).trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

function parseAddressField(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => parseEmailAddress(part))
    .filter((email): email is string => Boolean(email));
}

function collectUniqueEmails(
  rows: Array<{ from: string; to: string }>,
  field: "from" | "to",
  limit: number,
  excludeEmail: string,
  seen: Set<string>,
): string[] {
  const collected: string[] = [];
  for (const row of rows) {
    const candidates = field === "from" ? parseAddressField(row.from) : parseAddressField(row.to);
    for (const email of candidates) {
      if (email === excludeEmail || seen.has(email)) continue;
      seen.add(email);
      collected.push(email);
      if (collected.length >= limit) break;
    }
    if (collected.length >= limit) break;
  }
  return collected;
}

const FALLBACK_REFERRAL_SUBJECT = PMail_REFERRAL_SUBJECT;

const FALLBACK_REFERRAL_BODY = `Hi there,

I've been using PMail+ for my daily mail and workspace tools, and it's been a real upgrade from a standard mail client.

Why I'm recommending PMail+:
- A focused mail workspace designed for modern teams and solo operators
- Platform tools like calendar, scheduling, open tracking, WhatsApp handoff, and PDF exports
- Industry workspaces with CRM-style tools for legal, accounting, healthcare, and more
- Clean upgrade path — start with regular mail, then unlock only what you need

Try it here: {{referralUrl}}

I'd love for you to explore the same workflow I'm using.`;

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function resolveSignatureFooter(userId: string, displayName: string | null, email: string): Promise<string> {
  const settings = await getComposeSettingsByUserId(userId);
  const signature =
    settings.signatures.find((entry) => entry.id === settings.activeSignatureId) ??
    settings.signatures.find((entry) => entry.isDefault) ??
    settings.signatures[0];
  if (signature?.body?.trim()) return signature.body.trim();
  return displayName?.trim() || email;
}

function resolveInboxFolder(folders: Awaited<ReturnType<typeof listFolders>>): string {
  const inbox = folders.find((folder) => folder.specialUse === "\\Inbox");
  return inbox?.path ?? "INBOX";
}

function resolveSentFolder(folders: Awaited<ReturnType<typeof listFolders>>): string | null {
  const sent = folders.find((folder) => folder.specialUse === "\\Sent");
  if (sent?.path) return sent.path;
  const fallback = folders.find((folder) => /sent/i.test(folder.name) || /sent/i.test(folder.path));
  return fallback?.path ?? null;
}

export async function extractReferralRecipients(
  credentials: MailCredentials,
  userEmail: string,
): Promise<{ recipients: string[]; inboxCount: number; sentCount: number }> {
  const excludeEmail = userEmail.trim().toLowerCase();
  const seen = new Set<string>();
  let inboxRecipients: string[] = [];
  let sentRecipients: string[] = [];

  try {
    const folders = await listFolders(credentials);
    const inboxFolder = resolveInboxFolder(folders);
    const inboxResult = await listMessages(credentials, inboxFolder, {
      page: 1,
      pageSize: 120,
      sortBy: "date",
      sortOrder: "desc",
    });
    inboxRecipients = collectUniqueEmails(
      inboxResult.messages,
      "from",
      INBOX_RECIPIENT_LIMIT,
      excludeEmail,
      seen,
    );

    const sentFolder = resolveSentFolder(folders);
    if (sentFolder) {
      const sentResult = await listMessages(credentials, sentFolder, {
        page: 1,
        pageSize: 60,
        sortBy: "date",
        sortOrder: "desc",
      });
      sentRecipients = collectUniqueEmails(sentResult.messages, "to", SENT_RECIPIENT_LIMIT, excludeEmail, seen);
    }
  } catch {
    return { recipients: [], inboxCount: 0, sentCount: 0 };
  }

  return {
    recipients: [...inboxRecipients, ...sentRecipients],
    inboxCount: inboxRecipients.length,
    sentCount: sentRecipients.length,
  };
}

async function renderReferralTemplate(input: {
  senderName: string;
  senderEmail: string;
  referralUrl: string;
  signatureFooter: string;
}): Promise<{ subject: string; body: string; bodyHtml: string }> {
  try {
    const rendered = await renderEmailTemplate(PMail_REFERRAL_TEMPLATE_SLUG, {
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      referralUrl: input.referralUrl,
      productName: "PMail+",
      signatureFooter: input.signatureFooter,
    });
    return {
      subject: rendered.subject,
      body: rendered.text?.trim() || htmlToPlainText(rendered.html),
      bodyHtml: rendered.html,
    };
  } catch {
    const body = FALLBACK_REFERRAL_BODY.replace("{{referralUrl}}", input.referralUrl);
    return {
      subject: FALLBACK_REFERRAL_SUBJECT,
      body: `${body}\n\n--\n${input.signatureFooter}`,
      bodyHtml: buildFallbackReferralHtml({
        referralUrl: input.referralUrl,
        signatureFooter: input.signatureFooter,
      }),
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFallbackReferralHtml(input: { referralUrl: string; signatureFooter: string }): string {
  const safeUrl = input.referralUrl.replace(/"/g, "&quot;");
  const signature = escapeHtml(input.signatureFooter);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/></head><body style="margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#ecfeff;color:#0f172a">
<div style="max-width:620px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:18px;border:1px solid #99f6e4;overflow:hidden">
<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:linear-gradient(135deg,#042f3f,#0d9488);color:#fff"><strong style="font-size:1.35rem">PMail+</strong><span style="font-size:.78rem;opacity:.88">MAIL WORKSPACE</span></div>
<div style="padding:24px;line-height:1.65;font-size:15px;color:#334155"><p>Hi there,</p><p>I've been using <strong>PMail+</strong> for my daily mail and workspace tools, and it's been a real upgrade from a standard mail client.</p>
<p><a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:999px;font-weight:600">Explore PMail+</a></p></div>
<div style="padding:18px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">${signature}</div>
<div style="padding:16px 24px 20px;background:linear-gradient(135deg,#042f3f,#0d4f6c);color:#fff;text-align:center"><strong>PMail+</strong><p style="margin:8px 0 0;font-size:.82rem;opacity:.88">Modern mail workspace with calendar, industry tools, and upgrades on your terms.</p></div>
</div></div></body></html>`;
}

export async function buildReferralCompose(input: {
  userId: string;
  email: string;
  displayName: string | null;
  credentials?: MailCredentials | null;
}): Promise<ReferralComposeResult> {
  const referralUrl = `${resolveAppOrigin()}/welcome?ref=${encodeURIComponent(input.email)}`;
  const senderName = input.displayName?.trim() || input.email.split("@")[0] || "A PMail+ user";

  const signatureFooter = await resolveSignatureFooter(input.userId, input.displayName, input.email);
  const [recipientData, rendered] = await Promise.all([
    input.credentials
      ? extractReferralRecipients(input.credentials, input.email)
      : Promise.resolve({ recipients: [] as string[], inboxCount: 0, sentCount: 0 }),
    renderReferralTemplate({
      senderName,
      senderEmail: input.email,
      referralUrl,
      signatureFooter,
    }),
  ]);

  return {
    subject: rendered.subject,
    body: rendered.body,
    bodyHtml: rendered.bodyHtml,
    bcc: recipientData.recipients.join(", "),
    recipientCount: recipientData.recipients.length,
    inboxCount: recipientData.inboxCount,
    sentCount: recipientData.sentCount,
  };
}
