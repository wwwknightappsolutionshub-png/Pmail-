import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";
import { assertGrowthChannelsAccess } from "./growth-plan.service.js";
import { sendNurtureEmailToLead } from "./growth-nurture-email.service.js";
import { sendPlatformEmail } from "./platform-email.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { getGrowthSettings } from "./growth-settings.service.js";
import {
  publishSocialViaMeta,
  sendEmailViaMailchimp,
} from "./growth-channel-integration.service.js";

export type ChannelDeliveryRow = {
  id: string;
  channelType: string;
  assetId: string | null;
  status: string;
  platform: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientEmail: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function formatDelivery(row: {
  id: string;
  channelType: string;
  assetId: string | null;
  status: string;
  platform: string | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  recipientEmail: string | null;
  payloadJson: string;
  resultJson: string;
  createdAt: Date;
  updatedAt: Date;
}): ChannelDeliveryRow {
  return {
    id: row.id,
    channelType: row.channelType,
    assetId: row.assetId,
    status: row.status,
    platform: row.platform,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    recipientEmail: row.recipientEmail,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    result: JSON.parse(row.resultJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGrowthChannelAssets(tenantId: string, workspaceId: string) {
  const assets = await prisma.growthContentAsset.findMany({
    where: {
      tenantId,
      workspaceId,
      assetType: { in: ["social_post", "email_sequence", "ad_copy"] },
    },
    orderBy: [{ assetType: "asc" }, { sortOrder: "asc" }],
  });

  return assets.map((row) => ({
    id: row.id,
    assetType: row.assetType,
    title: row.title,
    slug: row.slug,
    body: JSON.parse(row.bodyJson) as Record<string, unknown>,
    sortOrder: row.sortOrder,
  }));
}

export async function listGrowthChannelDeliveries(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthChannelDelivery.findMany({
    where: { tenantId, workspaceId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map(formatDelivery);
}

export async function scheduleGrowthSocialPost(input: {
  tenantId: string;
  workspaceId: string;
  assetId: string;
  scheduledAt: Date;
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);

  const asset = await prisma.growthContentAsset.findFirst({
    where: { id: input.assetId, tenantId: input.tenantId, workspaceId: input.workspaceId, assetType: "social_post" },
  });
  if (!asset) throw new Error("Social post asset not found");

  const body = JSON.parse(asset.bodyJson) as Record<string, unknown>;
  const row = await prisma.growthChannelDelivery.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      channelType: "social_post",
      assetId: asset.id,
      status: "scheduled",
      platform: typeof body.platform === "string" ? body.platform : null,
      scheduledAt: input.scheduledAt,
      payloadJson: JSON.stringify({
        title: asset.title,
        caption: body.caption,
        hashtags: body.hashtags,
        callToAction: body.callToAction,
        linkTarget: body.linkTarget,
      }),
      resultJson: "{}",
    },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "channel.social_scheduled",
    entityType: "growth_channel_delivery",
    entityId: row.id,
    metadata: { assetId: asset.id, scheduledAt: input.scheduledAt.toISOString() },
  });

  return formatDelivery(row);
}

async function resolveChannelNotifyEmail(tenantId: string, workspaceId: string): Promise<string> {
  const settings = await getGrowthSettings(tenantId, workspaceId);
  const notify = settings?.notifyEmail?.trim();
  if (notify) return notify;

  const owner = await prisma.growthTeamMember.findFirst({
    where: { tenantId, workspaceId, role: "owner" },
  });
  if (owner?.email) return owner.email;

  const account = await prisma.hostingAccount.findFirst({ where: { tenantId } });
  if (account) return `${account.username}@${account.domain}`;
  throw new Error("No notify email configured for channel delivery");
}

export async function sendGrowthSocialPostNow(input: {
  tenantId: string;
  workspaceId: string;
  assetId: string;
  deliveryId?: string;
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);

  const asset = await prisma.growthContentAsset.findFirst({
    where: { id: input.assetId, tenantId: input.tenantId, workspaceId: input.workspaceId, assetType: "social_post" },
  });
  if (!asset) throw new Error("Social post asset not found");

  const body = JSON.parse(asset.bodyJson) as Record<string, unknown>;
  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);
  const to = await resolveChannelNotifyEmail(input.tenantId, input.workspaceId);

  const caption = String(body.caption ?? asset.title);
  const hashtags = Array.isArray(body.hashtags) ? body.hashtags.join(" ") : "";
  const platform = String(body.platform ?? "social");
  const text = `${caption}\n\n${hashtags}\n\n${String(body.callToAction ?? "")}`.trim();
  const linkTarget = typeof body.linkTarget === "string" ? body.linkTarget : undefined;

  let deliveryMethod: string = "email_pack";
  let integrationResult: Record<string, unknown> = {};

  try {
    const metaResult = await publishSocialViaMeta({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      caption: text,
      link: linkTarget,
    });
    if (metaResult) {
      deliveryMethod = metaResult.method;
      integrationResult = metaResult;
    }
  } catch (err) {
    integrationResult = { metaError: err instanceof Error ? err.message : "Meta publish failed" };
  }

  if (deliveryMethod === "email_pack") {
    await sendPlatformEmail({
      to,
      subject: `[Prohost Growth] ${platform} post ready — ${asset.title}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;max-width:560px">
<p><strong>${business}</strong> — copy this ${platform} post to your page:</p>
<pre style="white-space:pre-wrap;background:#f4f4f5;padding:1rem;border-radius:8px">${text.replace(/</g, "&lt;")}</pre>
<p style="color:#666;font-size:0.9rem">Connect Meta in Channels to post directly to your Facebook Page.</p>
</div>`,
      text,
      templateSlug: "growth_channel_social",
    });
  }

  let row;
  if (input.deliveryId) {
    row = await prisma.growthChannelDelivery.update({
      where: { id: input.deliveryId },
      data: { status: "sent", sentAt: new Date(), recipientEmail: to, resultJson: JSON.stringify({ method: deliveryMethod, ...integrationResult }) },
    });
  } else {
    row = await prisma.growthChannelDelivery.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        channelType: "social_post",
        assetId: asset.id,
        status: "sent",
        platform: typeof body.platform === "string" ? body.platform : null,
        sentAt: new Date(),
        recipientEmail: to,
        payloadJson: JSON.stringify({ title: asset.title, caption, hashtags }),
        resultJson: JSON.stringify({ method: deliveryMethod, ...integrationResult }),
      },
    });
  }

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "channel.social_sent",
    payload: { assetId: asset.id, deliveryId: row.id },
  });

  return formatDelivery(row);
}

