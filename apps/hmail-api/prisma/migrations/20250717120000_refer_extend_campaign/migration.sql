-- CreateTable
CREATE TABLE "UserReferExtendCampaign" (
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "startedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "nextEligibleAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "stopReason" TEXT,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReferExtendCampaign_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ReferExtendEmailSend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'sent',

    CONSTRAINT "ReferExtendEmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferExtendEmailClick" (
    "id" TEXT NOT NULL,
    "sendId" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "ReferExtendEmailClick_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "UserReferExtendCampaign" ADD CONSTRAINT "UserReferExtendCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferExtendEmailSend" ADD CONSTRAINT "ReferExtendEmailSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferExtendEmailSend" ADD CONSTRAINT "ReferExtendEmailSend_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferExtendEmailClick" ADD CONSTRAINT "ReferExtendEmailClick_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "ReferExtendEmailSend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
