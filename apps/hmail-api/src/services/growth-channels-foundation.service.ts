import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

/** Seed starter channel schedule and mark workspace channels-ready. */
export async function ensureGrowthChannelsFoundation(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (!workspace) throw new Error("Growth workspace not found");

  const existing = await prisma.growthChannelDelivery.count({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId },
  });

  const socialPosts = await prisma.growthContentAsset.findMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId, assetType: "social_post" },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });

  if (existing === 0 && socialPosts.length > 0) {
    const offsetsDays = [1, 3, 7];
    for (const [index, asset] of socialPosts.entries()) {
      const body = JSON.parse(asset.bodyJson) as Record<string, unknown>;
      const scheduledAt = new Date(Date.now() + (offsetsDays[index] ?? 7) * 24 * 60 * 60 * 1000);
      await prisma.growthChannelDelivery.create({
        data: {
          id: randomUUID(),
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          channelType: "social_post",
          assetId: asset.id,
          status: "scheduled",
          platform: typeof body.platform === "string" ? body.platform : null,
          scheduledAt,
          payloadJson: JSON.stringify({
            title: asset.title,
            caption: body.caption,
            hashtags: body.hashtags,
            callToAction: body.callToAction,
          }),
          resultJson: "{}",
        },
      });
    }
  }

  if (workspace.status !== "channels_ready") {
    await setWorkspaceStatus(input.workspaceId, "channels_ready");
  }

  const deliveries = await prisma.growthChannelDelivery.findMany({
    where: { tenantId: input.tenantId, workspaceId: input.workspaceId },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "channels.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { deliveryCount: deliveries.length },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "channels.foundation_ready",
    payload: { deliveryCount: deliveries.length },
  });

  return {
    workspaceStatus: "channels_ready" as const,
    deliveries: deliveries.map((row: { id: string; channelType: string; status: string; scheduledAt: Date | null }) => ({
      id: row.id,
      channelType: row.channelType,
      status: row.status,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
    })),
  };
}
