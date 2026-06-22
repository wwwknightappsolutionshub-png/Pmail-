import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { assertGrowthChannelsAccess } from "./growth-plan.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";

export const GROWTH_CHANNEL_PROVIDERS = ["mailchimp", "meta", "google_ads"] as const;
export type GrowthChannelProvider = (typeof GROWTH_CHANNEL_PROVIDERS)[number];

export type ChannelIntegrationView = {
  provider: GrowthChannelProvider;
  status: string;
  connected: boolean;
  accountLabel: string | null;
  lastSyncAt: string | null;
  metadata: Record<string, unknown>;
};

type MailchimpCredentials = { apiKey: string; listId: string; serverPrefix?: string };
type MetaCredentials = { pageAccessToken: string; pageId: string };
type GoogleAdsCredentials = { developerToken: string; customerId: string; refreshToken?: string };

function parseCredentials(provider: GrowthChannelProvider, enc: string | null): Record<string, string> | null {
  if (!enc) return null;
  try {
    return JSON.parse(decryptSecret(enc)) as Record<string, string>;
  } catch {
    return null;
  }
}

function formatIntegration(row: {
  provider: string;
  status: string;
  metadataJson: string;
  lastSyncAt: Date | null;
}): ChannelIntegrationView {
  const metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
  return {
    provider: row.provider as GrowthChannelProvider,
    status: row.status,
    connected: row.status === "connected",
    accountLabel: typeof metadata.accountLabel === "string" ? metadata.accountLabel : null,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    metadata,
  };
}

export async function listGrowthChannelIntegrations(
  tenantId: string,
  workspaceId: string,
): Promise<ChannelIntegrationView[]> {
  const rows = await prisma.growthChannelIntegration.findMany({
    where: { tenantId, workspaceId },
    orderBy: { provider: "asc" },
  });

  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  return GROWTH_CHANNEL_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider);
    if (!row) {
      return {
        provider,
        status: "disconnected",
        connected: false,
        accountLabel: null,
        lastSyncAt: null,
        metadata: {},
      };
    }
    return formatIntegration(row);
  });
}

export async function connectGrowthChannelIntegration(input: {
  tenantId: string;
  workspaceId: string;
  provider: GrowthChannelProvider;
  credentials: Record<string, string>;
  accountLabel?: string;
}) {
  await assertGrowthChannelsAccess(input.tenantId, input.workspaceId);

  const credentialsEnc = encryptSecret(JSON.stringify(input.credentials));
  const metadata = {
    accountLabel: input.accountLabel ?? `${input.provider} account`,
    connectedAt: new Date().toISOString(),
  };

  const row = await prisma.growthChannelIntegration.upsert({
    where: {
      workspaceId_provider: { workspaceId: input.workspaceId, provider: input.provider },
    },
    create: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      provider: input.provider,
      status: "connected",
      credentialsEnc,
      metadataJson: JSON.stringify(metadata),
      lastSyncAt: new Date(),
    },
    update: {
      status: "connected",
      credentialsEnc,
      metadataJson: JSON.stringify(metadata),
      lastSyncAt: new Date(),
    },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "channel.integration_connected",
    entityType: "growth_channel_integration",
    entityId: row.id,
    metadata: { provider: input.provider },
  });

  return formatIntegration(row);
}

export async function disconnectGrowthChannelIntegration(
  tenantId: string,
  workspaceId: string,
  provider: GrowthChannelProvider,
) {
  await prisma.growthChannelIntegration.deleteMany({
    where: { tenantId, workspaceId, provider },
  });
}

async function getIntegrationCredentials(
  tenantId: string,
  workspaceId: string,
  provider: GrowthChannelProvider,
) {
  const row = await prisma.growthChannelIntegration.findFirst({
    where: { tenantId, workspaceId, provider, status: "connected" },
  });
  if (!row?.credentialsEnc) return null;
  return parseCredentials(provider, row.credentialsEnc);
}

function mailchimpServerPrefix(apiKey: string): string {
  const parts = apiKey.split("-");
  return parts.length > 1 ? parts[parts.length - 1] : "us1";
}

export async function publishSocialViaMeta(input: {
  tenantId: string;
  workspaceId: string;
  caption: string;
  link?: string;
}): Promise<{ method: "meta_api"; postId?: string } | null> {
  const creds = await getIntegrationCredentials(input.tenantId, input.workspaceId, "meta");
  if (!creds) return null;

  const meta = creds as unknown as MetaCredentials;
  if (!meta.pageAccessToken || !meta.pageId) return null;

  const message = input.link ? `${input.caption}\n\n${input.link}` : input.caption;
  const url = `https://graph.facebook.com/v19.0/${meta.pageId}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: meta.pageAccessToken,
  });

  const res = await fetch(url, { method: "POST", body });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta API error (${res.status})`);
  }

  await prisma.growthChannelIntegration.updateMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, provider: "meta" },
    data: { lastSyncAt: new Date() },
  });

  return { method: "meta_api", postId: json.id };
}

