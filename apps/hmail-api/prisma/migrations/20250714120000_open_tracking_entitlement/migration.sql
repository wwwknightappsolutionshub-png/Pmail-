-- Open tracking first-send entitlement + in-app open notifications
ALTER TABLE "UserComposeSettings" ADD COLUMN "openTrackingFirstSendAt" TIMESTAMP(3);
ALTER TABLE "UserComposeSettings" ADD COLUMN "openTrackingUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TrackingOpenNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentMessageTrackingId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingOpenNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrackingOpenNotification_userId_readAt_idx" ON "TrackingOpenNotification"("userId", "readAt");

ALTER TABLE "TrackingOpenNotification" ADD CONSTRAINT "TrackingOpenNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackingOpenNotification" ADD CONSTRAINT "TrackingOpenNotification_sentMessageTrackingId_fkey" FOREIGN KEY ("sentMessageTrackingId") REFERENCES "SentMessageTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
