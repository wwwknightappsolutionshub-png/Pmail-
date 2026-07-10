/** Tier B disclosure version — bump when copy materially changes. */
export const JOB_HUNTER_TIER_B_VERSION = "2025-06-tier-b-v1";

export const JOB_HUNTER_CAREER_NAV_SCORE_THRESHOLD = 20;

export const JOB_HUNTER_PAUSE_DAYS = 90;

export const JOB_HUNTER_REGIONS = ["US", "CA", "UK", "ME", "INTL"] as const;
export type JobHunterRegion = (typeof JOB_HUNTER_REGIONS)[number];

export const JOB_HUNTER_REGION_LABELS: Record<JobHunterRegion, string> = {
  US: "United States",
  CA: "Canada",
  UK: "United Kingdom",
  ME: "Middle East",
  INTL: "International",
};

const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com",
]);

export type MailboxDomainKind = "personal" | "work";

export function extractEmailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return "";
  return normalized.slice(at + 1);
}

export function classifyMailboxDomain(email: string): MailboxDomainKind {
  const domain = extractEmailDomain(email);
  if (!domain) return "work";
  return PERSONAL_MAIL_DOMAINS.has(domain) ? "personal" : "work";
}

export function defaultScanEnabledForEmail(email: string): boolean {
  return classifyMailboxDomain(email) === "personal";
}

export function normalizeJobHunterRegion(value: string | undefined | null): JobHunterRegion {
  if (!value) return "INTL";
  const upper = value.trim().toUpperCase();
  return JOB_HUNTER_REGIONS.includes(upper as JobHunterRegion) ? (upper as JobHunterRegion) : "INTL";
}

export function isJobHunterPaused(pausedUntil: Date | null | undefined, now = new Date()): boolean {
  return Boolean(pausedUntil && pausedUntil.getTime() > now.getTime());
}

export function computeJobHunterPauseUntil(from = new Date()): Date {
  const until = new Date(from);
  until.setDate(until.getDate() + JOB_HUNTER_PAUSE_DAYS);
  return until;
}

export function isCareerNavUnlocked(input: {
  careerScore: number;
  manualJobHuntingOverride: boolean;
}): boolean {
  return input.manualJobHuntingOverride || input.careerScore >= JOB_HUNTER_CAREER_NAV_SCORE_THRESHOLD;
}

/** Days after career intent confirmation before showing Job Hunter workspace promo toast. */
export const JOB_HUNTER_PROMO_TOAST_DELAY_DAYS = 7;

/** QA account that should see the promo toast immediately after deploy. */
export const JOB_HUNTER_PROMO_TOAST_FORCE_EMAIL = "support@knightdesignhub.co.uk";

export function shouldShowJobHunterPromoToast(input: {
  careerNavUnlocked: boolean;
  careerUnlockedAt: Date | null | undefined;
  dismissedAt: Date | null | undefined;
  forceImmediate?: boolean;
  now?: Date;
}): boolean {
  if (!input.careerNavUnlocked) return false;
  if (input.dismissedAt) return false;
  if (input.forceImmediate) return true;
  if (!input.careerUnlockedAt) return false;
  const now = input.now ?? new Date();
  const eligibleAt = new Date(input.careerUnlockedAt);
  eligibleAt.setDate(eligibleAt.getDate() + JOB_HUNTER_PROMO_TOAST_DELAY_DAYS);
  return now.getTime() >= eligibleAt.getTime();
}

export function canScanMailAccount(input: {
  tierBDisclosureAcceptedAt: Date | null | undefined;
  enabled: boolean;
  pausedUntil: Date | null | undefined;
  scanEnabled: boolean;
}): boolean {
  if (!input.tierBDisclosureAcceptedAt) return false;
  if (!input.enabled) return false;
  if (isJobHunterPaused(input.pausedUntil)) return false;
  return input.scanEnabled;
}
