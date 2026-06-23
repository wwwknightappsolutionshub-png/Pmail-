import { JOB_HUNTER_TRIAL_DAYS } from "../data/addon-catalog.js";
import { getEnv } from "../config/env.js";
import { isCareerNavUnlocked } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { getMarketplaceActiveAddonSlugs } from "./addon.service.js";
import { getOrCreateJobHunterSettings, JOB_HUNTER_ADDON_SLUG } from "./job-hunter-settings.service.js";

export const JOB_HUNTER_TRIAL_EXPIRED_REASON = "job_hunter_trial_expired";
export const JOB_HUNTER_UPGRADE_URL = "/addons?highlight=job-hunter-functionality";

export interface JobHunterEntitlement {
  hasAccess: boolean;
  canWrite: boolean;
  readOnly: boolean;
  paidActive: boolean;
  marketplaceTrialActive: boolean;
  careerTrialActive: boolean;
  careerTrialExpired: boolean;
  careerTrialStartedAt: string | null;
  careerTrialEndsAt: string | null;
  careerTrialDaysLeft: number | null;
}

export function getJobHunterTrialDurationMs(): number {
  const minutes = getEnv().JOB_HUNTER_TRIAL_MINUTES;
  if (minutes != null) {
    return minutes * 60 * 1000;
  }
  return JOB_HUNTER_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

export function getCareerTrialEndsAt(careerUnlockedAt: Date): Date {
  return new Date(careerUnlockedAt.getTime() + getJobHunterTrialDurationMs());
}

export function isCareerTrialActive(careerUnlockedAt: Date | null | undefined): boolean {
  if (!careerUnlockedAt) return false;
  return getCareerTrialEndsAt(careerUnlockedAt).getTime() > Date.now();
}

function trialDaysLeft(endsAt: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export async function hasMarketplaceJobHunterAccess(tenantId: string, userId?: string): Promise<boolean> {
  const slugs = await getMarketplaceActiveAddonSlugs(tenantId, userId);
  return slugs.includes(JOB_HUNTER_ADDON_SLUG);
}

/** Record career trial start once when career nav first unlocks. */
export async function recordCareerUnlockedIfNeeded(tenantId: string, userId: string): Promise<void> {
  const settings = await getOrCreateJobHunterSettings(tenantId, userId);
  const unlocked = isCareerNavUnlocked({
    careerScore: settings.careerScore,
    manualJobHuntingOverride: settings.manualJobHuntingOverride,
  });
  if (!unlocked || settings.careerUnlockedAt) return;

  await prisma.userJobHunterSettings.update({
    where: { userId },
    data: { careerUnlockedAt: new Date() },
  });
}

export async function getJobHunterEntitlement(tenantId: string, userId: string): Promise<JobHunterEntitlement> {
  await recordCareerUnlockedIfNeeded(tenantId, userId);
  const settings =
    (await prisma.userJobHunterSettings.findUnique({ where: { userId } })) ??
    (await getOrCreateJobHunterSettings(tenantId, userId));
  const marketplaceSlugs = await getMarketplaceActiveAddonSlugs(tenantId, userId);
  const paidOrMarketplaceTrial = marketplaceSlugs.includes(JOB_HUNTER_ADDON_SLUG);

  const careerNavUnlocked = isCareerNavUnlocked({
    careerScore: settings.careerScore,
    manualJobHuntingOverride: settings.manualJobHuntingOverride,
  });
  const careerTrialStartedAt = settings.careerUnlockedAt;
  const careerTrialActive = careerTrialStartedAt ? isCareerTrialActive(careerTrialStartedAt) : false;
  const careerTrialExpired = Boolean(careerTrialStartedAt && !careerTrialActive);
  const careerTrialEndsAt = careerTrialStartedAt ? getCareerTrialEndsAt(careerTrialStartedAt) : null;

  const hasCareerReadAccess = careerNavUnlocked && Boolean(careerTrialStartedAt);
  const hasAccess = paidOrMarketplaceTrial || hasCareerReadAccess;
  const canWrite = paidOrMarketplaceTrial || careerTrialActive;
  const readOnly = hasAccess && !canWrite;

  return {
    hasAccess,
    canWrite,
    readOnly,
    paidActive: paidOrMarketplaceTrial,
    marketplaceTrialActive: paidOrMarketplaceTrial,
    careerTrialActive,
    careerTrialExpired,
    careerTrialStartedAt: careerTrialStartedAt?.toISOString() ?? null,
    careerTrialEndsAt: careerTrialEndsAt?.toISOString() ?? null,
    careerTrialDaysLeft: careerTrialEndsAt ? trialDaysLeft(careerTrialEndsAt) : null,
  };
}

export async function hasJobHunterReadAccess(tenantId: string, userId: string): Promise<boolean> {
  const entitlement = await getJobHunterEntitlement(tenantId, userId);
  return entitlement.hasAccess;
}

export async function hasJobHunterWriteAccess(tenantId: string, userId: string): Promise<boolean> {
  const entitlement = await getJobHunterEntitlement(tenantId, userId);
  return entitlement.canWrite;
}
