-- Prohost Growth Phase A foundation

CREATE TABLE "GrowthWorkspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'onboarding',
    "wizardStep" INTEGER NOT NULL DEFAULT 1,
    "wizardCompletedAt" TIMESTAMP(3),
    "hostingAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthWorkspace_tenantId_key" ON "GrowthWorkspace"("tenantId");
CREATE INDEX "GrowthWorkspace_status_idx" ON "GrowthWorkspace"("status");

CREATE TABLE "GrowthBusinessProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "step1Json" TEXT,
    "step2Json" TEXT,
    "step3Json" TEXT,
    "step4Json" TEXT,
    "step5Json" TEXT,
    "step6Json" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthBusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthBusinessProfile_workspaceId_key" ON "GrowthBusinessProfile"("workspaceId");

CREATE TABLE "GrowthJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthJob_status_scheduledFor_idx" ON "GrowthJob"("status", "scheduledFor");
CREATE INDEX "GrowthJob_tenantId_idx" ON "GrowthJob"("tenantId");
CREATE INDEX "GrowthJob_workspaceId_idx" ON "GrowthJob"("workspaceId");

CREATE TABLE "GrowthAgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "jobId" TEXT,
    "agentKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputJson" TEXT NOT NULL DEFAULT '{}',
    "outputJson" TEXT,
    "promptVersion" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthAgentRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthAgentRun_jobId_key" ON "GrowthAgentRun"("jobId");
CREATE INDEX "GrowthAgentRun_tenantId_agentKey_idx" ON "GrowthAgentRun"("tenantId", "agentKey");
CREATE INDEX "GrowthAgentRun_workspaceId_status_idx" ON "GrowthAgentRun"("workspaceId", "status");

CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthEvent_tenantId_eventType_idx" ON "GrowthEvent"("tenantId", "eventType");
CREATE INDEX "GrowthEvent_workspaceId_createdAt_idx" ON "GrowthEvent"("workspaceId", "createdAt");

CREATE TABLE "GrowthAgentMemory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memoryKey" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthAgentMemory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthAgentMemory_workspaceId_memoryKey_key" ON "GrowthAgentMemory"("workspaceId", "memoryKey");
CREATE INDEX "GrowthAgentMemory_tenantId_idx" ON "GrowthAgentMemory"("tenantId");

CREATE TABLE "GrowthPromptTemplate" (
    "id" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "templateText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthPromptTemplate_agentKey_version_key" ON "GrowthPromptTemplate"("agentKey", "version");
CREATE INDEX "GrowthPromptTemplate_agentKey_isActive_idx" ON "GrowthPromptTemplate"("agentKey", "isActive");

CREATE TABLE "GrowthAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthAuditLog_tenantId_createdAt_idx" ON "GrowthAuditLog"("tenantId", "createdAt");
CREATE INDEX "GrowthAuditLog_workspaceId_idx" ON "GrowthAuditLog"("workspaceId");

ALTER TABLE "GrowthWorkspace" ADD CONSTRAINT "GrowthWorkspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthBusinessProfile" ADD CONSTRAINT "GrowthBusinessProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthJob" ADD CONSTRAINT "GrowthJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAgentRun" ADD CONSTRAINT "GrowthAgentRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthAgentRun" ADD CONSTRAINT "GrowthAgentRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GrowthJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthAgentMemory" ADD CONSTRAINT "GrowthAgentMemory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
