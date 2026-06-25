import { prisma } from "../lib/prisma.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";
import { listMessages } from "./imap.service.js";
import { notifyUsersOfNewMail } from "./pwa-push.service.js";
import { isMailPushPlatformEnabled } from "./pmail-platform-config.service.js";

const lastUnreadByUser = new Map<string, number>();

export async function syncMailForPwaUsers(): Promise<number> {
  if (!(await isMailPushPlatformEnabled())) {
    return 0;
  }

  const users = await prisma.pwaPushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let notified = 0;

  for (const { userId } of users) {
    const creds = await getLatestMailCredentials(userId);
    if (!creds) continue;

    try {
      const inbox = await listMessages(creds, "INBOX", {
        filter: "unread",
        page: 1,
        pageSize: 1,
      });
      const unread = inbox.total;
      const prev = lastUnreadByUser.get(userId) ?? 0;
      if (unread > prev) {
        await notifyUsersOfNewMail([userId], unread - prev);
        notified += 1;
      }
      lastUnreadByUser.set(userId, unread);
    } catch {
      // skip users with IMAP errors
    }
  }

  return notified;
}
