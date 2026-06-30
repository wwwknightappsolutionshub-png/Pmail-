-- AlterTable
ALTER TABLE "SiteSection" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "SiteSection" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
