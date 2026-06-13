import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { HostingAccount, HostingPlan, Tenant } from "@prisma/client";
import { hashPassword, hashToken, verifyPassword } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

const PANEL_SESSION_TTL_HOURS = 12;

export type HostingAccountWithRelations = HostingAccount & {
  tenant: Tenant;
  plan: HostingPlan | null;
};

export class PanelAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PanelAuthError";
  }
}

export function sanitizeHostingAccount(account: HostingAccountWithRelations) {
  return {
    id: account.id,
    username: account.username,
    domain: account.domain,
    homePath: account.homePath,
    diskQuotaMb: account.diskQuotaMb,
    diskUsedMb: account.diskUsedMb,
    bandwidthMb: account.bandwidthMb,
    bandwidthUsedMb: account.bandwidthUsedMb,
    emailAccounts: account.emailAccounts,
    databases: account.databases,
    isSuspended: account.isSuspended,
    tenant: {
      id: account.tenant.id,
      slug: account.tenant.slug,
      name: account.tenant.name,
    },
    plan: account.plan
      ? {
          id: account.plan.id,
          slug: account.plan.slug,
          name: account.plan.name,
        }
      : null,
  };
}

export async function loginPanelUser(input: {
  username: string;
  domain: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; account: HostingAccountWithRelations }> {
  const username = input.username.trim().toLowerCase();
  const domain = input.domain.trim().toLowerCase();

  const account = await prisma.hostingAccount.findFirst({
    where: { username, domain },
    include: { tenant: true, plan: true },
  });

  if (!account || account.isSuspended || !account.tenant.isActive) {
    throw new PanelAuthError("Invalid username, domain, or password");
  }

  if (!verifyPassword(input.password, account.passwordHash)) {
    throw new PanelAuthError("Invalid username, domain, or password");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + PANEL_SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.panelSession.create({
    data: {
      hostingAccountId: account.id,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  return { token, account };
}

export async function logoutPanelSession(token: string): Promise<void> {
  await prisma.panelSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function getPanelContext(req: Request): Promise<HostingAccountWithRelations | null> {
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const token = bearer || (req.cookies?.hostnet_panel_session as string | undefined);
  if (!token) return null;

  const session = await prisma.panelSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      hostingAccount: {
        include: { tenant: true, plan: true },
      },
    },
  });

  if (!session?.hostingAccount || session.hostingAccount.isSuspended) return null;
  if (!session.hostingAccount.tenant.isActive) return null;
  return session.hostingAccount;
}

export async function getPanelDashboard(account: HostingAccountWithRelations) {
  const diskPercent = account.diskQuotaMb > 0 ? Math.round((account.diskUsedMb / account.diskQuotaMb) * 100) : 0;
  const bandwidthPercent =
    account.bandwidthMb > 0 ? Math.round((account.bandwidthUsedMb / account.bandwidthMb) * 100) : 0;

  return {
    account: sanitizeHostingAccount(account),
    stats: {
      diskPercent,
      bandwidthPercent,
      domains: 1,
      subdomains: 0,
      emailBoxes: account.emailAccounts,
      databases: account.databases,
      sslActive: true,
    },
    quickLinks: [
      { label: "File Manager", path: "/panel/files", icon: "folder" },
      { label: "Email Accounts", path: "/panel/email", icon: "mail" },
      { label: "Databases", path: "/panel/databases", icon: "database" },
      { label: "Domains", path: "/panel/domains", icon: "globe" },
    ],
  };
}
