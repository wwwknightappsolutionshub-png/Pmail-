import { TRIAL_DAYS } from "../data/addon-catalog.js";
import { prisma } from "../lib/prisma.js";
import { listAddonsForTenant } from "./addon.service.js";
import { getTenantGrowthOps } from "./growth-admin-ops.service.js";
import { getPresenceMapForUserIds, type UserPresenceSnapshot } from "./user-presence.service.js";

export class TenantOpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantOpsError";
  }
}

export type BrandingInput = {
  productName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  loginTagline?: string;
};

export type MailConfigInput = {
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
};

function serializeMailUser(
  user: {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
},
  presence: UserPresenceSnapshot,
) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    presence,
  };
}

const EMPTY_PRESENCE: UserPresenceSnapshot = { isOnline: false, activeSessionCount: 0, lastActiveAt: null };

export async function getTenantOperations(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branding: true,
      mail: true,
      users: { orderBy: { email: "asc" } },
      hostingAccounts: {
        select: {
          id: true,
          username: true,
          domain: true,
          isSuspended: true,
          plan: { select: { name: true, slug: true } },
        },
      },
      vpsInstances: {
        select: {
          id: true,
          label: true,
          hostname: true,
          status: true,
          ipAddress: true,
        },
      },
      _count: {
        select: {
          users: true,
          hostingAccounts: true,
          addonTrials: true,
          addonSubscriptions: true,
          vpsInstances: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const addons = await listAddonsForTenant(tenantId);
  const trials = await prisma.tenantAddonTrial.findMany({
    where: { tenantId },
    include: { addon: { select: { slug: true, name: true } } },
    orderBy: { startedAt: "desc" },
  });
  const subscriptions = await prisma.tenantAddonSubscription.findMany({
    where: { tenantId },
    include: { addon: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const growth = await getTenantGrowthOps(tenantId);
  const presenceMap = await getPresenceMapForUserIds(tenant.users.map((user) => user.id));

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      isActive: tenant.isActive,
      addonEducationSuppressed: tenant.addonEducationSuppressed,
      createdAt: tenant.createdAt.toISOString(),
      counts: tenant._count,
    },
    branding: tenant.branding,
    mail: tenant.mail,
    users: tenant.users.map((user) =>
      serializeMailUser(
        user,
        presenceMap.get(user.id) ?? EMPTY_PRESENCE,
      ),
    ),
    hostingAccounts: tenant.hostingAccounts.map((a) => ({
      id: a.id,
      loginId: `${a.username}@${a.domain}`,
      isSuspended: a.isSuspended,
      plan: a.plan,
    })),
    vpsInstances: tenant.vpsInstances,
    addons,
    trials: trials.map((t) => ({
      id: t.id,
      addonId: t.addonId,
      addonSlug: t.addon.slug,
      addonName: t.addon.name,
      status: t.status,
      startedAt: t.startedAt.toISOString(),
      endsAt: t.endsAt.toISOString(),
    })),
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      addonId: s.addonId,
      addonSlug: s.addon.slug,
      addonName: s.addon.name,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    })),
    growth,
  };
}

export async function updateTenantBranding(tenantId: string, input: BrandingInput) {
  const branding = await prisma.tenantBranding.upsert({
    where: { tenantId },
    create: {
      tenantId,
      productName: input.productName ?? "PMail+",
      logoUrl: input.logoUrl ?? null,
      primaryColor: input.primaryColor ?? "#0d9488",
      accentColor: input.accentColor ?? "#14b8a6",
      backgroundColor: input.backgroundColor ?? "#0f172a",
      loginTagline: input.loginTagline ?? "Mail built for Canadian immigration professionals",
    },
    update: {
      ...(input.productName !== undefined ? { productName: input.productName } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
      ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
      ...(input.backgroundColor !== undefined ? { backgroundColor: input.backgroundColor } : {}),
      ...(input.loginTagline !== undefined ? { loginTagline: input.loginTagline } : {}),
    },
  });
  return branding;
}

export async function updateTenantMailConfig(tenantId: string, input: MailConfigInput) {
  const mail = await prisma.tenantMailConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      imapHost: input.imapHost ?? "imap.hostinger.com",
      imapPort: input.imapPort ?? 993,
      imapSecure: input.imapSecure ?? true,
      smtpHost: input.smtpHost ?? "smtp.hostinger.com",
      smtpPort: input.smtpPort ?? 465,
      smtpSecure: input.smtpSecure ?? true,
    },
    update: {
      ...(input.imapHost !== undefined ? { imapHost: input.imapHost } : {}),
      ...(input.imapPort !== undefined ? { imapPort: input.imapPort } : {}),
      ...(input.imapSecure !== undefined ? { imapSecure: input.imapSecure } : {}),
      ...(input.smtpHost !== undefined ? { smtpHost: input.smtpHost } : {}),
      ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
      ...(input.smtpSecure !== undefined ? { smtpSecure: input.smtpSecure } : {}),
    },
  });
  return mail;
}

export async function listTenantMailUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { email: "asc" },
  });
  const presenceMap = await getPresenceMapForUserIds(users.map((user) => user.id));
  return users.map((user) => serializeMailUser(user, presenceMap.get(user.id) ?? EMPTY_PRESENCE));
}

export async function createTenantMailUser(
  tenantId: string,
  input: { email: string; displayName?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      displayName: input.displayName?.trim() || null,
    },
  });
  const presenceMap = await getPresenceMapForUserIds([user.id]);
  return serializeMailUser(user, presenceMap.get(user.id) ?? EMPTY_PRESENCE);
}

export async function updateTenantMailUser(
  tenantId: string,
  userId: string,
  input: Partial<{ displayName: string | null; isActive: boolean }>,
) {
  const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!existing) throw new TenantOpsError("Mail user not found");

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  const presenceMap = await getPresenceMapForUserIds([user.id]);
  return serializeMailUser(user, presenceMap.get(user.id) ?? EMPTY_PRESENCE);
}

export async function deleteTenantMailUser(tenantId: string, userId: string): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!existing) throw new TenantOpsError("Mail user not found");
  await prisma.user.delete({ where: { id: userId } });
}

export async function grantTenantAddonTrial(
  tenantId: string,
  input: { addonSlug: string; trialDays?: number },
) {
  const addon = await prisma.addon.findFirst({ where: { slug: input.addonSlug, isActive: true } });
  if (!addon) throw new TenantOpsError("Add-on not found");

  const existingTrial = await prisma.tenantAddonTrial.findUnique({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
  });
  if (existingTrial) throw new TenantOpsError("Trial already exists for this add-on");

  const days = input.trialDays ?? TRIAL_DAYS;
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + days);

  const trial = await prisma.tenantAddonTrial.create({
    data: { tenantId, addonId: addon.id, endsAt, status: "active" },
    include: { addon: { select: { slug: true, name: true } } },
  });

  return {
    id: trial.id,
    addonSlug: trial.addon.slug,
    addonName: trial.addon.name,
    status: trial.status,
    startedAt: trial.startedAt.toISOString(),
    endsAt: trial.endsAt.toISOString(),
  };
}

export async function revokeTenantAddonTrial(tenantId: string, trialId: string): Promise<void> {
  const trial = await prisma.tenantAddonTrial.findFirst({ where: { id: trialId, tenantId } });
  if (!trial) throw new TenantOpsError("Trial not found");
  await prisma.tenantAddonTrial.delete({ where: { id: trialId } });
}
