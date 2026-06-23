-- Job Hunter Phase 1 — Tier B consent & settings

CREATE TABLE "UserJobHunterSettings" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL DEFAULT 'INTL',
    "tierBDisclosureAcceptedAt" TIMESTAMP(3),
    "tierBDisclosureVersion" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pausedUntil" TIMESTAMP(3),
    "manualJobHuntingOverride" BOOLEAN NOT NULL DEFAULT false,
    "careerScore" INTEGER NOT NULL DEFAULT 0,
    "inferencesDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJobHunterSettings_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "JobHunterMailAccountSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mailAccountId" TEXT NOT NULL,
    "scanEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobHunterMailAccountSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserJobHunterSettings_tenantId_idx" ON "UserJobHunterSettings"("tenantId");
CREATE UNIQUE INDEX "JobHunterMailAccountSettings_mailAccountId_key" ON "JobHunterMailAccountSettings"("mailAccountId");
CREATE INDEX "JobHunterMailAccountSettings_userId_idx" ON "JobHunterMailAccountSettings"("userId");

ALTER TABLE "UserJobHunterSettings" ADD CONSTRAINT "UserJobHunterSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserJobHunterSettings" ADD CONSTRAINT "UserJobHunterSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobHunterMailAccountSettings" ADD CONSTRAINT "JobHunterMailAccountSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobHunterMailAccountSettings" ADD CONSTRAINT "JobHunterMailAccountSettings_mailAccountId_fkey" FOREIGN KEY ("mailAccountId") REFERENCES "UserMailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
