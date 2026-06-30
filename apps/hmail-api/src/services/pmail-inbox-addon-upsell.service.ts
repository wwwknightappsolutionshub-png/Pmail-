import { isCareerNavUnlocked, JOB_HUNTER_CAREER_NAV_SCORE_THRESHOLD } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { sendJobHunterInboxUpsellEmail } from "./addon-email.service.js";
import { hasMarketplaceJobHunterAccess } from "./job-hunter-entitlement.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "./job-hunter-settings.service.js";
import { ensurePmailPlatformConfig } from "./pmail-platform-config.service.js";

const JOB_HUNTER_INBOX_UPSELL_EMAIL_TYPE = "job_hunter_inbox_upsell";

/** After inbox/sent scan, send a Job Hunter upsell when career signals are detected. */
export async function maybeSendInboxAddonUpsellEmails(input: {
  tenantId: string;
  userId: string;
  careerSignalsDetected: boolean;
}): Promise<void> {
  if (!input.careerSignalsDetected) return;

  const platform = await ensurePmailPlatformConfig();
  if (!platform.inboxAddonUpsellEnabled) return;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true, isActive: true },
  });
  if (!user?.isActive) return;

  const hasJobHunter = await hasMarketplaceJobHunterAccess(input.tenantId, input.userId);
  if (hasJobHunter) return;

  const alreadySent = await prisma.addonEmailLog.findFirst({
    where: {
      tenantId: input.tenantId,
      userEmail: user.email,
      emailType: JOB_HUNTER_INBOX_UPSELL_EMAIL_TYPE,
    },
  });
  if (alreadySent) return;

  await sendJobHunterInboxUpsellEmail({
    tenantId: input.tenantId,
    userEmail: user.email,
    addonSlug: JOB_HUNTER_ADDON_SLUG,
  });
}

export function hasCareerUpsellSignals(input: {
  careerScore: number;
  manualJobHuntingOverride: boolean;
  upsertedApplications: number;
}): boolean {
  if (input.upsertedApplications > 0) return true;
  return isCareerNavUnlocked({
    careerScore: input.careerScore,
    manualJobHuntingOverride: input.manualJobHuntingOverride,
  });
}

export { JOB_HUNTER_CAREER_NAV_SCORE_THRESHOLD, JOB_HUNTER_INBOX_UPSELL_EMAIL_TYPE };
