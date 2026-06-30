import { prisma } from "../lib/prisma.js";
import { getVapidPublicKey } from "./pwa-push.service.js";

export type PmailPlatformConfigPayload = {
  mailPushEnabled: boolean;
  mailPushDefaultForUsers: boolean;
  pwaPushAutoSubscribe: boolean;
  inboxAddonUpsellEnabled: boolean;
  vapidConfigured: boolean;
  clientRefreshAt: string;
  updatedAt: string;
};

const DEFAULTS = {
  mailPushEnabled: true,
  mailPushDefaultForUsers: true,
  pwaPushAutoSubscribe: true,
  inboxAddonUpsellEnabled: true,
} as const;

function serialize(row: {
  mailPushEnabled: boolean;
  mailPushDefaultForUsers: boolean;
  pwaPushAutoSubscribe: boolean;
  inboxAddonUpsellEnabled: boolean;
  clientRefreshAt: Date;
  updatedAt: Date;
}): PmailPlatformConfigPayload {
  return {
    mailPushEnabled: row.mailPushEnabled,
    mailPushDefaultForUsers: row.mailPushDefaultForUsers,
    pwaPushAutoSubscribe: row.pwaPushAutoSubscribe,
    inboxAddonUpsellEnabled: row.inboxAddonUpsellEnabled,
    vapidConfigured: Boolean(getVapidPublicKey()),
    clientRefreshAt: row.clientRefreshAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensurePmailPlatformConfig() {
  return prisma.pmailPlatformConfig.upsert({
    where: { id: "default" },
    create: { id: "default", ...DEFAULTS },
    update: {},
  });
}

export async function getPmailPlatformConfig(): Promise<PmailPlatformConfigPayload> {
  const row = await ensurePmailPlatformConfig();
  return serialize(row);
}

export async function bumpPmailClientRefresh(): Promise<string> {
  await ensurePmailPlatformConfig();
  const updated = await prisma.pmailPlatformConfig.update({
    where: { id: "default" },
    data: { clientRefreshAt: new Date() },
  });
  return updated.clientRefreshAt.toISOString();
}

export async function getPmailClientRefreshAt(): Promise<string> {
  const row = await ensurePmailPlatformConfig();
  return row.clientRefreshAt.toISOString();
}

export async function isMailPushPlatformEnabled(): Promise<boolean> {
  const row = await ensurePmailPlatformConfig();
  return row.mailPushEnabled;
}

export async function updatePmailPlatformConfig(input: {
  mailPushEnabled?: boolean;
  mailPushDefaultForUsers?: boolean;
  pwaPushAutoSubscribe?: boolean;
  inboxAddonUpsellEnabled?: boolean;
}): Promise<PmailPlatformConfigPayload> {
  const row = await prisma.pmailPlatformConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      mailPushEnabled: input.mailPushEnabled ?? DEFAULTS.mailPushEnabled,
      mailPushDefaultForUsers: input.mailPushDefaultForUsers ?? DEFAULTS.mailPushDefaultForUsers,
      pwaPushAutoSubscribe: input.pwaPushAutoSubscribe ?? DEFAULTS.pwaPushAutoSubscribe,
      inboxAddonUpsellEnabled: input.inboxAddonUpsellEnabled ?? DEFAULTS.inboxAddonUpsellEnabled,
    },
    update: {
      ...(input.mailPushEnabled !== undefined ? { mailPushEnabled: input.mailPushEnabled } : {}),
      ...(input.mailPushDefaultForUsers !== undefined
        ? { mailPushDefaultForUsers: input.mailPushDefaultForUsers }
        : {}),
      ...(input.pwaPushAutoSubscribe !== undefined ? { pwaPushAutoSubscribe: input.pwaPushAutoSubscribe } : {}),
      ...(input.inboxAddonUpsellEnabled !== undefined
        ? { inboxAddonUpsellEnabled: input.inboxAddonUpsellEnabled }
        : {}),
    },
  });

  if (input.mailPushDefaultForUsers === true) {
    await prisma.user.updateMany({
      where: { mailPushEnabled: false },
      data: { mailPushEnabled: true },
    });
  }

  return serialize(row);
}

export async function resolveUserMailPushPreference(userId: string): Promise<{
  platformEnabled: boolean;
  userEnabled: boolean;
  autoSubscribe: boolean;
  active: boolean;
}> {
  const [platform, user] = await Promise.all([
    ensurePmailPlatformConfig(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { mailPushEnabled: true },
    }),
  ]);

  const userEnabled = user?.mailPushEnabled ?? platform.mailPushDefaultForUsers;
  const platformEnabled = platform.mailPushEnabled;
  const autoSubscribe = platformEnabled && platform.pwaPushAutoSubscribe && userEnabled;

  return {
    platformEnabled,
    userEnabled,
    autoSubscribe,
    active: platformEnabled && userEnabled,
  };
}
