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
  payload: { title: string; body: string; url?: string },
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

export async function notifyUsersOfNewMail(userIds: string[], unreadCount: number): Promise<void> {
  for (const userId of userIds) {
    await sendPushToUser(userId, {
      title: "PMail+",
      body: unreadCount === 1 ? "You have 1 new message" : `You have ${unreadCount} new messages`,
      url: "/",
    });
  }
}
