-- AlterTable
ALTER TABLE "User" ADD COLUMN "healthcareAccessRole" TEXT;

-- AlterTable
ALTER TABLE "AcDocumentExchangeRecord" ADD COLUMN "storagePath" TEXT;
ALTER TABLE "AcDocumentExchangeRecord" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "AcDocumentExchangeRecord" ADD COLUMN "mimeType" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceCalendarSettings" ADD COLUMN "googleTokenEnc" TEXT;
ALTER TABLE "WorkspaceCalendarSettings" ADD COLUMN "microsoftTokenEnc" TEXT;
ALTER TABLE "WorkspaceCalendarSettings" ADD COLUMN "googleCalendarId" TEXT;
ALTER TABLE "WorkspaceCalendarSettings" ADD COLUMN "microsoftCalendarId" TEXT;

-- AlterTable
ALTER TABLE "B2bWorkspace" ADD COLUMN "routingStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "B2bWorkspace" ADD COLUMN "routingMailbox" TEXT;
ALTER TABLE "B2bWorkspace" ADD COLUMN "routingActivatedAt" DATETIME;

-- AlterTable
ALTER TABLE "RcOutreachCampaign" ADD COLUMN "subject" TEXT;
ALTER TABLE "RcOutreachCampaign" ADD COLUMN "bodyHtml" TEXT;
ALTER TABLE "RcOutreachCampaign" ADD COLUMN "scheduledFor" DATETIME;

-- CreateTable
CREATE TABLE "PwaPushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PwaPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PwaPushSubscription_endpoint_key" ON "PwaPushSubscription"("endpoint");
CREATE INDEX "PwaPushSubscription_userId_idx" ON "PwaPushSubscription"("userId");

-- AlterTable
ALTER TABLE "WorkspaceCalendarEvent" ADD COLUMN "externalId" TEXT;

CREATE INDEX "WorkspaceCalendarEvent_tenantId_userId_syncSource_externalId_idx" ON "WorkspaceCalendarEvent"("tenantId", "userId", "syncSource", "externalId");
