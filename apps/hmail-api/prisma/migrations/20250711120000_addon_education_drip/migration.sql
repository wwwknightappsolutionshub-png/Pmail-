-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "addonEducationSuppressed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AddonEducationCampaignStep" (
    "id" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "intervalHours" INTEGER NOT NULL DEFAULT 48,
    "resendIntervalHours" INTEGER NOT NULL DEFAULT 48,
    "maxResends" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddonEducationCampaignStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAddonEducationState" (
    "userId" TEXT NOT NULL,
    "panelStepIndex" INTEGER NOT NULL DEFAULT 0,
    "panelStatus" TEXT NOT NULL DEFAULT 'pending_welcome',
    "panelPausedStepKey" TEXT,
    "panelNextEligibleAt" TIMESTAMP(3),
    "verticalStatus" TEXT NOT NULL DEFAULT 'pending',
    "verticalStepKey" TEXT,
    "verticalNextEligibleAt" TIMESTAMP(3),
    "verticalCompletedAt" TIMESTAMP(3),
    "addonEducationOptOut" BOOLEAN NOT NULL DEFAULT false,
    "addonEducationSuppressed" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddonEducationState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AddonEducationEmailSend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'sent',

    CONSTRAINT "AddonEducationEmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddonEducationEmailClick" (
    "id" TEXT NOT NULL,
    "sendId" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "AddonEducationEmailClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddonEducationCampaignStep_campaignType_stepKey_key" ON "AddonEducationCampaignStep"("campaignType", "stepKey");

-- CreateIndex
CREATE INDEX "AddonEducationCampaignStep_campaignType_sortOrder_idx" ON "AddonEducationCampaignStep"("campaignType", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AddonEducationEmailSend_trackingToken_key" ON "AddonEducationEmailSend"("trackingToken");

-- CreateIndex
CREATE INDEX "AddonEducationEmailSend_userId_campaignType_stepKey_idx" ON "AddonEducationEmailSend"("userId", "campaignType", "stepKey");

-- CreateIndex
CREATE UNIQUE INDEX "AddonEducationEmailClick_clickToken_key" ON "AddonEducationEmailClick"("clickToken");

-- CreateIndex
CREATE INDEX "AddonEducationEmailClick_sendId_idx" ON "AddonEducationEmailClick"("sendId");

-- AddForeignKey
ALTER TABLE "UserAddonEducationState" ADD CONSTRAINT "UserAddonEducationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddonEducationEmailSend" ADD CONSTRAINT "AddonEducationEmailSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddonEducationEmailSend" ADD CONSTRAINT "AddonEducationEmailSend_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddonEducationEmailClick" ADD CONSTRAINT "AddonEducationEmailClick_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "AddonEducationEmailSend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
