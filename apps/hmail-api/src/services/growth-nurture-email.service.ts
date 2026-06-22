import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";
import { sendPlatformEmail } from "./platform-email.service.js";

type NurtureEmail = {
  step: number;
  subject: string;
  preheader?: string;
  body: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function getNurtureEmailSequence(workspaceId: string): Promise<NurtureEmail[]> {
  const asset = await prisma.growthContentAsset.findFirst({
    where: { workspaceId, assetType: "email_sequence" },
    orderBy: { sortOrder: "asc" },
  });
  if (!asset) return [];

  const body = JSON.parse(asset.bodyJson) as { emails?: NurtureEmail[] };
  return body.emails ?? [];
}

export async function sendNurtureEmailToLead(input: {
  tenantId: string;
  workspaceId: string;
  lead: { id: string; email: string; fullName: string };
  emailStep?: number;
}): Promise<{ sent: boolean; subject?: string; reason?: string }> {
  const step = Math.max(1, input.emailStep ?? 1);
  const emails = await getNurtureEmailSequence(input.workspaceId);
  const email = emails.find((row) => row.step === step) ?? emails[step - 1];
  if (!email) {
    return { sent: false, reason: "Nurture email sequence not found in Content Studio" };
  }

  if (!input.lead.email?.includes("@")) {
    return { sent: false, reason: "Lead has no valid email address" };
  }

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);
  const greeting = input.lead.fullName?.trim() ? `Hi ${input.lead.fullName.split(" ")[0]},` : "Hi there,";
  const bodyText = email.body.replace(/^Hi there,?/i, greeting);

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;max-width:560px">
<p>${escapeHtml(bodyText).replace(/\n/g, "<br>")}</p>
<p style="color:#666;font-size:0.9rem">— ${escapeHtml(business)}</p>
</div>`;

  await sendPlatformEmail({
    to: input.lead.email,
    subject: email.subject,
    html,
    text: bodyText,
    templateSlug: "growth_nurture",
  });

  return { sent: true, subject: email.subject };
}
