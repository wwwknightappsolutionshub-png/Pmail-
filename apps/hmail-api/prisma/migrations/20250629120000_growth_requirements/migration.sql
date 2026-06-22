-- Growth requirements: weekly briefs, channel integrations, ads/SEO ops

CREATE TABLE "GrowthWeeklyBrief" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "briefMarkdown" TEXT NOT NULL,
    "insightCount" INTEGER NOT NULL DEFAULT 0,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthWeeklyBrief_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthChannelIntegration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "credentialsEnc" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthChannelIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthAdCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dailyBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "adCopyAssetId" TEXT,
    "pacingJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthAdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthSeoKeyword" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "targetUrl" TEXT,
    "currentRank" INTEGER,
    "previousRank" INTEGER,
    "searchVolume" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthSeoKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthWeeklyBrief_workspaceId_weekStart_key" ON "GrowthWeeklyBrief"("workspaceId", "weekStart");
CREATE INDEX "GrowthWeeklyBrief_tenantId_idx" ON "GrowthWeeklyBrief"("tenantId");

CREATE UNIQUE INDEX "GrowthChannelIntegration_workspaceId_provider_key" ON "GrowthChannelIntegration"("workspaceId", "provider");
CREATE INDEX "GrowthChannelIntegration_tenantId_idx" ON "GrowthChannelIntegration"("tenantId");

CREATE INDEX "GrowthAdCampaign_workspaceId_platform_idx" ON "GrowthAdCampaign"("workspaceId", "platform");
CREATE INDEX "GrowthAdCampaign_tenantId_idx" ON "GrowthAdCampaign"("tenantId");

CREATE UNIQUE INDEX "GrowthSeoKeyword_workspaceId_keyword_key" ON "GrowthSeoKeyword"("workspaceId", "keyword");
CREATE INDEX "GrowthSeoKeyword_tenantId_idx" ON "GrowthSeoKeyword"("tenantId");

ALTER TABLE "GrowthWeeklyBrief" ADD CONSTRAINT "GrowthWeeklyBrief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthChannelIntegration" ADD CONSTRAINT "GrowthChannelIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAdCampaign" ADD CONSTRAINT "GrowthAdCampaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthSeoKeyword" ADD CONSTRAINT "GrowthSeoKeyword_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
