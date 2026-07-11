-- CreateTable
CREATE TABLE "UserReferExtendCampaign" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "startedAt" DATETIME,
    "lastSentAt" DATETIME,
    "nextEligibleAt" DATETIME,
    "stoppedAt" DATETIME,
    "stopReason" TEXT,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserReferExtendCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferExtendEmailSend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'sent',
    CONSTRAINT "ReferExtendEmailSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReferExtendEmailSend_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferExtendEmailClick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sendId" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clickedAt" DATETIME,
    CONSTRAINT "ReferExtendEmailClick_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "ReferExtendEmailSend" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserReferExtendCampaign_status_nextEligibleAt_idx" ON "UserReferExtendCampaign"("status", "nextEligibleAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferExtendEmailSend_trackingToken_key" ON "ReferExtendEmailSend"("trackingToken");

-- CreateIndex
CREATE INDEX "ReferExtendEmailSend_userId_sentAt_idx" ON "ReferExtendEmailSend"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "ReferExtendEmailSend_trackingToken_idx" ON "ReferExtendEmailSend"("trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "ReferExtendEmailClick_clickToken_key" ON "ReferExtendEmailClick"("clickToken");

-- CreateIndex
CREATE INDEX "ReferExtendEmailClick_sendId_idx" ON "ReferExtendEmailClick"("sendId");
