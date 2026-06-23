-- PMail+ file vault (Phase 1.2)
CREATE TABLE "MailVaultFile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastDownloadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailVaultFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MailVaultFile_downloadToken_key" ON "MailVaultFile"("downloadToken");
CREATE INDEX "MailVaultFile_tenantId_idx" ON "MailVaultFile"("tenantId");
CREATE INDEX "MailVaultFile_userId_idx" ON "MailVaultFile"("userId");
CREATE INDEX "MailVaultFile_expiresAt_idx" ON "MailVaultFile"("expiresAt");

ALTER TABLE "MailVaultFile" ADD CONSTRAINT "MailVaultFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailVaultFile" ADD CONSTRAINT "MailVaultFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
