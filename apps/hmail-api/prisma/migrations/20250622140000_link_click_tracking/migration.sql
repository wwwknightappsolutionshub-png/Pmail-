-- Link click tracking (extends open-tracking)
CREATE TABLE "TrackedEmailLink" (
    "id" TEXT NOT NULL,
    "sentMessageTrackingId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "firstClickedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "linkOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedEmailLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackedEmailLink_clickToken_key" ON "TrackedEmailLink"("clickToken");
CREATE INDEX "TrackedEmailLink_sentMessageTrackingId_idx" ON "TrackedEmailLink"("sentMessageTrackingId");

ALTER TABLE "TrackedEmailLink" ADD CONSTRAINT "TrackedEmailLink_sentMessageTrackingId_fkey" FOREIGN KEY ("sentMessageTrackingId") REFERENCES "SentMessageTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
