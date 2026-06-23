-- PMail+ e-sign from email (Phase 1.6)
CREATE TABLE "MailEsignRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'dropbox_sign',
    "providerRequestId" TEXT,
    "status" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "lastDownloadAt" DATETIME,
    "signerEmail" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "signingUrl" TEXT,
    "sourceFolder" TEXT,
    "sourceMessageUid" INTEGER,
    "sourcePartId" TEXT,
    "messageSubjectSnapshot" TEXT,
    "completedAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MailEsignRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MailEsignRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MailEsignRequest_downloadToken_key" ON "MailEsignRequest"("downloadToken");
CREATE INDEX "MailEsignRequest_tenantId_idx" ON "MailEsignRequest"("tenantId");
CREATE INDEX "MailEsignRequest_userId_status_idx" ON "MailEsignRequest"("userId", "status");
CREATE INDEX "MailEsignRequest_userId_createdAt_idx" ON "MailEsignRequest"("userId", "createdAt");
