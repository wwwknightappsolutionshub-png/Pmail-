ALTER TABLE "PmailReferralLead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "PmailReferralLead" ADD COLUMN IF NOT EXISTS "convertedUserId" TEXT;
ALTER TABLE "PmailReferralLead" ADD COLUMN IF NOT EXISTS "marketingLeadId" TEXT;

CREATE INDEX IF NOT EXISTS "PmailReferralLead_convertedAt_idx" ON "PmailReferralLead"("convertedAt");

ALTER TABLE "PmailReferralLead"
  ADD CONSTRAINT "PmailReferralLead_convertedUserId_fkey"
  FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PmailReferralLead"
  ADD CONSTRAINT "PmailReferralLead_marketingLeadId_fkey"
  FOREIGN KEY ("marketingLeadId") REFERENCES "MarketingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
