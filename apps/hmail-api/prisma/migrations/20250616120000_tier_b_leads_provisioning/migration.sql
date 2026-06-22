-- Tier B: marketing lead workflow + tenant conversion link

ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "MarketingLead_status_idx" ON "MarketingLead"("status");
CREATE INDEX IF NOT EXISTS "MarketingLead_tenantId_idx" ON "MarketingLead"("tenantId");

DO $$ BEGIN
  ALTER TABLE "MarketingLead" ADD CONSTRAINT "MarketingLead_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
