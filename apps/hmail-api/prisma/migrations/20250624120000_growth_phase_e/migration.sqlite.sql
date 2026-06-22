-- Phase E: Growth analytics events (SQLite)

CREATE TABLE "GrowthAnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourcePage" TEXT,
    "path" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthAnalyticsEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GrowthAnalyticsEvent_tenantId_eventType_createdAt_idx" ON "GrowthAnalyticsEvent"("tenantId", "eventType", "createdAt");
CREATE INDEX "GrowthAnalyticsEvent_workspaceId_eventType_createdAt_idx" ON "GrowthAnalyticsEvent"("workspaceId", "eventType", "createdAt");
CREATE INDEX "GrowthAnalyticsEvent_workspaceId_sourcePage_idx" ON "GrowthAnalyticsEvent"("workspaceId", "sourcePage");
CREATE INDEX "GrowthAnalyticsEvent_utmSource_idx" ON "GrowthAnalyticsEvent"("utmSource");
