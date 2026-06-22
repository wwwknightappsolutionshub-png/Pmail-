-- Sales pipeline, email templates, marketing engine

ALTER TABLE "HostingAccount" ADD COLUMN IF NOT EXISTS "isSampleDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "MembershipApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "teamType" TEXT NOT NULL,
    "deployIntent" TEXT NOT NULL,
    "hostingScale" TEXT NOT NULL,
    "emailService" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "tenantId" TEXT,
    "hostingAccountId" TEXT,
    "marketingLeadId" TEXT,
    "demoUsername" TEXT,
    "demoDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "consentPrivacy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MembershipApplication_workEmail_idx" ON "MembershipApplication"("workEmail");
CREATE INDEX IF NOT EXISTS "MembershipApplication_status_idx" ON "MembershipApplication"("status");
CREATE INDEX IF NOT EXISTS "MembershipApplication_tenantId_idx" ON "MembershipApplication"("tenantId");
CREATE INDEX IF NOT EXISTS "MembershipApplication_createdAt_idx" ON "MembershipApplication"("createdAt");

CREATE TABLE IF NOT EXISTS "InquirySubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "membershipInterest" TEXT NOT NULL,
    "inquiringAbout" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "marketingLeadId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "InquirySubmission_email_idx" ON "InquirySubmission"("email");
CREATE INDEX IF NOT EXISTS "InquirySubmission_status_idx" ON "InquirySubmission"("status");
CREATE INDEX IF NOT EXISTS "InquirySubmission_createdAt_idx" ON "InquirySubmission"("createdAt");

CREATE TABLE IF NOT EXISTS "PublicFormDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formKey" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fieldsJson" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variablesJson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "EmailTemplate_category_idx" ON "EmailTemplate"("category");

CREATE TABLE IF NOT EXISTS "PlatformEmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateSlug" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlatformEmailLog_createdAt_idx" ON "PlatformEmailLog"("createdAt");
CREATE INDEX IF NOT EXISTS "PlatformEmailLog_templateSlug_idx" ON "PlatformEmailLog"("templateSlug");

CREATE TABLE IF NOT EXISTS "MarketingPlatformConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "aiProvider" TEXT NOT NULL DEFAULT 'openai',
    "aiModel" TEXT,
    "aiApiKeyEnc" TEXT,
    "aiBaseUrl" TEXT,
    "settingsJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MarketingAiSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messagesJson" TEXT NOT NULL,
    "recommendationsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "MarketingAiSession_adminId_idx" ON "MarketingAiSession"("adminId");
CREATE INDEX IF NOT EXISTS "MarketingAiSession_updatedAt_idx" ON "MarketingAiSession"("updatedAt");
