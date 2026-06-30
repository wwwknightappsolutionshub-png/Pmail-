-- AlterTable
ALTER TABLE "User" ADD COLUMN "pmailAccountWelcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PmailPlatformConfig" ADD COLUMN "inboxAddonUpsellEnabled" BOOLEAN NOT NULL DEFAULT true;
