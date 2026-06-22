-- Phase E: Growth analytics events

CREATE TABLE "GrowthAnalyticsEvent" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthAnalyticsEvent_tenantId_eventType_createdAt_idx" ON "GrowthAnalyticsEvent"("tenantId", "eventType", "createdAt");
CREATE INDEX "GrowthAnalyticsEvent_workspaceId_eventType_createdAt_idx" ON "GrowthAnalyticsEvent"("workspaceId", "eventType", "createdAt");
CREATE INDEX "GrowthAnalyticsEvent_workspaceId_sourcePage_idx" ON "GrowthAnalyticsEvent"("workspaceId", "sourcePage");
CREATE INDEX "GrowthAnalyticsEvent_utmSource_idx" ON "GrowthAnalyticsEvent"("utmSource");

ALTER TABLE "GrowthAnalyticsEvent" ADD CONSTRAINT "GrowthAnalyticsEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
