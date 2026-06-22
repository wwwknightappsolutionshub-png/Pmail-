-- Prohost Growth Phase I/J — channel deliveries

CREATE TABLE "GrowthChannelDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "assetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "platform" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientEmail" TEXT,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthChannelDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthChannelDelivery_workspaceId_status_scheduledAt_idx" ON "GrowthChannelDelivery"("workspaceId", "status", "scheduledAt");
CREATE INDEX "GrowthChannelDelivery_tenantId_idx" ON "GrowthChannelDelivery"("tenantId");

ALTER TABLE "GrowthChannelDelivery" ADD CONSTRAINT "GrowthChannelDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
