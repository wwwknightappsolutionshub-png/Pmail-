-- Phase G: Growth automations (SQLite)

CREATE TABLE "GrowthAutomation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerFilterJson" TEXT NOT NULL DEFAULT '{}',
    "actionType" TEXT NOT NULL,
    "actionConfigJson" TEXT NOT NULL DEFAULT '{}',
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthAutomation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GrowthAutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "leadId" TEXT,
    "status" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthAutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "GrowthAutomation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GrowthAutomation_workspaceId_triggerType_isActive_idx" ON "GrowthAutomation"("workspaceId", "triggerType", "isActive");
CREATE INDEX "GrowthAutomation_tenantId_idx" ON "GrowthAutomation"("tenantId");
CREATE INDEX "GrowthAutomationRun_workspaceId_createdAt_idx" ON "GrowthAutomationRun"("workspaceId", "createdAt");
CREATE INDEX "GrowthAutomationRun_automationId_createdAt_idx" ON "GrowthAutomationRun"("automationId", "createdAt");
CREATE INDEX "GrowthAutomationRun_leadId_idx" ON "GrowthAutomationRun"("leadId");
