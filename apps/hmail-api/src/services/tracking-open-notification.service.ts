import { prisma } from "../lib/prisma.js";
import { sendPushToUser } from "./pwa-push.service.js";
import { hasOpenTrackingAccess } from "./open-tracking-entitlement.service.js";

export async function notifySenderOfTrackingOpen(row: {
  id: string;
  userId: string;
  toEmail: string;
  subject: string;
  firstOpenedAt: Date | null;
}): Promise<void> {
  if (row.firstOpenedAt) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    select: { tenantId: true, mailPushEnabled: true },
  });
  if (!user) return;

  const entitled = await hasOpenTrackingAccess(row.userId, user.tenantId);
  if (!entitled) return;

  const body = `Your message to ${row.toEmail} was opened.`;
  const pushDelivered = await sendPushToUser(row.userId, {
    title: "Email opened",
    body,
    url: "/mail?view=open_tracking",
  });

  if (pushDelivered === 0) {
    await prisma.trackingOpenNotification.create({
      data: {
        userId: row.userId,
        sentMessageTrackingId: row.id,
        toEmail: row.toEmail,
        subject: row.subject,
      },
    });
  }
}

export async function listUnreadTrackingOpenNotifications(userId: string) {
  const rows = await prisma.trackingOpenNotification.findMany({
    where: { userId, readAt: null },
    orderBy: { openedAt: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    sentMessageTrackingId: row.sentMessageTrackingId,
    toEmail: row.toEmail,
    subject: row.subject,
    openedAt: row.openedAt.toISOString(),
  }));
}

export async function markTrackingOpenNotificationsRead(userId: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const result = await prisma.trackingOpenNotification.updateMany({
    where: { userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
