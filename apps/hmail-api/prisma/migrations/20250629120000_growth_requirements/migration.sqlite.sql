-- Growth requirements: weekly briefs, channel integrations, ads/SEO ops (SQLite)

CREATE TABLE "GrowthWeeklyBrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "briefMarkdown" TEXT NOT NULL,
    "insightCount" INTEGER NOT NULL DEFAULT 0,
    "emailedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthWeeklyBrief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GrowthWeeklyBrief_workspaceId_weekStart_key" ON "GrowthWeeklyBrief"("workspaceId", "weekStart");
CREATE INDEX "GrowthWeeklyBrief_tenantId_idx" ON "GrowthWeeklyBrief"("tenantId");

CREATE TABLE "GrowthChannelIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "credentialsEnc" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthChannelIntegration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GrowthChannelIntegration_workspaceId_provider_key" ON "GrowthChannelIntegration"("workspaceId", "provider");
CREATE INDEX "GrowthChannelIntegration_tenantId_idx" ON "GrowthChannelIntegration"("tenantId");

CREATE TABLE "GrowthAdCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthAdCampaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GrowthAdCampaign_workspaceId_platform_idx" ON "GrowthAdCampaign"("workspaceId", "platform");
CREATE INDEX "GrowthAdCampaign_tenantId_idx" ON "GrowthAdCampaign"("tenantId");

CREATE TABLE "GrowthSeoKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "targetUrl" TEXT,
    "currentRank" INTEGER,
    "previousRank" INTEGER,
    "searchVolume" INTEGER,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthSeoKeyword_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GrowthSeoKeyword_workspaceId_keyword_key" ON "GrowthSeoKeyword"("workspaceId", "keyword");
CREATE INDEX "GrowthSeoKeyword_tenantId_idx" ON "GrowthSeoKeyword"("tenantId");
