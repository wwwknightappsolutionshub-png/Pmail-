-- Open tracking first-send entitlement + in-app open notifications
ALTER TABLE "UserComposeSettings" ADD COLUMN "openTrackingFirstSendAt" DATETIME;
ALTER TABLE "UserComposeSettings" ADD COLUMN "openTrackingUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TrackingOpenNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sentMessageTrackingId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackingOpenNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrackingOpenNotification_sentMessageTrackingId_fkey" FOREIGN KEY ("sentMessageTrackingId") REFERENCES "SentMessageTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TrackingOpenNotification_userId_readAt_idx" ON "TrackingOpenNotification"("userId", "readAt");
