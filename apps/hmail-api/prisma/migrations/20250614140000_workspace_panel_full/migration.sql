-- Panel resources, workspace CRM/reminders, compose settings, open tracking, marketing leads

ALTER TABLE "TenantBranding" ADD COLUMN IF NOT EXISTS "industryProfile" TEXT;

CREATE TABLE IF NOT EXISTS "PanelFileEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "parentPath" TEXT NOT NULL DEFAULT '/',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PanelFileEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PanelFileEntry_accountId_parentPath_name_key" ON "PanelFileEntry"("accountId", "parentPath", "name");
CREATE INDEX IF NOT EXISTS "PanelFileEntry_accountId_idx" ON "PanelFileEntry"("accountId");

CREATE TABLE IF NOT EXISTS "PanelDatabase" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeMb" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PanelDatabase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PanelDatabase_accountId_name_key" ON "PanelDatabase"("accountId", "name");

CREATE TABLE IF NOT EXISTS "PanelAddonDomain" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "documentRoot" TEXT NOT NULL,
    "ssl" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PanelAddonDomain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PanelAddonDomain_accountId_domain_key" ON "PanelAddonDomain"("accountId", "domain");

CREATE TABLE IF NOT EXISTS "PanelMailbox" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "quotaMb" INTEGER NOT NULL DEFAULT 1024,
    "usedMb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PanelMailbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PanelMailbox_accountId_address_key" ON "PanelMailbox"("accountId", "address");

CREATE TABLE IF NOT EXISTS "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CrmPipelineStage_tenantId_slug_key" ON "CrmPipelineStage"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "CrmPipelineStage_tenantId_idx" ON "CrmPipelineStage"("tenantId");

CREATE TABLE IF NOT EXISTS "CrmRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "notes" TEXT,
    "lastActivity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CrmRecord_tenantId_userId_email_key" ON "CrmRecord"("tenantId", "userId", "email");
CREATE INDEX IF NOT EXISTS "CrmRecord_tenantId_userId_idx" ON "CrmRecord"("tenantId", "userId");

CREATE TABLE IF NOT EXISTS "WorkspaceReminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "crmRecordId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceReminder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkspaceReminder_tenantId_userId_status_idx" ON "WorkspaceReminder"("tenantId", "userId", "status");

CREATE TABLE IF NOT EXISTS "UserComposeSettings" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activeSignatureId" TEXT,
    "activeAutoReplyId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserComposeSettings_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE IF NOT EXISTS "UserSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserSignature_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserSignature_userId_idx" ON "UserSignature"("userId");

CREATE TABLE IF NOT EXISTS "UserAutoReply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAutoReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserAutoReply_userId_idx" ON "UserAutoReply"("userId");

CREATE TABLE IF NOT EXISTS "SentMessageTracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "smtpMessageId" TEXT,
    "trackingToken" TEXT NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "firstOpenedAt" TIMESTAMP(3),
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SentMessageTracking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SentMessageTracking_trackingToken_key" ON "SentMessageTracking"("trackingToken");
CREATE INDEX IF NOT EXISTS "SentMessageTracking_userId_idx" ON "SentMessageTracking"("userId");

CREATE TABLE IF NOT EXISTS "IndustryToolState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndustryToolState_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IndustryToolState_tenantId_userId_toolSlug_key" ON "IndustryToolState"("tenantId", "userId", "toolSlug");

CREATE TABLE IF NOT EXISTS "MarketingLead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "teamSize" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingLead_email_idx" ON "MarketingLead"("email");