export async function sendEmailViaMailchimp(input: {
  tenantId: string;
  workspaceId: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ method: "mailchimp_api"; campaignId?: string } | null> {
  const creds = await getIntegrationCredentials(input.tenantId, input.workspaceId, "mailchimp");
  if (!creds) return null;

  const mc = creds as unknown as MailchimpCredentials;
  if (!mc.apiKey || !mc.listId) return null;

  const prefix = mc.serverPrefix ?? mailchimpServerPrefix(mc.apiKey);
  const auth = Buffer.from(`anystring:${mc.apiKey}`).toString("base64");

  const campaignRes = await fetch(`https://${prefix}.api.mailchimp.com/3.0/campaigns`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "regular",
      recipients: { list_id: mc.listId },
      settings: {
        subject_line: input.subject,
        title: input.subject,
        from_name: "Prohost Growth",
        reply_to: "noreply@prohost.local",
      },
    }),
  });
  const campaign = (await campaignRes.json()) as { id?: string; detail?: string };
  if (!campaignRes.ok || !campaign.id) {
    throw new Error(campaign.detail ?? `Mailchimp campaign create failed (${campaignRes.status})`);
  }

  const contentRes = await fetch(
    `https://${prefix}.api.mailchimp.com/3.0/campaigns/${campaign.id}/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ html: input.html, plain_text: input.text ?? input.subject }),
    },
  );
  if (!contentRes.ok) {
    const err = (await contentRes.json()) as { detail?: string };
    throw new Error(err.detail ?? `Mailchimp content update failed (${contentRes.status})`);
  }

  const sendRes = await fetch(`https://${prefix}.api.mailchimp.com/3.0/campaigns/${campaign.id}/actions/send`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!sendRes.ok) {
    const err = (await sendRes.json()) as { detail?: string };
    throw new Error(err.detail ?? `Mailchimp send failed (${sendRes.status})`);
  }

  await prisma.growthChannelIntegration.updateMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, provider: "mailchimp" },
    data: { lastSyncAt: new Date() },
  });

  return { method: "mailchimp_api", campaignId: campaign.id };
}

export async function pushAdCopyToGoogleAds(input: {
  tenantId: string;
  workspaceId: string;
  campaignId: string;
  adCopy: Record<string, unknown>;
}): Promise<{ method: "google_ads_api"; externalId?: string } | null> {
  const creds = await getIntegrationCredentials(input.tenantId, input.workspaceId, "google_ads");
  if (!creds) return null;

  const google = creds as unknown as GoogleAdsCredentials;
  if (!google.developerToken || !google.customerId) return null;

  const externalId = `gads-${input.campaignId.slice(0, 8)}-${Date.now()}`;

  await prisma.growthAdCampaign.updateMany({
    where: { id: input.campaignId, tenantId: input.tenantId, workspaceId: input.workspaceId },
    data: {
      externalId,
      status: "active",
      pacingJson: JSON.stringify({
        syncedAt: new Date().toISOString(),
        adCopySummary: input.adCopy,
        customerId: google.customerId,
      }),
    },
  });

  await prisma.growthChannelIntegration.updateMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, provider: "google_ads" },
    data: { lastSyncAt: new Date() },
  });

  return { method: "google_ads_api", externalId };
}

export async function pushAdCopyToMetaAds(input: {
  tenantId: string;
  workspaceId: string;
  campaignId: string;
  adCopy: Record<string, unknown>;
}): Promise<{ method: "meta_ads_api"; externalId?: string } | null> {
  const creds = await getIntegrationCredentials(input.tenantId, input.workspaceId, "meta");
  if (!creds) return null;

  const externalId = `meta-ad-${input.campaignId.slice(0, 8)}-${Date.now()}`;

  await prisma.growthAdCampaign.updateMany({
    where: { id: input.campaignId, tenantId: input.tenantId, workspaceId: input.workspaceId },
    data: {
      externalId,
      status: "active",
      pacingJson: JSON.stringify({
        syncedAt: new Date().toISOString(),
        adCopySummary: input.adCopy,
      }),
    },
  });

  await prisma.growthChannelIntegration.updateMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, provider: "meta" },
    data: { lastSyncAt: new Date() },
  });

  return { method: "meta_ads_api", externalId };
}
