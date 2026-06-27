import { PLATFORM_SPECIFIC_PAID_ADDON_SLUGS } from "../data/addon-catalog.js";
import { prisma } from "../lib/prisma.js";
import type { MailCredentials } from "./imap.service.js";
import { sendMail } from "./smtp.service.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";
import {
  buildTrackingPixelUrl,
  createSentTracking,
  injectTrackingPixel,
  wrapTrackedLinksInHtml,
} from "./tracking.service.js";
import { buildReferralCompose, PMail_REFERRAL_SUBJECT } from "./referral.service.js";
import { dedupeReferralRecipients, referralRecipientDedupeKey } from "./referral-recipient-filter.js";

export type ReferralEmailStatus = "pending" | "delivered" | "read" | "bounced";

export const REFERRAL_REWARD_TOAST =
  "Congratulations you can now enjoy the Platform tools free of charge for 7 days";

const PLATFORM_TRIAL_ANCHOR_SLUG = "full-calendar-functionality";
const REFERRAL_REWARD_DAYS = 7;

function parseRecipientEmails(value: string): string[] {
  return dedupeReferralRecipients(
    value
      .split(/[,;]/)
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.includes("@")),
  );
}

function isActiveSubscription(
  sub: { status: string; currentPeriodEnd: Date | null } | null | undefined,
): boolean {
  if (!sub || sub.status !== "active") return false;
  return !sub.currentPeriodEnd || sub.currentPeriodEnd.getTime() > Date.now();
}

export async function tenantHasPlatformSubscription(tenantId: string, userId?: string): Promise<boolean> {
  const addons = await prisma.addon.findMany({
    where: { slug: { in: [...PLATFORM_SPECIFIC_PAID_ADDON_SLUGS] }, isActive: true },
    select: { id: true },
  });
  const addonIds = addons.map((entry) => entry.id);
  if (addonIds.length === 0) return false;

  const [tenantSubs, userSubs] = await Promise.all([
    prisma.tenantAddonSubscription.findMany({ where: { tenantId, addonId: { in: addonIds } } }),
    userId
      ? prisma.userAddonSubscription.findMany({ where: { tenantId, userId, addonId: { in: addonIds } } })
      : Promise.resolve([]),
  ]);

  return tenantSubs.some(isActiveSubscription) || userSubs.some(isActiveSubscription);
}

export async function grantReferralPlatformReward(tenantId: string): Promise<{
  granted: boolean;
  reason: string;
  endsAt?: string;
}> {
  if (await tenantHasPlatformSubscription(tenantId)) {
    return { granted: false, reason: "already_subscribed" };
  }

  const anchor = await prisma.addon.findFirst({
    where: { slug: PLATFORM_TRIAL_ANCHOR_SLUG, isActive: true },
  });
  if (!anchor) return { granted: false, reason: "addon_missing" };

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + REFERRAL_REWARD_DAYS);

  const existing = await prisma.tenantAddonTrial.findUnique({
    where: { tenantId_addonId: { tenantId, addonId: anchor.id } },
  });

  if (existing?.status === "active" && existing.endsAt.getTime() > Date.now()) {
    return { granted: false, reason: "trial_active", endsAt: existing.endsAt.toISOString() };
  }

  if (existing) {
    await prisma.tenantAddonTrial.update({
      where: { id: existing.id },
      data: {
        status: "active",
        startedAt: new Date(),
        endsAt,
        trialSource: "referral_reward",
        welcomeEmailSent: false,
        day3EmailSent: false,
        discountEmailSent: false,
        expiredEmailSent: false,
      },
    });
    return { granted: true, reason: "referral_reward_reactivated", endsAt: endsAt.toISOString() };
  }

  await prisma.tenantAddonTrial.create({
    data: {
      tenantId,
      addonId: anchor.id,
      endsAt,
      status: "active",
      trialSource: "referral_reward",
    },
  });

  return { granted: true, reason: "referral_reward_granted", endsAt: endsAt.toISOString() };
}

