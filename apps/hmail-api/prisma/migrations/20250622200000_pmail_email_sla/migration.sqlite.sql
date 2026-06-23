-- PMail+ email SLA tracker (Phase 2.1)
CREATE TABLE "UserMailSlaSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "responseHours" INTEGER NOT NULL DEFAULT 24,
    "atRiskRatio" REAL NOT NULL DEFAULT 0.8,
    "scanFolder" TEXT NOT NULL DEFAULT 'INBOX',
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserMailSlaSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserMailSlaSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MailSlaThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadKey" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "messageUid" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromDisplay" TEXT NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "referencesHeader" TEXT,
    "firstInboundAt" DATETIME NOT NULL,
    "lastInboundAt" DATETIME NOT NULL,
    "deadlineAt" DATETIME NOT NULL,
    "atRiskAt" DATETIME NOT NULL,
    "respondedAt" DATETIME,
    "dismissedAt" DATETIME,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MailSlaThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailSlaThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MailSlaAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "acknowledgedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailSlaAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailSlaAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailSlaAlert_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MailSlaThread"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MailSlaReportExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "lastDownloadAt" DATETIME,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailSlaReportExport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailSlaReportExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MailSlaThread_userId_threadKey_key" ON "MailSlaThread"("userId", "threadKey");
CREATE INDEX "MailSlaThread_tenantId_idx" ON "MailSlaThread"("tenantId");
CREATE INDEX "MailSlaThread_userId_status_idx" ON "MailSlaThread"("userId", "status");
CREATE INDEX "MailSlaThread_userId_deadlineAt_idx" ON "MailSlaThread"("userId", "deadlineAt");
CREATE INDEX "UserMailSlaSettings_tenantId_idx" ON "UserMailSlaSettings"("tenantId");
CREATE INDEX "MailSlaAlert_tenantId_idx" ON "MailSlaAlert"("tenantId");
CREATE INDEX "MailSlaAlert_userId_acknowledgedAt_idx" ON "MailSlaAlert"("userId", "acknowledgedAt");
CREATE INDEX "MailSlaAlert_threadId_alertType_idx" ON "MailSlaAlert"("threadId", "alertType");
CREATE UNIQUE INDEX "MailSlaReportExport_downloadToken_key" ON "MailSlaReportExport"("downloadToken");
CREATE INDEX "MailSlaReportExport_tenantId_idx" ON "MailSlaReportExport"("tenantId");
CREATE INDEX "MailSlaReportExport_userId_createdAt_idx" ON "MailSlaReportExport"("userId", "createdAt");
