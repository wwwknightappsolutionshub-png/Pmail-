-- Job Hunter Phase 8 — Apply Assist credits & queue
CREATE TABLE "JobApplyAssistCreditWallet" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplyAssistCreditWallet_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "JobApplyAssistLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "applicationId" TEXT,
    "queueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplyAssistLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplyAssistQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "jobUrl" TEXT,
    "careersEmail" TEXT,
    "company" TEXT,
    "targetRole" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "userDocumentId" TEXT,
    "prefilledPayloadJson" TEXT,
    "applicationId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplyAssistQueue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplyAssistCreditWallet_tenantId_idx" ON "JobApplyAssistCreditWallet"("tenantId");
CREATE INDEX "JobApplyAssistLedger_userId_createdAt_idx" ON "JobApplyAssistLedger"("userId", "createdAt");
CREATE INDEX "JobApplyAssistQueue_userId_status_idx" ON "JobApplyAssistQueue"("userId", "status");
CREATE INDEX "JobApplyAssistQueue_userId_createdAt_idx" ON "JobApplyAssistQueue"("userId", "createdAt");

ALTER TABLE "JobApplyAssistCreditWallet" ADD CONSTRAINT "JobApplyAssistCreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplyAssistCreditWallet" ADD CONSTRAINT "JobApplyAssistCreditWallet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplyAssistLedger" ADD CONSTRAINT "JobApplyAssistLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplyAssistQueue" ADD CONSTRAINT "JobApplyAssistQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplyAssistQueue" ADD CONSTRAINT "JobApplyAssistQueue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