export async function sendReferralInvitations(input: {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  credentials: MailCredentials;
  subject: string;
  text?: string;
  html?: string;
  bcc: string;
  apiPublicBase: string;
}): Promise<{
  sentCount: number;
  bouncedCount: number;
  leads: Array<{ id: string; recipientEmail: string; emailStatus: ReferralEmailStatus }>;
  reward: Awaited<ReturnType<typeof grantReferralPlatformReward>>;
}> {
  const recipients = parseRecipientEmails(input.bcc);
  if (recipients.length === 0) {
    throw new Error("Add at least one Bcc recipient before sending.");
  }

  const priorLeads = await prisma.pmailReferralLead.findMany({
    where: { referredByUserId: input.userId },
    select: { recipientEmail: true },
  });
  const alreadyInvited = new Set(priorLeads.map((lead) => referralRecipientDedupeKey(lead.recipientEmail)));
  const pendingRecipients = recipients.filter(
    (recipientEmail) => !alreadyInvited.has(referralRecipientDedupeKey(recipientEmail)),
  );

  if (pendingRecipients.length === 0) {
    throw new Error("All selected contacts were already invited or filtered out.");
  }

  const composeSettings = await getComposeSettingsByUserId(input.userId);
  const fromName = composeSettings.displayName?.trim() || input.displayName?.trim() || undefined;
  const referredByName = input.displayName?.trim() || input.email.split("@")[0] || null;
  const subject = input.subject.trim() || PMail_REFERRAL_SUBJECT;
  const sentAt = new Date();
  const leads: Array<{ id: string; recipientEmail: string; emailStatus: ReferralEmailStatus }> = [];
  let sentCount = 0;
  let bouncedCount = 0;

  for (const recipientEmail of pendingRecipients) {
    const tracking = await createSentTracking(input.userId, {
      toEmail: recipientEmail,
      subject,
    });
    const pixelUrl = buildTrackingPixelUrl(tracking.trackingToken, input.apiPublicBase);
    let htmlBody = input.html?.trim() ? injectTrackingPixel(input.html, pixelUrl) : undefined;
    if (htmlBody) {
      htmlBody = await wrapTrackedLinksInHtml(htmlBody, tracking.id, input.apiPublicBase);
    }

    const lead = await prisma.pmailReferralLead.create({
      data: {
        tenantId: input.tenantId,
        recipientEmail,
        referredByUserId: input.userId,
        referredByEmail: input.email,
        referredByName,
        referredOn: sentAt,
        emailStatus: "pending",
        trackingToken: tracking.trackingToken,
      },
    });

    try {
      const result = await sendMail({
        email: input.credentials.email,
        password: input.credentials.password,
        mailConfig: input.credentials.mailConfig,
        fromName,
        to: recipientEmail,
        subject,
        text: input.text,
        html: htmlBody,
      });

      await prisma.pmailReferralLead.update({
        where: { id: lead.id },
        data: {
          emailStatus: "delivered",
          smtpMessageId: result.messageId ?? null,
          sentAt,
        },
      });
      sentCount += 1;
      leads.push({ id: lead.id, recipientEmail, emailStatus: "delivered" });
    } catch {
      await prisma.pmailReferralLead.update({
        where: { id: lead.id },
        data: {
          emailStatus: "bounced",
          bouncedAt: new Date(),
        },
      });
      bouncedCount += 1;
      leads.push({ id: lead.id, recipientEmail, emailStatus: "bounced" });
    }
  }

  const reward =
    sentCount > 0 ? await grantReferralPlatformReward(input.tenantId) : { granted: false, reason: "no_sent" };

  return { sentCount, bouncedCount, leads, reward };
}

export async function markReferralLeadReadByTrackingToken(token: string): Promise<void> {
  const lead = await prisma.pmailReferralLead.findFirst({ where: { trackingToken: token } });
  if (!lead || lead.emailStatus === "read") return;
  await prisma.pmailReferralLead.update({
    where: { id: lead.id },
    data: {
      emailStatus: "read",
      readAt: new Date(),
    },
  });
}

export async function markReferralLeadBounced(input: {
  recipientEmail: string;
  smtpMessageId?: string | null;
}): Promise<{ updated: boolean; leadId?: string }> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const lead = await prisma.pmailReferralLead.findFirst({
    where: {
      ...(input.smtpMessageId
        ? { smtpMessageId: input.smtpMessageId }
        : {
            recipientEmail,
            emailStatus: { in: ["pending", "delivered", "read"] },
          }),
    },
    orderBy: { referredOn: "desc" },
  });
  if (!lead || lead.emailStatus === "bounced") return { updated: false };

  await prisma.pmailReferralLead.update({
    where: { id: lead.id },
    data: {
      emailStatus: "bounced",
      bouncedAt: new Date(),
    },
  });
  return { updated: true, leadId: lead.id };
}

async function upsertReferralMarketingLead(input: {
  userEmail: string;
  displayName?: string | null;
  tenantId?: string | null;
  referredByEmail: string;
}) {
  const email = input.userEmail.trim().toLowerCase();
  const existing = await prisma.marketingLead.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  const noteLine = `PMail+ referral signup via ${input.referredByEmail}`;
  const now = new Date();

  if (existing) {
    const notes = existing.notes?.includes(noteLine)
      ? existing.notes
      : [existing.notes?.trim(), noteLine].filter(Boolean).join("\n");
    const updated = await prisma.marketingLead.update({
      where: { id: existing.id },
      data: {
        status: existing.convertedAt ? existing.status : "converted",
        convertedAt: existing.convertedAt ?? now,
        tenantId: input.tenantId ?? existing.tenantId,
        notes,
      },
    });
    return updated.id;
  }

  const created = await prisma.marketingLead.create({
    data: {
      fullName: input.displayName?.trim() || email.split("@")[0] || "PMail+ user",
      email,
      company: "",
      status: "converted",
      convertedAt: now,
      tenantId: input.tenantId ?? null,
      consentPrivacy: true,
      consentContact: true,
      notes: noteLine,
    },
  });
  return created.id;
}

