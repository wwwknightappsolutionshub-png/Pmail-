import {
  canScanMailAccount,
  computeJobHunterPauseUntil,
  classifyMailboxDomain,
  defaultScanEnabledForEmail,
  isCareerNavUnlocked,
  isJobHunterPaused,
  JOB_HUNTER_TIER_B_VERSION,
  normalizeJobHunterRegion,
  type JobHunterRegion,
} from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import { getJobHunterEntitlement, recordCareerUnlockedIfNeeded } from "./job-hunter-entitlement.service.js";

export const JOB_HUNTER_ADDON_SLUG = "job-hunter-functionality";

export async function getOrCreateJobHunterSettings(tenantId: string, userId: string) {
  const existing = await prisma.userJobHunterSettings.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.userJobHunterSettings.create({
    data: {
      tenantId,
      userId,
      regionCode: "INTL",
      enabled: true,
      manualJobHuntingOverride: false,
      careerScore: 0,
    },
  });
}

async function listMailAccounts(userId: string) {
  return prisma.userMailAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

async function ensureAccountScanSettings(userId: string, mailAccounts: Array<{ id: string; email: string }>) {
  const existing = await prisma.jobHunterMailAccountSettings.findMany({ where: { userId } });
  const byAccountId = new Map(existing.map((row) => [row.mailAccountId, row]));

  for (const account of mailAccounts) {
    if (byAccountId.has(account.id)) continue;
    const created = await prisma.jobHunterMailAccountSettings.create({
      data: {
        userId,
        mailAccountId: account.id,
        scanEnabled: defaultScanEnabledForEmail(account.email),
      },
    });
    byAccountId.set(account.id, created);
  }

  return [...byAccountId.values()];
}

function formatSettings(
  settings: Awaited<ReturnType<typeof getOrCreateJobHunterSettings>>,
  mailAccounts: Array<{ id: string; email: string; label: string | null; isPrimary: boolean }>,
  accountSettings: Array<{ mailAccountId: string; scanEnabled: boolean }>,
) {
  const scanByAccount = new Map(accountSettings.map((row) => [row.mailAccountId, row.scanEnabled]));
  const needsTierBDisclosure = !settings.tierBDisclosureAcceptedAt;
  const paused = isJobHunterPaused(settings.pausedUntil);
  const careerNavUnlocked = isCareerNavUnlocked({
    careerScore: settings.careerScore,
    manualJobHuntingOverride: settings.manualJobHuntingOverride,
  });

  return {
    regionCode: settings.regionCode as JobHunterRegion,
    enabled: settings.enabled,
    pausedUntil: settings.pausedUntil?.toISOString() ?? null,
    paused,
    manualJobHuntingOverride: settings.manualJobHuntingOverride,
    careerScore: settings.careerScore,
    careerNavUnlocked,
    careerNavScoreThreshold: 50,
    careerUnlockedAt: settings.careerUnlockedAt?.toISOString() ?? null,
    tierBDisclosureVersion: settings.tierBDisclosureVersion,
    tierBDisclosureAcceptedAt: settings.tierBDisclosureAcceptedAt?.toISOString() ?? null,
    needsTierBDisclosure,
    inferencesDeletedAt: settings.inferencesDeletedAt?.toISOString() ?? null,
    mailAccounts: mailAccounts.map((account) => {
      const scanEnabled = scanByAccount.get(account.id) ?? defaultScanEnabledForEmail(account.email);
      return {
        id: account.id,
        email: account.email,
        label: account.label,
        isPrimary: account.isPrimary,
        domainKind: classifyMailboxDomain(account.email),
        scanEnabled,
        canScan: canScanMailAccount({
          tierBDisclosureAcceptedAt: settings.tierBDisclosureAcceptedAt,
          enabled: settings.enabled,
          pausedUntil: settings.pausedUntil,
          scanEnabled,
        }),
      };
    }),
  };
}

export async function getJobHunterSettings(tenantId: string, userId: string) {
  const [settings, mailAccounts] = await Promise.all([
    getOrCreateJobHunterSettings(tenantId, userId),
    listMailAccounts(userId),
  ]);
  const accountSettings = await ensureAccountScanSettings(userId, mailAccounts);
  const entitlement = await getJobHunterEntitlement(tenantId, userId);
  return {
    ...formatSettings(settings, mailAccounts, accountSettings),
    entitlement,
  };
}

export async function getJobHunterConsentStatus(tenantId: string, userId: string) {
  const settings = await getOrCreateJobHunterSettings(tenantId, userId);
  return {
    needsDisclosure: !settings.tierBDisclosureAcceptedAt,
    tierBDisclosureVersion: JOB_HUNTER_TIER_B_VERSION,
    acceptedAt: settings.tierBDisclosureAcceptedAt?.toISOString() ?? null,
    recordedVersion: settings.tierBDisclosureVersion,
  };
}

export async function acceptJobHunterTierBDisclosure(tenantId: string, userId: string) {
  const mailAccounts = await listMailAccounts(userId);
  await ensureAccountScanSettings(userId, mailAccounts);

  const settings = await prisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      regionCode: "INTL",
      enabled: true,
      tierBDisclosureAcceptedAt: new Date(),
      tierBDisclosureVersion: JOB_HUNTER_TIER_B_VERSION,
    },
    update: {
      tierBDisclosureAcceptedAt: new Date(),
      tierBDisclosureVersion: JOB_HUNTER_TIER_B_VERSION,
    },
  });

  const accountSettings = await prisma.jobHunterMailAccountSettings.findMany({ where: { userId } });
  return formatSettings(settings, mailAccounts, accountSettings);
}