export async function sendGrowthEmailBroadcast(input: {
  tenantId: string;
  workspaceId: string;
  emailStep: number;
  leadIds?: string[];
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);

  const sequenceAsset = await prisma.growthContentAsset.findFirst({
    where: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      assetType: "email_sequence",
    },
  });
  const sequenceBody = sequenceAsset ? (JSON.parse(sequenceAsset.bodyJson) as Record<string, unknown>) : null;
  const emails = Array.isArray(sequenceBody?.emails) ? sequenceBody.emails : [];
  const stepEmail = emails.find(
    (e: unknown) => e && typeof e === "object" && (e as { step?: number }).step === input.emailStep,
  ) as { subject?: string; body?: string } | undefined;

  const leads = input.leadIds?.length
    ? await prisma.growthLead.findMany({
        where: { tenantId: input.tenantId, workspaceId: input.workspaceId, id: { in: input.leadIds } },
      })
    : await prisma.growthLead.findMany({
        where: { tenantId: input.tenantId, workspaceId: input.workspaceId, status: { not: "closed" } },
        take: 200,
      });

  if (leads.length === 0) throw new Error("No leads available for email broadcast");

  let mailchimpSent = false;
  if (stepEmail?.subject && stepEmail.body) {
    try {
      const mc = await sendEmailViaMailchimp({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        subject: stepEmail.subject,
        html: stepEmail.body.replace(/\n/g, "<br>"),
        text: stepEmail.body,
      });
      mailchimpSent = Boolean(mc);
    } catch {
      mailchimpSent = false;
    }
  }

  const results: Array<{ leadId: string; sent: boolean; subject?: string; reason?: string }> = [];
  if (!mailchimpSent) {
    for (const lead of leads) {
      const result = await sendNurtureEmailToLead({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        lead: { id: lead.id, email: lead.email, fullName: lead.fullName },
        emailStep: input.emailStep,
      });
      results.push({ leadId: lead.id, ...result });
    }
  }

  const sentCount = mailchimpSent ? leads.length : results.filter((r) => r.sent).length;
  const row = await prisma.growthChannelDelivery.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      channelType: "email_broadcast",
      status: "sent",
      sentAt: new Date(),
      payloadJson: JSON.stringify({ emailStep: input.emailStep, leadCount: leads.length, mailchimp: mailchimpSent }),
      resultJson: JSON.stringify({ sentCount, results, method: mailchimpSent ? "mailchimp_api" : "pmail_nurture" }),
    },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "channel.email_broadcast",
    entityType: "growth_channel_delivery",
    entityId: row.id,
    metadata: { emailStep: input.emailStep, sentCount },
  });

  return { delivery: formatDelivery(row), sentCount, results };
}

export async function processDueGrowthChannelDeliveries(tenantId: string, workspaceId: string) {
  const due = await prisma.growthChannelDelivery.findMany({
    where: {
      tenantId,
      workspaceId,
      status: "scheduled",
      channelType: "social_post",
      scheduledAt: { lte: new Date() },
    },
    take: 20,
  });

  const processed = [];
  for (const delivery of due) {
    if (!delivery.assetId) continue;
    const sent = await sendGrowthSocialPostNow({
      tenantId,
      workspaceId,
      assetId: delivery.assetId,
      deliveryId: delivery.id,
    });
    processed.push(sent);
  }
  return processed;
}
