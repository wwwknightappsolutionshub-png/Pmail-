-- Link click tracking (extends open-tracking)
CREATE TABLE "TrackedEmailLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sentMessageTrackingId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "clickToken" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "firstClickedAt" DATETIME,
    "lastClickedAt" DATETIME,
    "linkOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackedEmailLink_sentMessageTrackingId_fkey" FOREIGN KEY ("sentMessageTrackingId") REFERENCES "SentMessageTracking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TrackedEmailLink_clickToken_key" ON "TrackedEmailLink"("clickToken");
CREATE INDEX "TrackedEmailLink_sentMessageTrackingId_idx" ON "TrackedEmailLink"("sentMessageTrackingId");