export async function attributeReferralSignup(input: {
  userId?: string;
  userEmail: string;
  tenantId?: string;
  referrerEmail?: string | null;
  displayName?: string | null;
}): Promise<{ attributed: boolean; leadId?: string; marketingLeadId?: string }> {
  const recipientEmail = input.userEmail.trim().toLowerCase();
  const referrerEmail = input.referrerEmail?.trim().toLowerCase();
  if (!recipientEmail.includes("@")) return { attributed: false };

  const lead = await prisma.pmailReferralLead.findFirst({
    where: {
      recipientEmail,
      convertedAt: null,
      ...(referrerEmail ? { referredByEmail: referrerEmail } : {}),
    },
    orderBy: { referredOn: "desc" },
  });
  if (!lead) return { attributed: false };

  const marketingLeadId = await upsertReferralMarketingLead({
    userEmail: recipientEmail,
    displayName: input.displayName,
    tenantId: input.tenantId ?? lead.tenantId,
    referredByEmail: lead.referredByEmail,
  });

  await prisma.pmailReferralLead.update({
    where: { id: lead.id },
    data: {
      convertedAt: new Date(),
      convertedUserId: input.userId ?? null,
      marketingLeadId,
    },
  });

  return { attributed: true, leadId: lead.id, marketingLeadId };
}

export async function listPmailReferralLeads(input?: {
  emailStatus?: string;
  q?: string;
  limit?: number;
}) {
  const rows = await prisma.pmailReferralLead.findMany({
    where: {
      ...(input?.emailStatus ? { emailStatus: input.emailStatus } : {}),
      ...(input?.q
        ? {
            OR: [
              { recipientEmail: { contains: input.q } },
              { referredByEmail: { contains: input.q } },
              { referredByName: { contains: input.q } },
            ],
          }
        : {}),
    },
    orderBy: { referredOn: "desc" },
    take: input?.limit ?? 200,
    include: {
      referredBy: { select: { id: true, email: true, displayName: true } },
      tenant: { select: { id: true, slug: true, name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    recipientEmail: row.recipientEmail,
    referredBy: row.referredByName?.trim() || row.referredBy.displayName?.trim() || row.referredByEmail,
    referredByEmail: row.referredByEmail,
    referredByUserId: row.referredByUserId,
    referredOn: row.referredOn.toISOString(),
    emailStatus: row.emailStatus as ReferralEmailStatus,
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    bouncedAt: row.bouncedAt?.toISOString() ?? null,
    convertedAt: row.convertedAt?.toISOString() ?? null,
    convertedUserId: row.convertedUserId,
    marketingLeadId: row.marketingLeadId,
    tenant: row.tenant,
  }));
}

export async function getPmailReferralLeadStats() {
  const [total, delivered, read, bounced, pending, converted] = await Promise.all([
    prisma.pmailReferralLead.count(),
    prisma.pmailReferralLead.count({ where: { emailStatus: "delivered" } }),
    prisma.pmailReferralLead.count({ where: { emailStatus: "read" } }),
    prisma.pmailReferralLead.count({ where: { emailStatus: "bounced" } }),
    prisma.pmailReferralLead.count({ where: { emailStatus: "pending" } }),
    prisma.pmailReferralLead.count({ where: { NOT: { convertedAt: null } } }),
  ]);
  return { total, delivered, read, bounced, pending, converted };
}

export async function runAutomaticReferralInvite(input: {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  credentials: MailCredentials;
  apiPublicBase: string;
}) {
  const compose = await buildReferralCompose({
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
    credentials: input.credentials,
  });

  if (!compose.bcc.trim()) {
    throw new Error(
      "No contacts were found in your inbox or sent mail. Refer a friend needs at least one email to invite.",
    );
  }

  const result = await sendReferralInvitations({
    userId: input.userId,
    tenantId: input.tenantId,
    email: input.email,
    displayName: input.displayName,
    credentials: input.credentials,
    subject: compose.subject,
    text: compose.body,
    html: compose.bodyHtml,
    bcc: compose.bcc,
    apiPublicBase: input.apiPublicBase,
  });

  if (result.sentCount === 0) {
    throw new Error("Could not deliver referral invitations. Check your mail configuration and try again.");
  }

  return {
    ...result,
    inboxCount: compose.inboxCount,
    sentMailboxCount: compose.sentCount,
    rewardToast: result.reward.granted ? REFERRAL_REWARD_TOAST : null,
    message: result.reward.granted
      ? REFERRAL_REWARD_TOAST
      : `Referral invitations sent to ${result.sentCount} contact${result.sentCount === 1 ? "" : "s"}.`,
  };
}
