import { prisma } from "../lib/prisma.js";
import { ensurePanelDefaults } from "./panel-resources.service.js";

export type PublicPanelPreview = {
  accountLabel: string;
  planName: string | null;
  diskPercent: number;
  bandwidthPercent: number;
  diskUsedMb: number;
  diskQuotaMb: number;
  bandwidthUsedMb: number;
  bandwidthMb: number;
  domains: number;
  emailBoxes: number;
  databases: number;
  sslActive: boolean;
  backupsEnabled: boolean;
  uptime: string;
};

const FALLBACK: PublicPanelPreview = {
  accountLabel: "demo@hostnet.local",
  planName: "Business",
  diskPercent: 24,
  bandwidthPercent: 16,
  diskUsedMb: 1240,
  diskQuotaMb: 5120,
  bandwidthUsedMb: 8200,
  bandwidthMb: 51200,
  domains: 3,
  emailBoxes: 12,
  databases: 2,
  sslActive: true,
  backupsEnabled: true,
  uptime: "99.9%",
};

export async function getPublicPanelPreview(): Promise<PublicPanelPreview> {
  const accounts = await prisma.hostingAccount.findMany({
    where: { isSuspended: false, tenant: { isActive: true } },
    include: { plan: { select: { name: true } }, tenant: { select: { isActive: true } } },
    orderBy: [{ isSampleDemo: "desc" }, { updatedAt: "desc" }],
  });

  if (accounts.length === 0) {
    return FALLBACK;
  }

  await Promise.all(accounts.map((account) => ensurePanelDefaults(account)));

  const accountIds = accounts.map((account) => account.id);
  const [domainCount, mailboxCount, databaseCount, backupsCount, sslDomainCount] = await Promise.all([
    prisma.panelAddonDomain.count({ where: { accountId: { in: accountIds } } }),
    prisma.panelMailbox.count({ where: { accountId: { in: accountIds } } }),
    prisma.panelDatabase.count({ where: { accountId: { in: accountIds } } }),
    prisma.panelFileEntry.count({
      where: { accountId: { in: accountIds }, parentPath: "/", name: "backups", type: "dir" },
    }),
    prisma.panelAddonDomain.count({ where: { accountId: { in: accountIds }, ssl: true } }),
  ]);

  const diskUsedMb = accounts.reduce((sum, account) => sum + account.diskUsedMb, 0);
  const diskQuotaMb = accounts.reduce((sum, account) => sum + account.diskQuotaMb, 0);
  const bandwidthUsedMb = accounts.reduce((sum, account) => sum + account.bandwidthUsedMb, 0);
  const bandwidthMb = accounts.reduce((sum, account) => sum + account.bandwidthMb, 0);

  const diskPercent = diskQuotaMb > 0 ? Math.round((diskUsedMb / diskQuotaMb) * 100) : 0;
  const bandwidthPercent = bandwidthMb > 0 ? Math.round((bandwidthUsedMb / bandwidthMb) * 100) : 0;

  const primary = accounts.find((account) => account.isSampleDemo) ?? accounts[0];
  const accountLabel =
    accounts.length > 1
      ? `${accounts.length} active hosting accounts`
      : `${primary.username}@${primary.domain}`;

  return {
    accountLabel,
    planName: primary.plan?.name ?? null,
    diskPercent,
    bandwidthPercent,
    diskUsedMb,
    diskQuotaMb,
    bandwidthUsedMb,
    bandwidthMb,
    domains: domainCount,
    emailBoxes: mailboxCount,
    databases: databaseCount,
    sslActive: sslDomainCount > 0,
    backupsEnabled: backupsCount > 0,
    uptime: "99.9%",
  };
}
