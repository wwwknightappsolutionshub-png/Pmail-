import { prisma } from "../lib/prisma.js";
import { getFormDefinition, validateFormPayload } from "./form-definition.service.js";
import { sendTemplatedPlatformEmail, notifyInternalAddress } from "./platform-email.service.js";
import { createMarketingLead } from "./marketing-leads.service.js";
import type { AttributionInput } from "./membership.service.js";

export type InquiryStatus = "new" | "in_progress" | "resolved" | "pushed_to_leads";

function serialize(row: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  membershipInterest: string;
  inquiringAbout: string;
  status: string;
  notes: string | null;
  marketingLeadId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    membershipInterest: row.membershipInterest,
    inquiringAbout: row.inquiringAbout,
    status: row.status as InquiryStatus,
    notes: row.notes,
    marketingLeadId: row.marketingLeadId,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    referrer: row.referrer,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function submitInquiry(input: {
  payload: Record<string, unknown>;
  attribution?: AttributionInput;
}) {
  const form = await getFormDefinition("inquiry");
  if (!form?.isActive) throw new Error("Inquiry form is unavailable");

  const values = validateFormPayload(form.fields, input.payload);

  const inquiry = await prisma.inquirySubmission.create({
    data: {
      name: values.name,
      email: values.email,
      phone: values.phone ?? null,
      membershipInterest: values.membershipInterest,
      inquiringAbout: values.inquiringAbout,
      status: "new",
      utmSource: input.attribution?.utmSource ?? null,
      utmMedium: input.attribution?.utmMedium ?? null,
      utmCampaign: input.attribution?.utmCampaign ?? null,
      referrer: input.attribution?.referrer ?? null,
    },
  });

  const ticketRef = inquiry.id.slice(0, 8).toUpperCase();

  await sendTemplatedPlatformEmail({
    to: values.email,
    templateSlug: "inquiry-auto-reply",
    variables: { name: values.name, ticketRef },
    replyTo: process.env.INQUIRY_REPLY_EMAIL?.trim() || "help@prohost.cloud",
  });

  const internalHtml = `<h2>New inquiry</h2>
<p><strong>${values.name}</strong> &lt;${values.email}&gt;</p>
<p>Phone: ${values.phone ?? "—"}</p>
<p>Membership interest: ${values.membershipInterest}</p>
<p>${values.inquiringAbout}</p>
<p>Ref: ${ticketRef}</p>`;

  await notifyInternalAddress(
    process.env.INQUIRY_NOTIFY_EMAIL?.trim() || "help@prohost.cloud",
    `Inquiry from ${values.name} (${ticketRef})`,
    internalHtml,
  );

  return serialize(inquiry);
}

export async function listInquiries(options?: { status?: string; q?: string }) {
  const where: {
    status?: string;
    OR?: Array<{ name?: { contains: string }; email?: { contains: string } }>;
  } = {};
  if (options?.status) where.status = options.status;
  if (options?.q?.trim()) {
    const q = options.q.trim();
    where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
  }

  const rows = await prisma.inquirySubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serialize);
}

export async function getInquiry(id: string) {
  const row = await prisma.inquirySubmission.findUnique({ where: { id } });
  return row ? serialize(row) : null;
}

export async function updateInquiry(
  id: string,
  input: Partial<{
    status: InquiryStatus;
    notes: string | null;
    name: string;
    email: string;
    phone: string | null;
    membershipInterest: string;
    inquiringAbout: string;
  }>,
) {
  const row = await prisma.inquirySubmission.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.membershipInterest !== undefined ? { membershipInterest: input.membershipInterest } : {}),
      ...(input.inquiringAbout !== undefined ? { inquiringAbout: input.inquiringAbout } : {}),
    },
  });
  return serialize(row);
}

export async function deleteInquiry(id: string): Promise<void> {
  await prisma.inquirySubmission.delete({ where: { id } });
}

export async function pushInquiryToLeads(id: string) {
  const inquiry = await prisma.inquirySubmission.findUnique({ where: { id } });
  if (!inquiry) throw new Error("Inquiry not found");

  const lead = await createMarketingLead({
    fullName: inquiry.name,
    email: inquiry.email,
    company: inquiry.name,
    message: `[Inquiry] Membership: ${inquiry.membershipInterest}\n${inquiry.inquiringAbout}`,
    consentPrivacy: true,
    consentContact: true,
  });

  const updated = await prisma.inquirySubmission.update({
    where: { id },
    data: { marketingLeadId: lead.id, status: "pushed_to_leads" },
  });

  return { inquiry: serialize(updated), leadId: lead.id };
}

export async function getInquiryStats() {
  const [total, open] = await Promise.all([
    prisma.inquirySubmission.count(),
    prisma.inquirySubmission.count({ where: { status: { in: ["new", "in_progress"] } } }),
  ]);
  return { total, open };
}
