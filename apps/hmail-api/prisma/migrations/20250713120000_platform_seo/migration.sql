-- Platform SEO command center, articles, keywords, snapshots, and recurring tasks

CREATE TABLE "PlatformSeoSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "siteUrl" TEXT NOT NULL DEFAULT 'https://prohost.cloud',
    "gscPropertyUrl" TEXT,
    "gscConnectedAt" TIMESTAMP(3),
    "gscRefreshToken" TEXT,
    "ga4MeasurementId" TEXT,
    "bingSiteVerification" TEXT,
    "defaultLocale" TEXT NOT NULL DEFAULT 'en-CA',
    "alternateLocales" TEXT,
    "lastWeeklyScanAt" TIMESTAMP(3),
    "lastMonthlyScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "PlatformMarketingArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyHtml" TEXT NOT NULL DEFAULT '',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-CA',
    "faqJson" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "PlatformMarketingArticle_slug_key" ON "PlatformMarketingArticle"("slug");
CREATE INDEX "PlatformMarketingArticle_isPublished_publishedAt_idx" ON "PlatformMarketingArticle"("isPublished", "publishedAt");
CREATE INDEX "PlatformMarketingArticle_sortOrder_idx" ON "PlatformMarketingArticle"("sortOrder");

CREATE TABLE "PlatformSeoKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "targetPath" TEXT,
    "currentPosition" DOUBLE PRECISION,
    "previousPosition" DOUBLE PRECISION,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "PlatformSeoKeyword_keyword_key" ON "PlatformSeoKeyword"("keyword");

CREATE TABLE "PlatformSeoSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "sitemapUrlCount" INTEGER NOT NULL DEFAULT 0,
    "avgPosition" DOUBLE PRECISION,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "issuesJson" TEXT NOT NULL DEFAULT '[]',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PlatformSeoSnapshot_period_capturedAt_idx" ON "PlatformSeoSnapshot"("period", "capturedAt");

CREATE TABLE "PlatformSeoTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cadence" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "autoDetected" BOOLEAN NOT NULL DEFAULT true,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "PlatformSeoTask_taskKey_key" ON "PlatformSeoTask"("taskKey");
CREATE INDEX "PlatformSeoTask_status_dueAt_idx" ON "PlatformSeoTask"("status", "dueAt");
CREATE INDEX "PlatformSeoTask_severity_idx" ON "PlatformSeoTask"("severity");
