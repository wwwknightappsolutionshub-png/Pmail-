CREATE TABLE IF NOT EXISTS "PmailProspect" (
  "id" TEXT NOT NULL,
  "tenantSlug" TEXT,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT,
  "referrerEmail" TEXT,
  "status" TEXT NOT NULL DEFAULT 'interested',
  "notes" TEXT,
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmailProspect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PmailProspect_email_idx" ON "PmailProspect"("email");
CREATE INDEX IF NOT EXISTS "PmailProspect_status_idx" ON "PmailProspect"("status");
CREATE INDEX IF NOT EXISTS "PmailProspect_createdAt_idx" ON "PmailProspect"("createdAt");
