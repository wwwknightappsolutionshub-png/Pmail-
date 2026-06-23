import { prisma } from "../lib/prisma.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";
import { listMessages } from "./imap.service.js";
import { sendMail } from "./smtp.service.js";
import { logComplianceEvent } from "./compliance.service.js";

export async function dispatchScheduledOutreachCampaigns(): Promise<number> {
  const due = await prisma.rcOutreachCampaign.findMany({
    where: {
      status: "scheduled",
      channel: "email",
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    },
    include: {
      user: true,
      role: true,
    },
    take: 10,
  });

  let sentTotal = 0;

  for (const campaign of due) {
    try {
      const count = await sendOutreachCampaign(campaign.id, campaign.tenantId, campaign.userId, campaign.user.email);
      sentTotal += count;
    } catch (err) {
      console.error("[recruitment-outreach]", campaign.id, err);
    }
  }

  return sentTotal;
}

export async function sendOutreachCampaign(
  campaignId: string,
  tenantId: string,
  userId: string,
  userEmail: string,
): Promise<number> {
  const campaign = await prisma.rcOutreachCampaign.findFirst({
    where: { id: campaignId, tenantId },
    include: { role: true },
  });
  if (!campaign) throw new Error("Outreach campaign not found");
  if (campaign.channel !== "email") throw new Error("Only email campaigns can be dispatched");

  const creds = await getLatestMailCredentials(userId);
  if (!creds) throw new Error("Mail credentials required to send outreach");

  const subject = campaign.subject?.trim() || `Opportunity: ${campaign.role?.title ?? campaign.name}`;
  const bodyHtml =
    campaign.bodyHtml?.trim() ||
    `<p>Hello,</p><p>We are reaching out regarding <strong>${campaign.role?.title ?? campaign.name}</strong>.</p><p>Reply if you are interested in learning more.</p>`;

  const contacts = campaign.roleId
    ? await prisma.rcContact.findMany({
        where: {
          tenantId,
          email: { not: null },
          submissions: { some: { roleId: campaign.roleId } },
        },
        take: 50,
      })
    : await prisma.rcContact.findMany({
        where: {
          tenantId,
          email: { not: null },
          candidateStage: { in: ["sourced", "screening", "interviewing"] },
        },
        take: 50,
      });

  let sent = 0;
  for (const contact of contacts) {
    const email = contact.email?.trim();
    if (!email) continue;

    await sendMail({
      email: creds.email,
      password: creds.password,
      mailConfig: creds.mailConfig,
      to: email,
      subject,
      text: bodyHtml.replace(/<[^>]+>/g, " "),
      html: bodyHtml,
    });
    sent += 1;
  }

  await prisma.rcOutreachCampaign.update({
    where: { id: campaignId },
    data: {
      status: "sent",
      sentCount: campaign.sentCount + sent,
      launchedAt: new Date(),
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_outreach_campaign.dispatched",
    entityType: "rc_outreach_campaign",
    entityId: campaignId,
    metadata: { sent },
  });

  return sent;
}

export async function searchRcTalentViaMail(
  tenantId: string,
  userId: string,
  query: string,
): Promise<Array<{ uid: number; subject: string; from: string; date: string; snippet: string }>> {
  const creds = await getLatestMailCredentials(userId);
  if (!creds) throw new Error("Mail credentials required for talent search");

  const contacts = await prisma.rcContact.findMany({
    where: { tenantId },
    select: { email: true },
  });
  const knownEmails = new Set(
    contacts.map((c) => c.email?.toLowerCase()).filter((e): e is string => Boolean(e)),
  );

  const searchQuery = query.trim() || "resume OR candidate OR application";
  const result = await listMessages(creds, "INBOX", {
    searchQuery,
    page: 1,
    pageSize: 25,
  });

  return result.messages
    .filter((msg) => {
      const fromLower = msg.from.toLowerCase();
      return [...knownEmails].some((email) => fromLower.includes(email));
    })
    .map((msg) => ({
      uid: msg.uid,
      subject: msg.subject,
      from: msg.from,
      date: msg.date,
      snippet: msg.snippet ?? "",
    }));
}
