-- Tier A: mail onboarding flag + auto-reply dedup log

ALTER TABLE "TenantMailConfig" ADD COLUMN IF NOT EXISTS "mailOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;
UPDATE "TenantMailConfig" SET "mailOnboardingComplete" = true;

CREATE TABLE IF NOT EXISTS "AutoReplySentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "messageUid" INTEGER NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutoReplySentLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AutoReplySentLog_userId_folder_messageUid_key" ON "AutoReplySentLog"("userId", "folder", "messageUid");
CREATE INDEX IF NOT EXISTS "AutoReplySentLog_userId_senderEmail_idx" ON "AutoReplySentLog"("userId", "senderEmail");
