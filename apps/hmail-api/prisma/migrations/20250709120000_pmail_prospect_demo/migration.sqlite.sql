ALTER TABLE "User" ADD COLUMN "prospectDemoExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "prospectDemoPasswordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "prospectDemoUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PmailProspect" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN "userId" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN "demoTenantSlug" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN "demoProvisionedAt" DATETIME;
ALTER TABLE "PmailProspect" ADD COLUMN "demoExpiresAt" DATETIME;
ALTER TABLE "PmailProspect" ADD COLUMN "demoWelcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PmailProspect" ADD COLUMN "demoUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PmailProspect_tenantId_idx" ON "PmailProspect"("tenantId");
CREATE INDEX IF NOT EXISTS "PmailProspect_userId_idx" ON "PmailProspect"("userId");
CREATE INDEX IF NOT EXISTS "PmailProspect_demoExpiresAt_idx" ON "PmailProspect"("demoExpiresAt");