export async function updateJobHunterSettings(
  tenantId: string,
  userId: string,
  input: {
    regionCode?: string;
    enabled?: boolean;
    pause90Days?: boolean;
    clearPause?: boolean;
    manualJobHuntingOverride?: boolean;
    mailAccountScan?: Array<{ mailAccountId: string; scanEnabled: boolean }>;
  },
) {
  await getOrCreateJobHunterSettings(tenantId, userId);

  const data: {
    regionCode?: string;
    enabled?: boolean;
    pausedUntil?: Date | null;
    manualJobHuntingOverride?: boolean;
  } = {};

  if (input.regionCode !== undefined) {
    data.regionCode = normalizeJobHunterRegion(input.regionCode);
  }
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.manualJobHuntingOverride !== undefined) {
    data.manualJobHuntingOverride = input.manualJobHuntingOverride;
  }
  if (input.pause90Days) {
    data.pausedUntil = computeJobHunterPauseUntil();
  }
  if (input.clearPause) {
    data.pausedUntil = null;
  }

  if (Object.keys(data).length > 0) {
    await prisma.userJobHunterSettings.update({
      where: { userId },
      data,
    });
  }

  if (input.mailAccountScan?.length) {
    for (const row of input.mailAccountScan) {
      await prisma.jobHunterMailAccountSettings.upsert({
        where: { mailAccountId: row.mailAccountId },
        create: {
          userId,
          mailAccountId: row.mailAccountId,
          scanEnabled: row.scanEnabled,
        },
        update: { scanEnabled: row.scanEnabled },
      });
    }
  }

  await recordCareerUnlockedIfNeeded(tenantId, userId);
  return getJobHunterSettings(tenantId, userId);
}

export async function deleteJobHunterInferences(tenantId: string, userId: string) {
  await prisma.userJobHunterSettings.update({
    where: { userId },
    data: {
      careerScore: 0,
      inferencesDeletedAt: new Date(),
    },
  });

  return getJobHunterSettings(tenantId, userId);
}

export type CvScannerAccessDeniedReason = "addon" | "career_nav_locked";

export async function canRateCvWithScanner(
  tenantId: string,
  userId: string,
  fromToastOptIn: boolean,
): Promise<{ allowed: boolean; reason?: CvScannerAccessDeniedReason }> {
  const entitled = await tenantHasAddonAccess(tenantId, JOB_HUNTER_ADDON_SLUG, userId);
  if (!entitled) return { allowed: false, reason: "addon" };

  if (fromToastOptIn) return { allowed: true };

  const settings = await getOrCreateJobHunterSettings(tenantId, userId);
  if (
    isCareerNavUnlocked({
      careerScore: settings.careerScore,
      manualJobHuntingOverride: settings.manualJobHuntingOverride,
    })
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: "career_nav_locked" };
}

export async function userCanRunJobHunterScan(tenantId: string, userId: string, mailAccountId: string): Promise<boolean> {
  const entitled = await tenantHasAddonAccess(tenantId, JOB_HUNTER_ADDON_SLUG, userId);
  if (!entitled) return false;

  const settings = await prisma.userJobHunterSettings.findUnique({ where: { userId } });
  if (!settings) return false;

  const accountSettings = await prisma.jobHunterMailAccountSettings.findUnique({
    where: { mailAccountId },
  });
  if (!accountSettings || accountSettings.userId !== userId) return false;

  return canScanMailAccount({
    tierBDisclosureAcceptedAt: settings.tierBDisclosureAcceptedAt,
    enabled: settings.enabled,
    pausedUntil: settings.pausedUntil,
    scanEnabled: accountSettings.scanEnabled,
  });
}
