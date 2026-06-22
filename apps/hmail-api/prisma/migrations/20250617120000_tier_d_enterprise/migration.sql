-- Tier D: billing lifecycle fields + lead privacy consent

ALTER TABLE "TenantAddonSubscription" ADD COLUMN IF NOT EXISTS "pastDueSince" TIMESTAMP(3);
ALTER TABLE "TenantAddonSubscription" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

ALTER TABLE "HostingPlanSubscription" ADD COLUMN IF NOT EXISTS "pastDueSince" TIMESTAMP(3);
ALTER TABLE "HostingPlanSubscription" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "consentPrivacy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketingLead" ADD COLUMN IF NOT EXISTS "consentContact" BOOLEAN NOT NULL DEFAULT false;
