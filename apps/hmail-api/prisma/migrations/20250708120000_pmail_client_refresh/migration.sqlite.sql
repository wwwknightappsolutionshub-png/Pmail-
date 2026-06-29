ALTER TABLE "PmailPlatformConfig" ADD COLUMN "clientRefreshAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PmailPlatformConfig"
SET "clientRefreshAt" = COALESCE("clientRefreshAt", "updatedAt", CURRENT_TIMESTAMP)
WHERE "id" = 'default';
