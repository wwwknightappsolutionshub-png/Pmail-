import webpush from "web-push";
import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { isMailPushPlatformEnabled } from "./pmail-platform-config.service.js";

function ensureVapid(): { publicKey: string; privateKey: string } {
  const env = getEnv();
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails("mailto:support@prohost.cloud", publicKey, privateKey);
  return { publicKey, privateKey };
}

export function getVapidPublicKey(): string | null {
  return getEnv().VAPID_PUBLIC_KEY ?? null;
}

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  if (!(await isMailPushPlatformEnabled())) {
    throw new Error("Mail push notifications are disabled by platform policy");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mailPushEnabled: true },
  });
  if (!user?.mailPushEnabled) {
    throw new Error("Mail push notifications are disabled for this user");
  }

  await prisma.pwaPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pwaPushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; accountId?: string; accountEmail?: string },
): Promise<number> {
  if (!(await isMailPushPlatformEnabled())) {
    return 0;
  }

  ensureVapid();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mailPushEnabled: true },
  });
  if (!user?.mailPushEnabled) {
    return 0;
  }

  const subs = await prisma.pwaPushSubscription.findMany({ where: { userId } });
  let delivered = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      delivered += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pwaPushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }

  return delivered;
}

export async function getMailPushAudienceStats(): Promise<{
  pushEnabledUsers: number;
  subscribedUsers: number;
  deviceSubscriptions: number;
}> {
  const [pushEnabledUsers, subscribedUsers, deviceSubscriptions] = await Promise.all([
    prisma.user.count({ where: { mailPushEnabled: true, isActive: true } }),
    prisma.user.count({
      where: {
        mailPushEnabled: true,
        isActive: true,
        pwaPushSubscriptions: { some: {} },
      },
    }),
    prisma.pwaPushSubscription.count(),
  ]);

  return { pushEnabledUsers, subscribedUsers, deviceSubscriptions };
}

export async function broadcastMailPush(input: {
  title: string;
  body: string;
  url?: string;
  tenantId?: string;
}): Promise<{ targetedUsers: number; delivered: number }> {
  if (!(await isMailPushPlatformEnabled())) {
    throw new Error("Mail push is disabled platform-wide. Enable it in PMail+ push settings first.");
  }

  ensureVapid();

  const users = await prisma.user.findMany({
    where: {
      mailPushEnabled: true,
      isActive: true,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      pwaPushSubscriptions: { some: {} },
    },
    select: { id: true },
  });

  let delivered = 0;
  for (const user of users) {
    delivered += await sendPushToUser(user.id, {
      title: input.title,
      body: input.body,
      url: input.url ?? "/",
    });
  }

  return { targetedUsers: users.length, delivered };
}

export async function notifyUsersOfNewMail(
  userIds: string[],
  unreadCount: number,
  account?: {
    accountId: string;
    accountEmail: string;
    accountLabel: string | null;
    isActiveAccount: boolean;
  },
): Promise<void> {
  const accountLabel = account?.accountLabel?.trim() || account?.accountEmail;
  const body =
    account && !account.isActiveAccount
      ? unreadCount === 1
        ? `1 new message in ${accountLabel}`
        : `${unreadCount} new messages in ${accountLabel}`
      : unreadCount === 1
        ? "You have 1 new message"
        : `You have ${unreadCount} new messages`;

  const url =
    account && !account.isActiveAccount
      ? `/?switchMailbox=${encodeURIComponent(account.accountId)}`
      : "/";

  for (const userId of userIds) {
    await sendPushToUser(userId, {
      title: "PMail+",
      body,
      url,
      accountId: account?.accountId,
      accountEmail: account?.accountEmail,
    });
  }
}
