ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prospectDemoExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prospectDemoPasswordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prospectDemoUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "demoTenantSlug" TEXT;
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "demoProvisionedAt" TIMESTAMP(3);
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "demoExpiresAt" TIMESTAMP(3);
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "demoWelcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PmailProspect" ADD COLUMN IF NOT EXISTS "demoUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PmailProspect_tenantId_idx" ON "PmailProspect"("tenantId");
CREATE INDEX IF NOT EXISTS "PmailProspect_userId_idx" ON "PmailProspect"("userId");
CREATE INDEX IF NOT EXISTS "PmailProspect_demoExpiresAt_idx" ON "PmailProspect"("demoExpiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PmailProspect_tenantId_fkey'
  ) THEN
    ALTER TABLE "PmailProspect"
      ADD CONSTRAINT "PmailProspect_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PmailProspect_userId_fkey'
  ) THEN
    ALTER TABLE "PmailProspect"
      ADD CONSTRAINT "PmailProspect_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
