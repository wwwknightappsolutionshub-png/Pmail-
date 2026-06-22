-- B2B vertical uniqueness: account health, deliverables, SOW versions, SLA events

ALTER TABLE "B2bContact" ADD COLUMN "company" TEXT;
ALTER TABLE "B2bContact" ADD COLUMN "title" TEXT;
ALTER TABLE "B2bContact" ADD COLUMN "decisionRole" TEXT;

ALTER TABLE "B2bWorkspace" ADD COLUMN "accountTier" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "B2bWorkspace" ADD COLUMN "arrCents" INTEGER;
ALTER TABLE "B2bWorkspace" ADD COLUMN "healthScore" INTEGER NOT NULL DEFAULT 75;
ALTER TABLE "B2bWorkspace" ADD COLUMN "brandColor" TEXT;
ALTER TABLE "B2bWorkspace" ADD COLUMN "routingDomain" TEXT;
ALTER TABLE "B2bWorkspace" ADD COLUMN "onboardingStage" TEXT NOT NULL DEFAULT 'kickoff';
ALTER TABLE "B2bWorkspace" ADD COLUMN "renewalDate" TIMESTAMP(3);

ALTER TABLE "B2bMilestone" ADD COLUMN "milestoneType" TEXT NOT NULL DEFAULT 'delivery';
ALTER TABLE "B2bMilestone" ADD COLUMN "phase" TEXT NOT NULL DEFAULT 'implementation';
ALTER TABLE "B2bMilestone" ADD COLUMN "ownerRole" TEXT;
ALTER TABLE "B2bMilestone" ADD COLUMN "deliverableUrl" TEXT;

ALTER TABLE "B2bSlaCase" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'p3';
ALTER TABLE "B2bSlaCase" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'support';
ALTER TABLE "B2bSlaCase" ADD COLUMN "responseTargetMinutes" INTEGER NOT NULL DEFAULT 240;
ALTER TABLE "B2bSlaCase" ADD COLUMN "resolutionTargetMinutes" INTEGER NOT NULL DEFAULT 1440;
ALTER TABLE "B2bSlaCase" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "B2bSlaCase" ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE TABLE "B2bDeliverable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'deliverable',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "dueAt" TIMESTAMP(3),
    "url" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bDeliverable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sowUrl" TEXT,
    "amountCents" INTEGER,
    "validUntil" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2bProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2bSlaEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "B2bSlaEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2bWorkspace_tenantId_accountTier_idx" ON "B2bWorkspace"("tenantId", "accountTier");
CREATE INDEX "B2bWorkspace_tenantId_healthScore_idx" ON "B2bWorkspace"("tenantId", "healthScore");
CREATE INDEX "B2bMilestone_tenantId_phase_idx" ON "B2bMilestone"("tenantId", "phase");
CREATE INDEX "B2bDeliverable_tenantId_status_idx" ON "B2bDeliverable"("tenantId", "status");
CREATE INDEX "B2bDeliverable_workspaceId_idx" ON "B2bDeliverable"("workspaceId");
CREATE INDEX "B2bProposal_tenantId_status_idx" ON "B2bProposal"("tenantId", "status");
CREATE INDEX "B2bProposal_workspaceId_idx" ON "B2bProposal"("workspaceId");
CREATE INDEX "B2bSlaCase_tenantId_severity_idx" ON "B2bSlaCase"("tenantId", "severity");
CREATE INDEX "B2bSlaEvent_tenantId_createdAt_idx" ON "B2bSlaEvent"("tenantId", "createdAt");
CREATE INDEX "B2bSlaEvent_caseId_createdAt_idx" ON "B2bSlaEvent"("caseId", "createdAt");

ALTER TABLE "B2bDeliverable" ADD CONSTRAINT "B2bDeliverable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bDeliverable" ADD CONSTRAINT "B2bDeliverable_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bProposal" ADD CONSTRAINT "B2bProposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bProposal" ADD CONSTRAINT "B2bProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "B2bWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bProposal" ADD CONSTRAINT "B2bProposal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "B2bSlaEvent" ADD CONSTRAINT "B2bSlaEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaEvent" ADD CONSTRAINT "B2bSlaEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "B2bSlaCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2bSlaEvent" ADD CONSTRAINT "B2bSlaEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
