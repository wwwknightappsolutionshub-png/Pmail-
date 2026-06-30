import { prisma } from "../lib/prisma.js";
import {
  ensureProspectDemoProvisioned,
  isProspectDemoUserActive,
  PMAIL_PROSPECT_DEMO_TRIAL_HOURS,
} from "./pmail-prospect-demo.service.js";

export const PMAIL_PROSPECT_STATUSES = ["interested", "contacted", "invited", "converted", "closed"] as const;
export type PmailProspectStatus = (typeof PMAIL_PROSPECT_STATUSES)[number];

type ProspectRow = {
  id: string;
  tenantSlug: string | null;
  fullName: string;
  email: string;
  company: string | null;
  referrerEmail: string | null;
  status: string;
  notes: string | null;
  convertedAt: Date | null;
  tenantId: string | null;
  userId: string | null;
  demoTenantSlug: string | null;
  demoProvisionedAt: Date | null;
  demoExpiresAt: Date | null;
  demoWelcomeEmailSent: boolean;
  demoUpsellEmailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function serializeProspect(row: ProspectRow) {
  const demoActive = isProspectDemoUserActive(row.demoExpiresAt);
  return {
    id: row.id,
    tenantSlug: row.tenantSlug,
    fullName: row.fullName,
    email: row.email,
    company: row.company,
    referrerEmail: row.referrerEmail,
    status: row.status,
    notes: row.notes,
    convertedAt: row.convertedAt?.toISOString() ?? null,
    tenantId: row.tenantId,
    userId: row.userId,
    demoTenantSlug: row.demoTenantSlug,
    demoProvisionedAt: row.demoProvisionedAt?.toISOString() ?? null,
    demoExpiresAt: row.demoExpiresAt?.toISOString() ?? null,
    demoWelcomeEmailSent: row.demoWelcomeEmailSent,
    demoUpsellEmailSent: row.demoUpsellEmailSent,
    demoActive,
    demoLoginUrl: row.demoTenantSlug ? `/login/${row.demoTenantSlug}` : null,
    demoTrialHours: PMAIL_PROSPECT_DEMO_TRIAL_HOURS,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function provisionProspectDemoIfNeeded(row: ProspectRow) {
  if (row.demoProvisionedAt && isProspectDemoUserActive(row.demoExpiresAt)) {
    return row;
  }

  try {
    await ensureProspectDemoProvisioned(row.id);
  } catch (err) {
    console.error("[pmail-prospect] demo provisioning failed", err);
    throw new Error(
      "We saved your request but could not provision your demo workspace right now. Please try again in a minute or contact support.",
    );
  }

  const refreshed = await prisma.pmailProspect.findUniqueOrThrow({ where: { id: row.id } });
  return refreshed;
}

export async function registerPmailProspect(input: {
  tenantSlug?: string;
  fullName: string;
  email: string;
  company?: string;
  referrerEmail?: string;
  consentPrivacy: boolean;
}) {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const company = input.company?.trim() || null;
  const referrerEmail = input.referrerEmail?.trim().toLowerCase() || null;

  if (!fullName) throw new Error("Full name is required");
  if (!email.includes("@")) throw new Error("A valid work email is required");
  if (!input.consentPrivacy) throw new Error("Privacy policy consent is required");

  const existing = await prisma.pmailProspect.findFirst({
    where: { email, status: { in: ["interested", "contacted", "invited"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const provisioned = await provisionProspectDemoIfNeeded(existing);
    return serializeProspect(provisioned);
  }

  const row = await prisma.pmailProspect.create({
    data: {
      tenantSlug: input.tenantSlug?.trim().toLowerCase() || null,
      fullName,
      email,
      company,
      referrerEmail: referrerEmail?.includes("@") ? referrerEmail : null,
      status: "interested",
    },
  });

  const provisioned = await provisionProspectDemoIfNeeded(row);
  return serializeProspect(provisioned);
}

export async function listPmailProspects(options: {
  status?: PmailProspectStatus;
  q?: string;
  limit?: number;
} = {}) {
  const { status, q, limit = 100 } = options;
  const where: {
    status?: string;
    OR?: Array<{ fullName?: { contains: string }; email?: { contains: string }; company?: { contains: string } }>;
  } = {};

  if (status) where.status = status;
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { fullName: { contains: term } },
      { email: { contains: term } },
      { company: { contains: term } },
    ];
  }

  const rows = await prisma.pmailProspect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });

  return rows.map(serializeProspect);
}

export async function getPmailProspectStats() {
  const [total, byStatus, newThisWeek, unconverted] = await Promise.all([
    prisma.pmailProspect.count(),
    prisma.pmailProspect.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.pmailProspect.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.pmailProspect.count({
      where: { status: { in: ["interested", "contacted", "invited"] } },
    }),
  ]);

  const funnel = Object.fromEntries(
    PMAIL_PROSPECT_STATUSES.map((entry) => [
      entry,
      byStatus.find((row) => row.status === entry)?._count._all ?? 0,
    ]),
  ) as Record<PmailProspectStatus, number>;

  return { total, funnel, newThisWeek, unconverted };
}

export async function updatePmailProspect(
  id: string,
  input: Partial<{ status: PmailProspectStatus; notes: string | null }>,
) {
  if (input.status && !PMAIL_PROSPECT_STATUSES.includes(input.status)) {
    throw new Error("Invalid prospect status");
  }

  const row = await prisma.pmailProspect.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.status === "converted" ? { convertedAt: new Date() } : {}),
    },
  });

  return serializeProspect(row);
}
