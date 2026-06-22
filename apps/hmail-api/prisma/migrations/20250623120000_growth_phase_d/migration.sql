-- Phase D: Growth qualification chatbot

CREATE TABLE "GrowthChatbotConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "botKey" TEXT NOT NULL DEFAULT 'qualification',
    "title" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthChatbotConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "leadId" TEXT,
    "sourcePage" TEXT,
    "attributionJson" TEXT NOT NULL DEFAULT '{}',
    "collectedDataJson" TEXT NOT NULL DEFAULT '{}',
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthChatMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stepKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthChatbotConfig_workspaceId_botKey_key" ON "GrowthChatbotConfig"("workspaceId", "botKey");
CREATE INDEX "GrowthChatbotConfig_tenantId_idx" ON "GrowthChatbotConfig"("tenantId");

CREATE INDEX "GrowthChatSession_tenantId_idx" ON "GrowthChatSession"("tenantId");
CREATE INDEX "GrowthChatSession_workspaceId_status_idx" ON "GrowthChatSession"("workspaceId", "status");
CREATE INDEX "GrowthChatSession_workspaceId_createdAt_idx" ON "GrowthChatSession"("workspaceId", "createdAt");
CREATE INDEX "GrowthChatSession_leadId_idx" ON "GrowthChatSession"("leadId");

CREATE INDEX "GrowthChatMessage_sessionId_createdAt_idx" ON "GrowthChatMessage"("sessionId", "createdAt");
CREATE INDEX "GrowthChatMessage_workspaceId_idx" ON "GrowthChatMessage"("workspaceId");

ALTER TABLE "GrowthChatbotConfig" ADD CONSTRAINT "GrowthChatbotConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthChatSession" ADD CONSTRAINT "GrowthChatSession_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthChatMessage" ADD CONSTRAINT "GrowthChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GrowthChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
