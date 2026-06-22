ALTER TABLE "WorkspaceCalendarEvent" ADD COLUMN "syncSource" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "WorkspaceCalendarEvent" ADD COLUMN "crmRecordId" TEXT;

CREATE TABLE IF NOT EXISTS "WorkspaceCalendarSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "googleConnected" BOOLEAN NOT NULL DEFAULT false,
    "microsoftConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" DATETIME,
    "capacityHoursPerWeek" INTEGER NOT NULL DEFAULT 40,
    "reminderSequencesJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceCalendarSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WorkspaceCalendarEvent_tenantId_userId_syncSource_idx" ON "WorkspaceCalendarEvent"("tenantId", "userId", "syncSource");
