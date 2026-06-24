-- Marketplace addon schema (SQLite dev parity)

ALTER TABLE "Addon" ADD COLUMN "vertical" TEXT NOT NULL DEFAULT 'platform';
ALTER TABLE "Addon" ADD COLUMN "addonKind" TEXT NOT NULL DEFAULT 'vertical';
ALTER TABLE "Addon" ADD COLUMN "tenantPriceCents" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Addon" ADD COLUMN "minTenantSeats" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Addon" ADD COLUMN "releasePhase" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Addon" ADD COLUMN "comingSoon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Addon" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "Addon_vertical_addonKind_idx" ON "Addon"("vertical", "addonKind");
CREATE INDEX IF NOT EXISTS "Addon_isActive_deletedAt_idx" ON "Addon"("isActive", "deletedAt");

ALTER TABLE "TenantAddonSubscription" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'tenant';
ALTER TABLE "TenantAddonSubscription" ADD COLUMN "seats" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "TenantAddonSubscription" ADD COLUMN "priceCentsPerSeat" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "UserAddonSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addonId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currentPeriodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserAddonSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAddonSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAddonSubscription_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "Addon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserAddonSubscription_userId_addonId_key" ON "UserAddonSubscription"("userId", "addonId");
CREATE INDEX "UserAddonSubscription_tenantId_status_idx" ON "UserAddonSubscription"("tenantId", "status");
CREATE INDEX "UserAddonSubscription_status_currentPeriodEnd_idx" ON "UserAddonSubscription"("status", "currentPeriodEnd");
