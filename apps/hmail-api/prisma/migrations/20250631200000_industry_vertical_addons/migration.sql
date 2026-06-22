-- Industry vertical add-on models (accounting, recruitment, b2b-services, healthcare)

-- Accounting
CREATE TABLE "AcContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcDocumentRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "referenceCode" TEXT,
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcDocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcClientEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "taxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "primaryContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcClientEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcFilingDeadline" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientEntityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcFilingDeadline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcSecureTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AcSecureTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcEntityNote" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcEntityNote_pkey" PRIMARY KEY ("id")
);

-- Recruitment
CREATE TABLE "RcContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RcContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RcRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clientCompany" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requisitionCode" TEXT,
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RcRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RcInterview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RcInterview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RcOutreachTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RcOutreachTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RcPlacement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "compensationCents" INTEGER,
    "candidateContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RcPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RcPlacementNote" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RcPlacementNote_pkey" PRIMARY KEY ("id")
);

-- B2B services
CREATE TABLE "B2bContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bWorkspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientDomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedUserId" TEXT,
    "clientContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bMilestone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bProposalTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bProposalTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bSlaCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "responseDueAt" TIMESTAMP(3),
    "breachAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bSlaCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bSlaNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "B2bSlaNote_pkey" PRIMARY KEY ("id")
);

-- Healthcare
CREATE TABLE "HcContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'patient',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HcContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HcPatientChart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chartNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedUserId" TEXT,
    "patientContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HcPatientChart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HcAppointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HcAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HcReferralTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HcReferralTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HcAuditCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "severity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HcAuditCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HcAuditNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HcAuditNote_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "AcContact_tenantId_lastName_idx" ON "AcContact"("tenantId", "lastName");
CREATE INDEX "AcDocumentRequest_tenantId_status_idx" ON "AcDocumentRequest"("tenantId", "status");
CREATE INDEX "AcDocumentRequest_tenantId_referenceCode_idx" ON "AcDocumentRequest"("tenantId", "referenceCode");
CREATE INDEX "AcFilingDeadline_tenantId_dueAt_idx" ON "AcFilingDeadline"("tenantId", "dueAt");
CREATE INDEX "AcFilingDeadline_clientEntityId_idx" ON "AcFilingDeadline"("clientEntityId");
CREATE UNIQUE INDEX "AcSecureTemplate_tenantId_slug_key" ON "AcSecureTemplate"("tenantId", "slug");
CREATE INDEX "AcSecureTemplate_category_idx" ON "AcSecureTemplate"("category");
CREATE INDEX "AcClientEntity_tenantId_status_idx" ON "AcClientEntity"("tenantId", "status");
CREATE INDEX "AcClientEntity_tenantId_taxId_idx" ON "AcClientEntity"("tenantId", "taxId");
CREATE INDEX "AcEntityNote_entityId_createdAt_idx" ON "AcEntityNote"("entityId", "createdAt");

CREATE INDEX "RcContact_tenantId_lastName_idx" ON "RcContact"("tenantId", "lastName");
CREATE INDEX "RcRole_tenantId_status_idx" ON "RcRole"("tenantId", "status");
CREATE INDEX "RcRole_tenantId_requisitionCode_idx" ON "RcRole"("tenantId", "requisitionCode");
CREATE INDEX "RcInterview_tenantId_scheduledAt_idx" ON "RcInterview"("tenantId", "scheduledAt");
CREATE INDEX "RcInterview_roleId_idx" ON "RcInterview"("roleId");
CREATE UNIQUE INDEX "RcOutreachTemplate_tenantId_slug_key" ON "RcOutreachTemplate"("tenantId", "slug");
CREATE INDEX "RcOutreachTemplate_category_idx" ON "RcOutreachTemplate"("category");
CREATE INDEX "RcPlacement_tenantId_status_idx" ON "RcPlacement"("tenantId", "status");
CREATE INDEX "RcPlacement_roleId_idx" ON "RcPlacement"("roleId");
CREATE INDEX "RcPlacementNote_placementId_createdAt_idx" ON "RcPlacementNote"("placementId", "createdAt");

CREATE INDEX "B2bContact_tenantId_lastName_idx" ON "B2bContact"("tenantId", "lastName");
CREATE INDEX "B2bWorkspace_tenantId_status_idx" ON "B2bWorkspace"("tenantId", "status");
CREATE INDEX "B2bWorkspace_tenantId_clientDomain_idx" ON "B2bWorkspace"("tenantId", "clientDomain");
CREATE INDEX "B2bMilestone_tenantId_scheduledAt_idx" ON "B2bMilestone"("tenantId", "scheduledAt");
CREATE INDEX "B2bMilestone_workspaceId_idx" ON "B2bMilestone"("workspaceId");
CREATE UNIQUE INDEX "B2bProposalTemplate_tenantId_slug_key" ON "B2bProposalTemplate"("tenantId", "slug");
CREATE INDEX "B2bProposalTemplate_category_idx" ON "B2bProposalTemplate"("category");
CREATE INDEX "B2bSlaCase_tenantId_status_idx" ON "B2bSlaCase"("tenantId", "status");
CREATE INDEX "B2bSlaCase_workspaceId_idx" ON "B2bSlaCase"("workspaceId");
CREATE INDEX "B2bSlaNote_caseId_createdAt_idx" ON "B2bSlaNote"("caseId", "createdAt");

