-- Recruitment vertical uniqueness: candidate profiles, requisitions, submissions, campaigns, placements, references

ALTER TABLE "RcContact" ADD COLUMN "source" TEXT;
ALTER TABLE "RcContact" ADD COLUMN "currentCompany" TEXT;
ALTER TABLE "RcContact" ADD COLUMN "desiredRole" TEXT;
ALTER TABLE "RcContact" ADD COLUMN "salaryExpectationCents" INTEGER;
ALTER TABLE "RcContact" ADD COLUMN "availabilityDate" DATETIME;
ALTER TABLE "RcContact" ADD COLUMN "candidateStage" TEXT NOT NULL DEFAULT 'sourced';
ALTER TABLE "RcContact" ADD COLUMN "lastContactedAt" DATETIME;

ALTER TABLE "RcRole" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "RcRole" ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'full_time';
ALTER TABLE "RcRole" ADD COLUMN "location" TEXT;
ALTER TABLE "RcRole" ADD COLUMN "remotePolicy" TEXT NOT NULL DEFAULT 'hybrid';
ALTER TABLE "RcRole" ADD COLUMN "salaryMinCents" INTEGER;
ALTER TABLE "RcRole" ADD COLUMN "salaryMaxCents" INTEGER;
ALTER TABLE "RcRole" ADD COLUMN "targetStartDate" DATETIME;
ALTER TABLE "RcRole" ADD COLUMN "pipelineStage" TEXT NOT NULL DEFAULT 'intake';

ALTER TABLE "RcInterview" ADD COLUMN "interviewType" TEXT NOT NULL DEFAULT 'phone_screen';
ALTER TABLE "RcInterview" ADD COLUMN "roundNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RcInterview" ADD COLUMN "interviewerName" TEXT;
ALTER TABLE "RcInterview" ADD COLUMN "feedbackStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "RcInterview" ADD COLUMN "score" INTEGER;
ALTER TABLE "RcInterview" ADD COLUMN "outcomeReason" TEXT;

ALTER TABLE "RcPlacement" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "RcPlacement" ADD COLUMN "offerAcceptedAt" DATETIME;
ALTER TABLE "RcPlacement" ADD COLUMN "recruiterFeeCents" INTEGER;
ALTER TABLE "RcPlacement" ADD COLUMN "guaranteeEndDate" DATETIME;
ALTER TABLE "RcPlacement" ADD COLUMN "onboardingStatus" TEXT NOT NULL DEFAULT 'not_started';

CREATE TABLE "RcCandidateSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'submitted',
    "source" TEXT,
    "score" INTEGER,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcCandidateSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcCandidateSubmission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcCandidateSubmission_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RcContact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RcOutreachCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "audience" TEXT NOT NULL DEFAULT 'sourced_candidates',
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "launchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcOutreachCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcOutreachCampaign_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RcRole"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RcOutreachCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RcReferenceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "placementId" TEXT,
    "userId" TEXT NOT NULL,
    "refereeName" TEXT NOT NULL,
    "refereeEmail" TEXT,
    "relationship" TEXT,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RcReferenceCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcReferenceCheck_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RcContact"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RcReferenceCheck_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "RcPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RcReferenceCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RcContact_tenantId_candidateStage_idx" ON "RcContact"("tenantId", "candidateStage");
CREATE INDEX "RcRole_tenantId_priority_idx" ON "RcRole"("tenantId", "priority");
CREATE INDEX "RcRole_tenantId_pipelineStage_idx" ON "RcRole"("tenantId", "pipelineStage");
CREATE INDEX "RcInterview_tenantId_feedbackStatus_idx" ON "RcInterview"("tenantId", "feedbackStatus");
CREATE INDEX "RcPlacement_tenantId_onboardingStatus_idx" ON "RcPlacement"("tenantId", "onboardingStatus");
CREATE INDEX "RcCandidateSubmission_tenantId_stage_idx" ON "RcCandidateSubmission"("tenantId", "stage");
CREATE INDEX "RcCandidateSubmission_roleId_idx" ON "RcCandidateSubmission"("roleId");
CREATE INDEX "RcCandidateSubmission_contactId_idx" ON "RcCandidateSubmission"("contactId");
CREATE INDEX "RcOutreachCampaign_tenantId_status_idx" ON "RcOutreachCampaign"("tenantId", "status");
CREATE INDEX "RcOutreachCampaign_roleId_idx" ON "RcOutreachCampaign"("roleId");
CREATE INDEX "RcReferenceCheck_tenantId_status_idx" ON "RcReferenceCheck"("tenantId", "status");
CREATE INDEX "RcReferenceCheck_contactId_idx" ON "RcReferenceCheck"("contactId");
CREATE INDEX "RcReferenceCheck_placementId_idx" ON "RcReferenceCheck"("placementId");
