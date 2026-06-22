import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { getFormDefinition, validateFormPayload } from "./form-definition.service.js";
import { provisionIsolatedMembershipDemo } from "./membership-demo.service.js";
import { sendTemplatedPlatformEmail, notifyInternalAddress } from "./platform-email.service.js";
import { createMarketingLead } from "./marketing-leads.service.js";
import { renderEmailTemplate } from "./email-template.service.js";
import { attributeReferralSignup } from "./referral-lead.service.js";

export type MembershipStatus = "new" | "demo_sent" | "provisioned" | "pushed_to_leads" | "closed";

export type AttributionInput = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  referralRef?: string;
};

function serialize(row: {
  id: string;
  fullName: string;
  workEmail: string;
  phone: string;
  teamType: string;
  deployIntent: string;
  hostingScale: string;
  emailService: string;
  status: string;
  notes: string | null;
  tenantId: string | null;
  hostingAccountId: string | null;
  marketingLeadId: string | null;
  demoUsername: string | null;
  demoDomain: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  consentPrivacy: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    fullName: row.fullName,
    workEmail: row.workEmail,
    phone: row.phone,
    teamType: row.teamType,
    deployIntent: row.deployIntent,
    hostingScale: row.hostingScale,
    emailService: row.emailService,
    status: row.status as MembershipStatus,
    notes: row.notes,
    tenantId: row.tenantId,
    hostingAccountId: row.hostingAccountId,
    marketingLeadId: row.marketingLeadId,
    demoUsername: row.demoUsername,
    demoDomain: row.demoDomain,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    referrer: row.referrer,
    consentPrivacy: row.consentPrivacy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function submitMembershipApplication(input: {
  payload: Record<string, unknown>;
  consentPrivacy: boolean;
  attribution?: AttributionInput;
}) {
  if (!input.consentPrivacy) {
    throw new Error("Privacy consent is required");
  }

  const form = await getFormDefinition("membership");
  if (!form?.isActive) throw new Error("Membership registration is unavailable");

  const values = validateFormPayload(form.fields, input.payload);

  const existing = await prisma.membershipApplication.findFirst({
    where: { workEmail: values.workEmail, status: { not: "closed" } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    throw new Error("An active application already exists for this email");
  }

  const demo = await provisionIsolatedMembershipDemo({
    fullName: values.fullName,
    workEmail: values.workEmail,
    hostingScale: values.hostingScale,
  });

  const application = await prisma.membershipApplication.create({
    data: {
      fullName: values.fullName,
      workEmail: values.workEmail,
      phone: values.phone,
      teamType: values.teamType,
      deployIntent: values.deployIntent,
      hostingScale: values.hostingScale,
      emailService: values.emailService,
      status: "demo_sent",
      tenantId: demo.tenantId,
      hostingAccountId: demo.hostingAccountId,
      demoUsername: demo.demoUsername,
      demoDomain: demo.demoDomain,
      utmSource: input.attribution?.utmSource ?? null,
      utmMedium: input.attribution?.utmMedium ?? null,
      utmCampaign: input.attribution?.utmCampaign ?? null,
      referrer: input.attribution?.referralRef ?? input.attribution?.referrer ?? null,
      consentPrivacy: true,
    },
  });

  if (input.attribution?.referralRef) {
    await attributeReferralSignup({
      userEmail: values.workEmail,
      tenantId: demo.tenantId,
      referrerEmail: input.attribution.referralRef,
      displayName: values.fullName,
    });
  }

  const env = getEnv();

  await sendTemplatedPlatformEmail({
    to: values.workEmail,
    templateSlug: "membership-welcome",
    variables: {
      fullName: values.fullName,
      workEmail: values.workEmail,
      demoUsername: demo.demoUsername,
      demoDomain: demo.demoDomain,
      demoPassword: demo.demoPassword,
      panelLoginUrl: demo.panelLoginUrl,
    },
  });

  const internalRendered = await renderEmailTemplate("admin-new-membership", {
    fullName: values.fullName,
    workEmail: values.workEmail,
    hostingScale: values.hostingScale,
    adminUrl: `${env.HOSTNET_WEB_URL}/admin`,
  });

  await notifyInternalAddress(
    process.env.MEMBERSHIP_NOTIFY_EMAIL?.trim() || "newclient@prohost.cloud",
    internalRendered.subject,
    internalRendered.html,
  );

  return serialize(application);
}

export async function listMembershipApplications(options?: { status?: string; q?: string }) {
  const where: {
    status?: string;
    OR?: Array<{ fullName?: { contains: string }; workEmail?: { contains: string } }>;
  } = {};
  if (options?.status) where.status = options.status;
  if (options?.q?.trim()) {
    const q = options.q.trim();
    where.OR = [{ fullName: { contains: q } }, { workEmail: { contains: q } }];
  }

  const rows = await prisma.membershipApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serialize);
}

export async function getMembershipApplication(id: string) {
  const row = await prisma.membershipApplication.findUnique({ where: { id } });
  return row ? serialize(row) : null;
}

export async function updateMembershipApplication(
  id: string,
  input: Partial<{
    status: MembershipStatus;
    notes: string | null;
    fullName: string;
    phone: string;
    teamType: string;
    deployIntent: string;
    hostingScale: string;
    emailService: string;
  }>,
) {
  const row = await prisma.membershipApplication.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.teamType !== undefined ? { teamType: input.teamType } : {}),
      ...(input.deployIntent !== undefined ? { deployIntent: input.deployIntent } : {}),
      ...(input.hostingScale !== undefined ? { hostingScale: input.hostingScale } : {}),
      ...(input.emailService !== undefined ? { emailService: input.emailService } : {}),
    },
  });
  return serialize(row);
}

export async function deleteMembershipApplication(id: string): Promise<void> {
  await prisma.membershipApplication.delete({ where: { id } });
}

export async function pushMembershipToLeads(id: string) {
  const app = await prisma.membershipApplication.findUnique({ where: { id } });
  if (!app) throw new Error("Membership application not found");

  const lead = await createMarketingLead({
    fullName: app.fullName,
    email: app.workEmail,
    company: app.fullName,
    teamSize: app.teamType,
    message: `[Membership] Scale: ${app.hostingScale} · Email: ${app.emailService}\n${app.deployIntent}`,
    consentPrivacy: app.consentPrivacy,
    consentContact: true,
  });

  const updated = await prisma.membershipApplication.update({
    where: { id },
    data: { marketingLeadId: lead.id, status: "pushed_to_leads" },
  });

  if (app.tenantId) {
    await prisma.marketingLead.update({
      where: { id: lead.id },
      data: { tenantId: app.tenantId, status: "qualified" },
    });
  }

  return { application: serialize(updated), leadId: lead.id };
}

export async function getMembershipStats() {
  const [total, newCount, demoSent, pushed] = await Promise.all([
    prisma.membershipApplication.count(),
    prisma.membershipApplication.count({ where: { status: "new" } }),
    prisma.membershipApplication.count({ where: { status: "demo_sent" } }),
    prisma.membershipApplication.count({ where: { status: "pushed_to_leads" } }),
  ]);
  return { total, newCount, demoSent, pushed };
}
