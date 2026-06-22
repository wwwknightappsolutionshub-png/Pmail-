-- PMail+ referral leads CRM + referral reward trial source
ALTER TABLE "TenantAddonTrial" ADD COLUMN IF NOT EXISTS "trialSource" TEXT;

CREATE TABLE IF NOT EXISTS "PmailReferralLead" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "referredByUserId" TEXT NOT NULL,
  "referredByEmail" TEXT NOT NULL,
  "referredByName" TEXT,
  "referredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "emailStatus" TEXT NOT NULL DEFAULT 'pending',
  "trackingToken" TEXT,
  "smtpMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "bouncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PmailReferralLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmailReferralLead_trackingToken_key" ON "PmailReferralLead"("trackingToken");
CREATE INDEX IF NOT EXISTS "PmailReferralLead_recipientEmail_idx" ON "PmailReferralLead"("recipientEmail");
CREATE INDEX IF NOT EXISTS "PmailReferralLead_referredByUserId_idx" ON "PmailReferralLead"("referredByUserId");
CREATE INDEX IF NOT EXISTS "PmailReferralLead_emailStatus_idx" ON "PmailReferralLead"("emailStatus");
CREATE INDEX IF NOT EXISTS "PmailReferralLead_referredOn_idx" ON "PmailReferralLead"("referredOn");

ALTER TABLE "PmailReferralLead"
  ADD CONSTRAINT "PmailReferralLead_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PmailReferralLead"
  ADD CONSTRAINT "PmailReferralLead_referredByUserId_fkey"
  FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
