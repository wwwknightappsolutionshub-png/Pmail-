import { prisma } from "../lib/prisma.js";
import { getInboxUnseenCount } from "./imap.service.js";
import { getMailCredentialsForAccount } from "./mail-account.service.js";

export type MailAccountUnreadRow = {
  id: string;
  email: string;
  label: string | null;
  unread: number;
  isActive: boolean;
  isPrimary: boolean;
};

export async function getMailAccountsUnreadSummary(
  userId: string,
  activeMailAccountId: string | null,
): Promise<{ accounts: MailAccountUnreadRow[]; activeMailAccountId: string | null }> {
  const accounts = await prisma.userMailAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const activeId =
    activeMailAccountId && accounts.some((account) => account.id === activeMailAccountId)
      ? activeMailAccountId
      : accounts.find((account) => account.isPrimary)?.id ?? accounts[0]?.id ?? null;

  const rows = await Promise.all(
    accounts.map(async (account) => {
      let unread = 0;
      const credentials = await getMailCredentialsForAccount(userId, account.id);
      if (credentials) {
        try {
          unread = await getInboxUnseenCount(credentials);
        } catch {
          unread = 0;
        }
      }

      return {
        id: account.id,
        email: account.email,
        label: account.label,
        unread,
        isActive: account.id === activeId,
        isPrimary: account.isPrimary,
      };
    }),
  );

  return { accounts: rows, activeMailAccountId: activeId };
}
