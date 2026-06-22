-- Deepen Accounting vertical workflows beyond Phase 1 parity.

ALTER TABLE "AcDocumentRequest" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'source_document';
ALTER TABLE "AcDocumentRequest" ADD COLUMN "vaultStatus" TEXT NOT NULL DEFAULT 'requested';
ALTER TABLE "AcDocumentRequest" ADD COLUMN "fiscalYear" TEXT;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "periodStart" DATETIME;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "periodEnd" DATETIME;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "dueAt" DATETIME;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "reminderAt" DATETIME;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "AcDocumentRequest" ADD COLUMN "receivedAt" DATETIME;

ALTER TABLE "AcFilingDeadline" ADD COLUMN "filingType" TEXT NOT NULL DEFAULT 'corporate_tax';
ALTER TABLE "AcFilingDeadline" ADD COLUMN "taxPeriod" TEXT NOT NULL DEFAULT 'current';
ALTER TABLE "AcFilingDeadline" ADD COLUMN "periodStart" DATETIME;
ALTER TABLE "AcFilingDeadline" ADD COLUMN "periodEnd" DATETIME;
ALTER TABLE "AcFilingDeadline" ADD COLUMN "reminderAt" DATETIME;
ALTER TABLE "AcFilingDeadline" ADD COLUMN "filedAt" DATETIME;

ALTER TABLE "AcClientEntity" ADD COLUMN "taxIdentifierType" TEXT NOT NULL DEFAULT 'business_number';
ALTER TABLE "AcClientEntity" ADD COLUMN "taxIdentifier" TEXT;
ALTER TABLE "AcClientEntity" ADD COLUMN "jurisdiction" TEXT;
ALTER TABLE "AcClientEntity" ADD COLUMN "fiscalYearEnd" TEXT;
ALTER TABLE "AcClientEntity" ADD COLUMN "engagementType" TEXT NOT NULL DEFAULT 'year_end';
ALTER TABLE "AcClientEntity" ADD COLUMN "parentEntityId" TEXT REFERENCES "AcClientEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AcDocumentExchangeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcDocumentExchangeRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentExchangeRecord_documentRequestId_fkey" FOREIGN KEY ("documentRequestId") REFERENCES "AcDocumentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentExchangeRecord_clientEntityId_fkey" FOREIGN KEY ("clientEntityId") REFERENCES "AcClientEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentExchangeRecord_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "AcContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AcDocumentExchangeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
