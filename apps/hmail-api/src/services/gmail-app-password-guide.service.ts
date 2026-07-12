import { prisma } from "../lib/prisma.js";
import { isGoogleMailbox } from "../lib/mailbox-credentials.js";
import { PMAIL_LOGIN_URL } from "../data/email-cta-urls.js";
import { sendTemplatedPlatformEmail } from "./platform-email.service.js";

export const GMAIL_APP_PASSWORD_GUIDE_TEMPLATE_SLUG = "pmail-gmail-app-password-guide";

const GMAIL_IMAP_SETTINGS_URL = "https://mail.google.com/mail/u/0/#settings/fwdandpop";
const GMAIL_TWO_STEP_URL = "https://myaccount.google.com/signinoptions/two-step-verification";
const GMAIL_APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

function buildLoginResumeUrl(loginResumePath?: string): string {
  const fallback = PMAIL_LOGIN_URL;
  if (!loginResumePath?.trim()) return fallback;
  try {
    const base = new URL(PMAIL_LOGIN_URL);
    const path = loginResumePath.trim();
    if (!path.startsWith("/")) return fallback;
    return `${base.origin}${path}`;
  } catch {
    return fallback;
  }
}

export async function sendGmailAppPasswordGuideIfNeeded(input: {
  email: string;
  loginResumePath?: string;
}): Promise<{ sent: boolean; reason: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!isGoogleMailbox(normalizedEmail)) {
    return { sent: false, reason: "not_gmail" };
  }

  const since = new Date(Date.now() - RATE_LIMIT_MS);
  const prior = await prisma.platformEmailLog.findFirst({
    where: {
      toAddress: normalizedEmail,
      templateSlug: GMAIL_APP_PASSWORD_GUIDE_TEMPLATE_SLUG,
      status: { in: ["sent", "logged_dev"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
  if (prior) {
    return { sent: false, reason: "already_sent" };
  }

  const loginUrl = buildLoginResumeUrl(input.loginResumePath);
  await sendTemplatedPlatformEmail({
    to: normalizedEmail,
    templateSlug: GMAIL_APP_PASSWORD_GUIDE_TEMPLATE_SLUG,
    variables: {
      productName: "PMail+",
      imapSettingsUrl: GMAIL_IMAP_SETTINGS_URL,
      twoStepUrl: GMAIL_TWO_STEP_URL,
      appPasswordUrl: GMAIL_APP_PASSWORDS_URL,
      loginUrl,
    },
  });

  return { sent: true, reason: "sent" };
}
