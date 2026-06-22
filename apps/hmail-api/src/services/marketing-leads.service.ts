import { prisma } from "../lib/prisma.js";

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

function serializeLead(lead: {
  id: string;
  fullName: string;
  email: string;
  company: string;
  teamSize: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  consentPrivacy: boolean;
  consentContact: boolean;
  tenantId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tenant?: { slug: string; name: string } | null;
}) {
  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    company: lead.company,
    teamSize: lead.teamSize,
    message: lead.message,
    status: lead.status,
    notes: lead.notes,
    consentPrivacy: lead.consentPrivacy,
    consentContact: lead.consentContact,
    tenantId: lead.tenantId,
    tenantSlug: lead.tenant?.slug ?? null,
    tenantName: lead.tenant?.name ?? null,
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export async function createMarketingLead(input: {
  fullName: string;
  email: string;
  company: string;
  teamSize?: string;
  message?: string;
  consentPrivacy?: boolean;
  consentContact?: boolean;
}) {
  if (!input.fullName.trim() || !input.email.trim() || !input.company.trim()) {
    throw new Error("Name, email, and company are required");
  }
  if (!input.consentPrivacy) {
    throw new Error("Privacy policy consent is required");
  }
  const lead = await prisma.marketingLead.create({
    data: {
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      company: input.company.trim(),
      teamSize: input.teamSize?.trim() || null,
      message: input.message?.trim() || null,
      consentPrivacy: true,
      consentContact: Boolean(input.consentContact),
    },
  });
  return serializeLead(lead);
}

export async function listMarketingLeads(options: {
  status?: LeadStatus;
  q?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { status, q, limit = 100, offset = 0 } = options;
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

  const leads = await prisma.marketingLead.findMany({
    where,
    include: { tenant: { select: { slug: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    skip: offset,
  });
  return leads.map(serializeLead);
}

export async function getMarketingLeadStats() {
  const [total, byStatus, newThisWeek, qualifiedUnconverted] = await Promise.all([
    prisma.marketingLead.count(),
    prisma.marketingLead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.marketingLead.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.marketingLead.count({
      where: { status: "qualified", tenantId: null },
    }),
  ]);

  const funnel = Object.fromEntries(
    LEAD_STATUSES.map((s) => [s, byStatus.find((row) => row.status === s)?._count._all ?? 0]),
  ) as Record<LeadStatus, number>;

  return {
    total,
    funnel,
    newThisWeek,
    qualifiedUnconverted,
    conversionRate: total > 0 ? Math.round(((funnel.converted ?? 0) / total) * 100) : 0,
  };
}

export async function getMarketingLead(id: string) {
  const lead = await prisma.marketingLead.findUnique({
    where: { id },
    include: { tenant: { select: { slug: true, name: true } } },
  });
  return lead ? serializeLead(lead) : null;
}

export async function updateMarketingLead(
  id: string,
  input: Partial<{ status: LeadStatus; notes: string | null }>,
) {
  if (input.status && !LEAD_STATUSES.includes(input.status)) {
    throw new Error("Invalid lead status");
  }
  const lead = await prisma.marketingLead.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
    },
    include: { tenant: { select: { slug: true, name: true } } },
  });
  return serializeLead(lead);
}

export async function markLeadConverted(email: string, tenantId: string): Promise<void> {
  const lead = await prisma.marketingLead.findFirst({
    where: { email: email.trim().toLowerCase(), tenantId: null },
    orderBy: { createdAt: "desc" },
  });
  if (!lead) return;
  await prisma.marketingLead.update({
    where: { id: lead.id },
    data: {
      status: "converted",
      tenantId,
      convertedAt: new Date(),
    },
  });
}
