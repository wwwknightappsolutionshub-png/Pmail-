-- Growth plan tier admin override

ALTER TABLE "GrowthWorkspaceSettings" ADD COLUMN "planTierOverride" BOOLEAN NOT NULL DEFAULT false;
