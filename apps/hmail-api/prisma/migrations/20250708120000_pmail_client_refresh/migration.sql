ALTER TABLE "PmailPlatformConfig" ADD COLUMN IF NOT EXISTS "clientRefreshAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "PmailPlatformConfig"
SET "clientRefreshAt" = COALESCE("clientRefreshAt", "updatedAt", CURRENT_TIMESTAMP)
WHERE "id" = 'default';
