-- AlterTable
ALTER TABLE "MarketingLead" ADD COLUMN "phone" TEXT;
ALTER TABLE "MarketingLead" ADD COLUMN "source" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MarketingLead_source_idx" ON "MarketingLead"("source");
CREATE INDEX IF NOT EXISTS "MarketingLead_phone_idx" ON "MarketingLead"("phone");
