import { prisma } from "../lib/prisma.js";
import { listMessages } from "./imap.service.js";
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

  const rows: MailAccountUnreadRow[] = [];

  for (const account of accounts) {
    let unread = 0;
    const credentials = await getMailCredentialsForAccount(userId, account.id);
    if (credentials) {
      try {
        const inbox = await listMessages(credentials, "INBOX", {
          filter: "unread",
          page: 1,
          pageSize: 1,
        });
        unread = inbox.total;
      } catch {
        unread = 0;
      }
    }

    rows.push({
      id: account.id,
      email: account.email,
      label: account.label,
      unread,
      isActive: account.id === activeId,
      isPrimary: account.isPrimary,
    });
  }

  return { accounts: rows, activeMailAccountId: activeId };
}
