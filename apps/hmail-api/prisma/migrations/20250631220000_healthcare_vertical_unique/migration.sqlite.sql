-- Healthcare vertical uniqueness: referrals, care stages, callbacks, HIPAA access logs

ALTER TABLE "HcContact" ADD COLUMN "dateOfBirth" DATETIME;
ALTER TABLE "HcContact" ADD COLUMN "medicalRecordNumber" TEXT;
ALTER TABLE "HcContact" ADD COLUMN "preferredProvider" TEXT;

ALTER TABLE "HcPatientChart" ADD COLUMN "careStage" TEXT NOT NULL DEFAULT 'intake';
ALTER TABLE "HcPatientChart" ADD COLUMN "referralStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "HcPatientChart" ADD COLUMN "authorizationStatus" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "HcPatientChart" ADD COLUMN "lastContactAt" DATETIME;
ALTER TABLE "HcPatientChart" ADD COLUMN "callbackRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "HcAppointment" ADD COLUMN "appointmentType" TEXT NOT NULL DEFAULT 'consult';
ALTER TABLE "HcAppointment" ADD COLUMN "callbackStatus" TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE "HcAppointment" ADD COLUMN "noShowReason" TEXT;

ALTER TABLE "HcAuditCase" ADD COLUMN "accessReason" TEXT;
ALTER TABLE "HcAuditCase" ADD COLUMN "roleScope" TEXT;
ALTER TABLE "HcAuditCase" ADD COLUMN "exportRequestedAt" DATETIME;
ALTER TABLE "HcAuditCase" ADD COLUMN "resolvedAt" DATETIME;

CREATE TABLE "HcReferral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "patientContactId" TEXT,
    "providerContactId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "referralType" TEXT NOT NULL DEFAULT 'specialist',
    "specialty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "priority" TEXT NOT NULL DEFAULT 'routine',
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HcReferral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcReferral_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcReferral_patientContactId_fkey" FOREIGN KEY ("patientContactId") REFERENCES "HcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HcReferral_providerContactId_fkey" FOREIGN KEY ("providerContactId") REFERENCES "HcContact"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "HcAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "roleScope" TEXT NOT NULL,
    "ipAddress" TEXT,
    "exportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HcAccessLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAccessLog_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "HcPatientChart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HcAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HcContact_tenantId_medicalRecordNumber_idx" ON "HcContact"("tenantId", "medicalRecordNumber");
CREATE INDEX "HcPatientChart_tenantId_careStage_idx" ON "HcPatientChart"("tenantId", "careStage");
CREATE INDEX "HcPatientChart_tenantId_referralStatus_idx" ON "HcPatientChart"("tenantId", "referralStatus");
CREATE INDEX "HcAppointment_tenantId_callbackStatus_idx" ON "HcAppointment"("tenantId", "callbackStatus");
CREATE INDEX "HcReferral_tenantId_status_idx" ON "HcReferral"("tenantId", "status");
CREATE INDEX "HcReferral_tenantId_priority_idx" ON "HcReferral"("tenantId", "priority");
CREATE INDEX "HcReferral_chartId_idx" ON "HcReferral"("chartId");
CREATE INDEX "HcAccessLog_tenantId_createdAt_idx" ON "HcAccessLog"("tenantId", "createdAt");
CREATE INDEX "HcAccessLog_chartId_createdAt_idx" ON "HcAccessLog"("chartId", "createdAt");
CREATE INDEX "HcAccessLog_userId_createdAt_idx" ON "HcAccessLog"("userId", "createdAt");
