-- AlterTable
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingLead_phone_idx" ON "MarketingLead"("phone");
CREATE INDEX IF NOT EXISTS "MarketingLead_source_idx" ON "MarketingLead"("source");
