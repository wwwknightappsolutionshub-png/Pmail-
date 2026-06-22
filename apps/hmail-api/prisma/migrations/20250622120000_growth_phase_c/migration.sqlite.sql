-- Phase C: Growth capture & CRM (SQLite)

CREATE TABLE "GrowthPipelineStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthPipelineStage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GrowthLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stageSlug" TEXT NOT NULL DEFAULT 'new',
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'form',
    "sourcePage" TEXT,
    "formDataJson" TEXT NOT NULL DEFAULT '{}',
    "attributionJson" TEXT NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthLead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GrowthFormDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "formKey" TEXT NOT NULL DEFAULT 'capture',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthFormDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GrowthLeadActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthLeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "GrowthLead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GrowthPipelineStage_tenantId_idx" ON "GrowthPipelineStage"("tenantId");
CREATE INDEX "GrowthPipelineStage_workspaceId_sortOrder_idx" ON "GrowthPipelineStage"("workspaceId", "sortOrder");
CREATE UNIQUE INDEX "GrowthPipelineStage_workspaceId_slug_key" ON "GrowthPipelineStage"("workspaceId", "slug");
CREATE INDEX "GrowthLead_tenantId_idx" ON "GrowthLead"("tenantId");
CREATE INDEX "GrowthLead_workspaceId_stageSlug_idx" ON "GrowthLead"("workspaceId", "stageSlug");
CREATE INDEX "GrowthLead_workspaceId_createdAt_idx" ON "GrowthLead"("workspaceId", "createdAt");
CREATE INDEX "GrowthLead_email_idx" ON "GrowthLead"("email");
CREATE INDEX "GrowthFormDefinition_tenantId_idx" ON "GrowthFormDefinition"("tenantId");
CREATE UNIQUE INDEX "GrowthFormDefinition_workspaceId_formKey_key" ON "GrowthFormDefinition"("workspaceId", "formKey");
CREATE INDEX "GrowthLeadActivity_leadId_idx" ON "GrowthLeadActivity"("leadId");
CREATE INDEX "GrowthLeadActivity_workspaceId_createdAt_idx" ON "GrowthLeadActivity"("workspaceId", "createdAt");
