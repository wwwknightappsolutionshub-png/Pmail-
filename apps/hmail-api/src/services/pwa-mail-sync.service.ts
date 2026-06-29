import { prisma } from "../lib/prisma.js";
import { getMailCredentialsForAccount } from "./mail-account.service.js";
import { listMessages } from "./imap.service.js";
import { notifyUsersOfNewMail } from "./pwa-push.service.js";
import { isMailPushPlatformEnabled } from "./pmail-platform-config.service.js";

const lastUnreadByAccount = new Map<string, number>();

function accountKey(userId: string, accountId: string): string {
  return `${userId}:${accountId}`;
}

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
    const accounts = await prisma.userMailAccount.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    });

    if (accounts.length === 0) {
      continue;
    }

    const session = await prisma.session.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { activeMailAccountId: true },
    });
    const activeId = session?.activeMailAccountId ?? accounts.find((row) => row.isPrimary)?.id ?? accounts[0]?.id;

    for (const account of accounts) {
      const credentials = await getMailCredentialsForAccount(userId, account.id);
      if (!credentials) continue;

      try {
        const inbox = await listMessages(credentials, "INBOX", {
          filter: "unread",
          page: 1,
          pageSize: 1,
        });
        const unread = inbox.total;
        const key = accountKey(userId, account.id);
        const prev = lastUnreadByAccount.get(key) ?? 0;
        if (unread > prev) {
          const delta = unread - prev;
          await notifyUsersOfNewMail([userId], delta, {
            accountId: account.id,
            accountEmail: account.email,
            accountLabel: account.label,
            isActiveAccount: account.id === activeId,
          });
          notified += 1;
        }
        lastUnreadByAccount.set(key, unread);
      } catch {
        // skip accounts with IMAP errors
      }
    }
  }

  return notified;
}

export function seedUnreadBaseline(userId: string, accountId: string, unread: number): void {
  lastUnreadByAccount.set(accountKey(userId, accountId), unread);
}

export function clearPwaUnreadBaseline(): void {
  lastUnreadByAccount.clear();
}
