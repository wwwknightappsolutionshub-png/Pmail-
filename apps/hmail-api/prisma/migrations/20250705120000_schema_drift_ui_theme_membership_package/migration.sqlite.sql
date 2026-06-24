-- SQLite dev parity (not used on production Postgres)

ALTER TABLE "User" ADD COLUMN "uiThemeVersion" TEXT NOT NULL DEFAULT 'dark';

ALTER TABLE "MembershipApplication" ADD COLUMN "packageSelectionToken" TEXT;
ALTER TABLE "MembershipApplication" ADD COLUMN "selectedHostingPackage" TEXT;
ALTER TABLE "MembershipApplication" ADD COLUMN "hostingPackageEmailSentAt" DATETIME;
ALTER TABLE "MembershipApplication" ADD COLUMN "packageSelectedAt" DATETIME;
