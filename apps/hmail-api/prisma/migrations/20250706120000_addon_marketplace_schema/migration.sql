-- Marketplace addon schema (vertical bundles, per-user subscriptions)

ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "vertical" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "addonKind" TEXT NOT NULL DEFAULT 'vertical';
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "tenantPriceCents" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "minTenantSeats" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "releasePhase" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "comingSoon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Addon" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Addon_vertical_addonKind_idx" ON "Addon"("vertical", "addonKind");
CREATE INDEX IF NOT EXISTS "Addon_isActive_deletedAt_idx" ON "Addon"("isActive", "deletedAt");

ALTER TABLE "TenantAddonSubscription" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE "TenantAddonSubscription" ADD COLUMN IF NOT EXISTS "seats" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "TenantAddonSubscription" ADD COLUMN IF NOT EXISTS "priceCentsPerSeat" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UserAddonSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddonSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAddonSubscription_userId_addonId_key" ON "UserAddonSubscription"("userId", "addonId");
CREATE INDEX IF NOT EXISTS "UserAddonSubscription_tenantId_status_idx" ON "UserAddonSubscription"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "UserAddonSubscription_status_currentPeriodEnd_idx" ON "UserAddonSubscription"("status", "currentPeriodEnd");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserAddonSubscription_tenantId_fkey'
  ) THEN
    ALTER TABLE "UserAddonSubscription"
      ADD CONSTRAINT "UserAddonSubscription_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserAddonSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "UserAddonSubscription"
      ADD CONSTRAINT "UserAddonSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserAddonSubscription_addonId_fkey'
  ) THEN
    ALTER TABLE "UserAddonSubscription"
      ADD CONSTRAINT "UserAddonSubscription_addonId_fkey"
      FOREIGN KEY ("addonId") REFERENCES "Addon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
