-- Industry vertical add-on models (accounting, recruitment, b2b-services, healthcare)

-- Accounting
CREATE TABLE "AcContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AcContact_tenantId_lastName_idx" ON "AcContact"("tenantId", "lastName");

CREATE TABLE "AcDocumentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "referenceCode" TEXT,
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcDocumentRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentRequest_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentRequest_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "AcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AcDocumentRequest_tenantId_status_idx" ON "AcDocumentRequest"("tenantId", "status");
CREATE INDEX "AcDocumentRequest_tenantId_referenceCode_idx" ON "AcDocumentRequest"("tenantId", "referenceCode");

CREATE TABLE "AcClientEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "taxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "primaryContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcClientEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcClientEntity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "AcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AcClientEntity_tenantId_status_idx" ON "AcClientEntity"("tenantId", "status");
CREATE INDEX "AcClientEntity_tenantId_taxId_idx" ON "AcClientEntity"("tenantId", "taxId");

CREATE TABLE "AcFilingDeadline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "clientEntityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcFilingDeadline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcFilingDeadline_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "AcClientEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcFilingDeadline_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AcContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AcFilingDeadline_tenantId_dueAt_idx" ON "AcFilingDeadline"("tenantId", "dueAt");
CREATE INDEX "AcFilingDeadline_clientEntityId_idx" ON "AcFilingDeadline"("clientEntityId");

CREATE TABLE "AcSecureTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcSecureTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AcSecureTemplate_tenantId_slug_key" ON "AcSecureTemplate"("tenantId", "slug");
CREATE INDEX "AcSecureTemplate_category_idx" ON "AcSecureTemplate"("category");

CREATE TABLE "AcEntityNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcEntityNote_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "AcClientEntity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcEntityNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AcEntityNote_entityId_createdAt_idx" ON "AcEntityNote"("entityId", "createdAt");

-- Recruitment
CREATE TABLE "RcContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'candidate',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RcContact_tenantId_lastName_idx" ON "RcContact"("tenantId", "lastName");

CREATE TABLE "RcRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientCompany" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requisitionCode" TEXT,
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcRole_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RcRole_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "RcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RcRole_tenantId_status_idx" ON "RcRole"("tenantId", "status");
CREATE INDEX "RcRole_tenantId_requisitionCode_idx" ON "RcRole"("tenantId", "requisitionCode");

CREATE TABLE "RcInterview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcInterview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcInterview_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcInterview_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RcContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RcInterview_tenantId_scheduledAt_idx" ON "RcInterview"("tenantId", "scheduledAt");
CREATE INDEX "RcInterview_roleId_idx" ON "RcInterview"("roleId");

CREATE TABLE "RcOutreachTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcOutreachTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RcOutreachTemplate_tenantId_slug_key" ON "RcOutreachTemplate"("tenantId", "slug");
CREATE INDEX "RcOutreachTemplate_category_idx" ON "RcOutreachTemplate"("category");

CREATE TABLE "RcPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "compensationCents" INTEGER,
    "candidateContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcPlacement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcPlacement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcPlacement_candidateContactId_fkey" FOREIGN KEY ("candidateContactId") REFERENCES "RcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RcPlacement_tenantId_status_idx" ON "RcPlacement"("tenantId", "status");
CREATE INDEX "RcPlacement_roleId_idx" ON "RcPlacement"("roleId");

CREATE TABLE "RcPlacementNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RcPlacementNote_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "RcPlacement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcPlacementNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "RcPlacementNote_placementId_createdAt_idx" ON "RcPlacementNote"("placementId", "createdAt");

-- B2B services
CREATE TABLE "B2bContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "B2bContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "B2bContact_tenantId_lastName_idx" ON "B2bContact"("tenantId", "lastName");

CREATE TABLE "B2bWorkspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientDomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "B2bWorkspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2bWorkspace_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "B2bWorkspace_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "B2bContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "B2bWorkspace_tenantId_status_idx" ON "B2bWorkspace"("tenantId", "status");
CREATE INDEX "B2bWorkspace_tenantId_clientDomain_idx" ON "B2bWorkspace"("tenantId", "clientDomain");

CREATE TABLE "B2bMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "B2bMilestone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2bMilestone_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2bMilestone_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "B2bContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "B2bMilestone_tenantId_scheduledAt_idx" ON "B2bMilestone"("tenantId", "scheduledAt");
CREATE INDEX "B2bMilestone_workspaceId_idx" ON "B2bMilestone"("workspaceId");

CREATE TABLE "B2bProposalTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "B2bProposalTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "B2bProposalTemplate_tenantId_slug_key" ON "B2bProposalTemplate"("tenantId", "slug");
CREATE INDEX "B2bProposalTemplate_category_idx" ON "B2bProposalTemplate"("category");

CREATE TABLE "B2bSlaCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "responseDueAt" DATETIME,
    "breachAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "B2bSlaCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2bSlaCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "B2bSlaCase_tenantId_status_idx" ON "B2bSlaCase"("tenantId", "status");
CREATE INDEX "B2bSlaCase_workspaceId_idx" ON "B2bSlaCase"("workspaceId");

CREATE TABLE "B2bSlaNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "B2bSlaNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "B2bSlaCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "B2bSlaNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "B2bSlaNote_caseId_createdAt_idx" ON "B2bSlaNote"("caseId", "createdAt");

-- Healthcare
CREATE TABLE "HcContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'patient',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HcContact_tenantId_lastName_idx" ON "HcContact"("tenantId", "lastName");

CREATE TABLE "HcPatientChart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chartNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedUserId" TEXT,
    "patientContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcPatientChart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcPatientChart_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HcPatientChart_patientContactId_fkey" FOREIGN KEY ("patientContactId") REFERENCES "HcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "HcPatientChart_tenantId_status_idx" ON "HcPatientChart"("tenantId", "status");
CREATE INDEX "HcPatientChart_tenantId_chartNumber_idx" ON "HcPatientChart"("tenantId", "chartNumber");

CREATE TABLE "HcAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcAppointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAppointment_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "HcContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HcAppointment_tenantId_scheduledAt_idx" ON "HcAppointment"("tenantId", "scheduledAt");
CREATE INDEX "HcAppointment_chartId_idx" ON "HcAppointment"("chartId");

CREATE TABLE "HcReferralTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcReferralTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HcReferralTemplate_tenantId_slug_key" ON "HcReferralTemplate"("tenantId", "slug");
CREATE INDEX "HcReferralTemplate_category_idx" ON "HcReferralTemplate"("category");

CREATE TABLE "HcAuditCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcAuditCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAuditCase_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HcAuditCase_tenantId_status_idx" ON "HcAuditCase"("tenantId", "status");
CREATE INDEX "HcAuditCase_chartId_idx" ON "HcAuditCase"("chartId");

CREATE TABLE "HcAuditNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HcAuditNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "HcAuditCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAuditNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HcAuditNote_caseId_createdAt_idx" ON "HcAuditNote"("caseId", "createdAt");
