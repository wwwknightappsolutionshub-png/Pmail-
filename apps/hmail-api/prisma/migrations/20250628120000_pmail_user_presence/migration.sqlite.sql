-- PMail+ session presence tracking (last activity + online detection)
ALTER TABLE "Session" ADD COLUMN "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Session_lastActiveAt_idx" ON "Session"("lastActiveAt");