CREATE INDEX "HcContact_tenantId_lastName_idx" ON "HcContact"("tenantId", "lastName");
CREATE INDEX "HcPatientChart_tenantId_status_idx" ON "HcPatientChart"("tenantId", "status");
CREATE INDEX "HcPatientChart_tenantId_chartNumber_idx" ON "HcPatientChart"("tenantId", "chartNumber");
CREATE INDEX "HcAppointment_tenantId_scheduledAt_idx" ON "HcAppointment"("tenantId", "scheduledAt");
CREATE INDEX "HcAppointment_chartId_idx" ON "HcAppointment"("chartId");
CREATE UNIQUE INDEX "HcReferralTemplate_tenantId_slug_key" ON "HcReferralTemplate"("tenantId", "slug");
CREATE INDEX "HcReferralTemplate_category_idx" ON "HcReferralTemplate"("category");
CREATE INDEX "HcAuditCase_tenantId_status_idx" ON "HcAuditCase"("tenantId", "status");
CREATE INDEX "HcAuditCase_chartId_idx" ON "HcAuditCase"("chartId");
CREATE INDEX "HcAuditNote_caseId_createdAt_idx" ON "HcAuditNote"("caseId", "createdAt");

-- Foreign keys
ALTER TABLE "AcContact" ADD CONSTRAINT "AcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcDocumentRequest" ADD CONSTRAINT "AcDocumentRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcDocumentRequest" ADD CONSTRAINT "AcDocumentRequest_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcDocumentRequest" ADD CONSTRAINT "AcDocumentRequest_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "AcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcClientEntity" ADD CONSTRAINT "AcClientEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcClientEntity" ADD CONSTRAINT "AcClientEntity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "AcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcFilingDeadline" ADD CONSTRAINT "AcFilingDeadline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcFilingDeadline" ADD CONSTRAINT "AcFilingDeadline_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "AcClientEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcFilingDeadline" ADD CONSTRAINT "AcFilingDeadline_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AcContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcSecureTemplate" ADD CONSTRAINT "AcSecureTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcEntityNote" ADD CONSTRAINT "AcEntityNote_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "AcClientEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcEntityNote" ADD CONSTRAINT "AcEntityNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RcContact" ADD CONSTRAINT "RcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcRole" ADD CONSTRAINT "RcRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcRole" ADD CONSTRAINT "RcRole_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RcRole" ADD CONSTRAINT "RcRole_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "RcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RcInterview" ADD CONSTRAINT "RcInterview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcInterview" ADD CONSTRAINT "RcInterview_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcInterview" ADD CONSTRAINT "RcInterview_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RcContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcOutreachTemplate" ADD CONSTRAINT "RcOutreachTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcPlacement" ADD CONSTRAINT "RcPlacement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcPlacement" ADD CONSTRAINT "RcPlacement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcPlacement" ADD CONSTRAINT "RcPlacement_candidateContactId_fkey" FOREIGN KEY ("candidateContactId") REFERENCES "RcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RcPlacementNote" ADD CONSTRAINT "RcPlacementNote_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "RcPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RcPlacementNote" ADD CONSTRAINT "RcPlacementNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "B2bContact" ADD CONSTRAINT "B2bContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bWorkspace" ADD CONSTRAINT "B2bWorkspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bWorkspace" ADD CONSTRAINT "B2bWorkspace_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2bWorkspace" ADD CONSTRAINT "B2bWorkspace_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "B2bContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2bMilestone" ADD CONSTRAINT "B2bMilestone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bMilestone" ADD CONSTRAINT "B2bMilestone_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bMilestone" ADD CONSTRAINT "B2bMilestone_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "B2bContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bProposalTemplate" ADD CONSTRAINT "B2bProposalTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaCase" ADD CONSTRAINT "B2bSlaCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaCase" ADD CONSTRAINT "B2bSlaCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaNote" ADD CONSTRAINT "B2bSlaNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "B2bSlaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaNote" ADD CONSTRAINT "B2bSlaNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HcContact" ADD CONSTRAINT "HcContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcPatientChart" ADD CONSTRAINT "HcPatientChart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcPatientChart" ADD CONSTRAINT "HcPatientChart_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HcPatientChart" ADD CONSTRAINT "HcPatientChart_patientContactId_fkey" FOREIGN KEY ("patientContactId") REFERENCES "HcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HcAppointment" ADD CONSTRAINT "HcAppointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAppointment" ADD CONSTRAINT "HcAppointment_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAppointment" ADD CONSTRAINT "HcAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "HcContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcReferralTemplate" ADD CONSTRAINT "HcReferralTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAuditCase" ADD CONSTRAINT "HcAuditCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAuditCase" ADD CONSTRAINT "HcAuditCase_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAuditNote" ADD CONSTRAINT "HcAuditNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "HcAuditCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HcAuditNote" ADD CONSTRAINT "HcAuditNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
