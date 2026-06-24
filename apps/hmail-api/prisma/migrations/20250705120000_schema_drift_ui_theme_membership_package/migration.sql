-- Columns present in schema.prisma but missing from earlier migration history (production drift fix)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uiThemeVersion" TEXT NOT NULL DEFAULT 'dark';

ALTER TABLE "MembershipApplication" ADD COLUMN IF NOT EXISTS "packageSelectionToken" TEXT;
ALTER TABLE "MembershipApplication" ADD COLUMN IF NOT EXISTS "selectedHostingPackage" TEXT;
ALTER TABLE "MembershipApplication" ADD COLUMN IF NOT EXISTS "hostingPackageEmailSentAt" TIMESTAMP(3);
ALTER TABLE "MembershipApplication" ADD COLUMN IF NOT EXISTS "packageSelectedAt" TIMESTAMP(3);

UPDATE "MembershipApplication"
SET "packageSelectionToken" = gen_random_uuid()::text
WHERE "packageSelectionToken" IS NULL;

ALTER TABLE "MembershipApplication" ALTER COLUMN "packageSelectionToken" SET NOT NULL;
ALTER TABLE "MembershipApplication" ALTER COLUMN "packageSelectionToken" SET DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS "MembershipApplication_packageSelectionToken_key"
  ON "MembershipApplication"("packageSelectionToken");
