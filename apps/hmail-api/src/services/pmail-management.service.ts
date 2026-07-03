import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { getPmailPlatformConfig } from "./pmail-platform-config.service.js";
import { getMailPushAudienceStats, getVapidPublicKey } from "./pwa-push.service.js";
import { getMailUserPresenceStats } from "./user-presence.service.js";

export async function getPmailManagementOverview(includeSuperAdminFields: boolean) {
  const now = new Date();

  const [presence, tenantsWithMailConfig, activeAddonTrials, activeAddonSubscriptions, platformConfig] =
    await Promise.all([
      getMailUserPresenceStats(),
      prisma.tenantMailConfig.count(),
      prisma.tenantAddonTrial.count({ where: { status: "active", endsAt: { gt: now } } }),
      prisma.tenantAddonSubscription.count({ where: { status: "active" } }),
      getPmailPlatformConfig(),
    ]);

  const overview = {
    presence,
    platform: {
      clientRefreshAt: platformConfig.clientRefreshAt,
      updatedAt: platformConfig.updatedAt,
      mailPushEnabled: platformConfig.mailPushEnabled,
      mailPushDefaultForUsers: platformConfig.mailPushDefaultForUsers,
      pwaPushAutoSubscribe: platformConfig.pwaPushAutoSubscribe,
      vapidConfigured: platformConfig.vapidConfigured,
    },
    spamFilter: {
      enabled: getEnv().PMAIL_BOT_SPAM_FILTER_ENABLED,
      maxScanPerRun: getEnv().PMAIL_BOT_SPAM_FILTER_MAX_SCAN,
    },
    addons: {
      activeTrials: activeAddonTrials,
      activeSubscriptions: activeAddonSubscriptions,
    },
    tenantsWithMailConfig,
    asOf: now.toISOString(),
  };

  if (!includeSuperAdminFields) {
    return { overview };
  }

  const pushStats = await getMailPushAudienceStats();
  return {
    overview: {
      ...overview,
      push: {
        ...pushStats,
        vapidConfigured: Boolean(getVapidPublicKey()),
      },
    },
  };
}
