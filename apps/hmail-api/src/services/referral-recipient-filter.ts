const GENERIC_LOCAL_PARTS = new Set([
  "abuse",
  "account",
  "accounts",
  "admin",
  "administrator",
  "alert",
  "alerts",
  "billing",
  "bounce",
  "careers",
  "contact",
  "customerservice",
  "customercare",
  "daemon",
  "delivery",
  "donotreply",
  "feedback",
  "finance",
  "hello",
  "help",
  "helpdesk",
  "hr",
  "info",
  "inquiry",
  "inquiries",
  "jobs",
  "legal",
  "mailer-daemon",
  "marketing",
  "membership",
  "news",
  "newsletter",
  "no-reply",
  "noreply",
  "notification",
  "notifications",
  "notify",
  "office",
  "orders",
  "postmaster",
  "press",
  "privacy",
  "promo",
  "promotions",
  "reception",
  "sales",
  "security",
  "service",
  "services",
  "shipping",
  "shop",
  "spam",
  "store",
  "support",
  "system",
  "team",
  "updates",
  "unsubscribe",
  "verify",
  "verification",
  "warehouse",
  "welcome",
]);

const GENERIC_LOCAL_PREFIXES = [
  "auto",
  "automated",
  "bounce",
  "bulk",
  "confirm",
  "confirmation",
  "do-not-reply",
  "donotreply",
  "mailer-daemon",
  "no-reply",
  "noreply",
  "notification",
  "notifications",
  "password",
  "reset",
  "unsubscribe",
];

const GENERIC_DOMAIN_SUFFIXES = [
  "amazonses.com",
  "bounce.google.com",
  "facebookmail.com",
  "linkedin.com",
  "mailchimp.com",
  "sendgrid.net",
  "constantcontact.com",
];

const SMS_GATEWAY_DOMAIN_SUFFIXES = [
  "txt.att.net",
  "vtext.com",
  "tmomail.net",
  "messaging.sprintpcs.com",
  "sms.myboostmobile.com",
  "mymetropcs.com",
  "msg.fi.google.com",
];

function splitEmail(email: string): { local: string; domain: string } | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return {
    local: email.slice(0, at).toLowerCase(),
    domain: email.slice(at + 1).toLowerCase(),
  };
}

export function referralRecipientDedupeKey(email: string): string {
  const parts = splitEmail(email.trim().toLowerCase());
  if (!parts) return email.trim().toLowerCase();

  let { local, domain } = parts;
  const plusIdx = local.indexOf("+");
  if (plusIdx >= 0) local = local.slice(0, plusIdx);

  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");

  return `${local}@${domain}`;
}

function isGenericLocalPart(local: string): boolean {
  const base = local.includes("+") ? local.slice(0, local.indexOf("+")) : local;
  if (!base || /^\d+$/.test(base)) return true;
  if (GENERIC_LOCAL_PARTS.has(base)) return true;
  if (GENERIC_LOCAL_PREFIXES.some((prefix) => base === prefix || base.startsWith(`${prefix}.`) || base.startsWith(`${prefix}-`) || base.startsWith(`${prefix}_`))) {
    return true;
  }
  if (/^(no[-_.]?reply|do[-_.]?not[-_.]?reply)/.test(base)) return true;
  return false;
}

function isGenericDomain(domain: string): boolean {
  if (GENERIC_DOMAIN_SUFFIXES.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`))) {
    return true;
  }
  if (SMS_GATEWAY_DOMAIN_SUFFIXES.some((suffix) => domain === suffix || domain.endsWith(`.${suffix}`))) {
    return true;
  }
  if (/^(mail|email|newsletter|marketing|notifications?|bounce|mailer)\./.test(domain)) return true;
  return false;
}

export function isPersonalReferralEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  const parts = splitEmail(normalized);
  if (!parts) return false;

  if (isGenericLocalPart(parts.local)) return false;
  if (isGenericDomain(parts.domain)) return false;

  return true;
}

export function dedupeReferralRecipients(emails: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const raw of emails) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized.includes("@")) continue;
    if (!isPersonalReferralEmail(normalized)) continue;

    const key = referralRecipientDedupeKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(normalized);
  }

  return unique;
}
