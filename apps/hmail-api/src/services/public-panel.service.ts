import { prisma } from "../lib/prisma.js";

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
  uptime: "99.9%",
};

export async function getPublicPanelPreview(): Promise<PublicPanelPreview> {
  const account = await prisma.hostingAccount.findFirst({
    where: { username: "demo", domain: "hostnet.local", isSuspended: false },
    include: { plan: { select: { name: true } }, tenant: { select: { isActive: true } } },
  });

  if (!account || !account.tenant.isActive) {
    return FALLBACK;
  }

  const diskPercent =
    account.diskQuotaMb > 0 ? Math.round((account.diskUsedMb / account.diskQuotaMb) * 100) : 0;
  const bandwidthPercent =
    account.bandwidthMb > 0 ? Math.round((account.bandwidthUsedMb / account.bandwidthMb) * 100) : 0;

  return {
    accountLabel: `${account.username}@${account.domain}`,
    planName: account.plan?.name ?? null,
    diskPercent,
    bandwidthPercent,
    diskUsedMb: account.diskUsedMb,
    diskQuotaMb: account.diskQuotaMb,
    bandwidthUsedMb: account.bandwidthUsedMb,
    bandwidthMb: account.bandwidthMb,
    domains: 1,
    emailBoxes: account.emailAccounts,
    databases: account.databases,
    sslActive: true,
    uptime: "99.9%",
  };
}
