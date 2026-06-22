-- Deepen Accounting vertical workflows beyond Phase 1 parity.

ALTER TABLE "AcDocumentRequest"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'source_document',
  ADD COLUMN "vaultStatus" TEXT NOT NULL DEFAULT 'requested',
  ADD COLUMN "fiscalYear" TEXT,
  ADD COLUMN "periodStart" TIMESTAMP(3),
  ADD COLUMN "periodEnd" TIMESTAMP(3),
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "reminderAt" TIMESTAMP(3),
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "receivedAt" TIMESTAMP(3);

ALTER TABLE "AcFilingDeadline"
  ADD COLUMN "filingType" TEXT NOT NULL DEFAULT 'corporate_tax',
  ADD COLUMN "taxPeriod" TEXT NOT NULL DEFAULT 'current',
  ADD COLUMN "periodStart" TIMESTAMP(3),
  ADD COLUMN "periodEnd" TIMESTAMP(3),
  ADD COLUMN "reminderAt" TIMESTAMP(3),
  ADD COLUMN "filedAt" TIMESTAMP(3);

ALTER TABLE "AcClientEntity"
  ADD COLUMN "taxIdentifierType" TEXT NOT NULL DEFAULT 'business_number',
  ADD COLUMN "taxIdentifier" TEXT,
  ADD COLUMN "jurisdiction" TEXT,
  ADD COLUMN "fiscalYearEnd" TEXT,
  ADD COLUMN "engagementType" TEXT NOT NULL DEFAULT 'year_end',
  ADD COLUMN "parentEntityId" TEXT;

CREATE TABLE "AcDocumentExchangeRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentRequestId" TEXT,
    "clientEntityId" TEXT,
    "contactId" TEXT,
    "userId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "action" TEXT NOT NULL DEFAULT 'uploaded',
    "channel" TEXT NOT NULL DEFAULT 'secure_portal',
    "documentName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'source_document',
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "ipAddress" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcDocumentExchangeRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AcDocumentRequest_tenantId_category_idx" ON "AcDocumentRequest"("tenantId", "category");
CREATE INDEX "AcDocumentRequest_tenantId_dueAt_idx" ON "AcDocumentRequest"("tenantId", "dueAt");
CREATE INDEX "AcFilingDeadline_tenantId_filingType_idx" ON "AcFilingDeadline"("tenantId", "filingType");
CREATE INDEX "AcFilingDeadline_tenantId_status_idx" ON "AcFilingDeadline"("tenantId", "status");
CREATE INDEX "AcClientEntity_tenantId_taxIdentifier_idx" ON "AcClientEntity"("tenantId", "taxIdentifier");
CREATE INDEX "AcClientEntity_parentEntityId_idx" ON "AcClientEntity"("parentEntityId");
CREATE INDEX "AcDocumentExchangeRecord_tenantId_occurredAt_idx" ON "AcDocumentExchangeRecord"("tenantId", "occurredAt");
CREATE INDEX "AcDocumentExchangeRecord_tenantId_status_idx" ON "AcDocumentExchangeRecord"("tenantId", "status");
CREATE INDEX "AcDocumentExchangeRecord_documentRequestId_idx" ON "AcDocumentExchangeRecord"("documentRequestId");
CREATE INDEX "AcDocumentExchangeRecord_clientEntityId_idx" ON "AcDocumentExchangeRecord"("clientEntityId");

ALTER TABLE "AcClientEntity" ADD CONSTRAINT "AcClientEntity_parentEntityId_fkey" FOREIGN KEY ("parentEntityId") REFERENCES "AcClientEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcDocumentExchangeRecord" ADD CONSTRAINT "AcDocumentExchangeRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcDocumentExchangeRecord" ADD CONSTRAINT "AcDocumentExchangeRecord_documentRequestId_fkey" FOREIGN KEY ("documentRequestId") REFERENCES "AcDocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcDocumentExchangeRecord" ADD CONSTRAINT "AcDocumentExchangeRecord_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "AcClientEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcDocumentExchangeRecord" ADD CONSTRAINT "AcDocumentExchangeRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcDocumentExchangeRecord" ADD CONSTRAINT "AcDocumentExchangeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
