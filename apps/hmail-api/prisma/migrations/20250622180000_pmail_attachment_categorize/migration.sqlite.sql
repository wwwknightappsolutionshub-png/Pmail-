-- PMail+ attachment auto-categorize (Phase 1.5)
CREATE TABLE "CategorizedMailAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "messageUid" INTEGER NOT NULL,
    "partId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "categorySource" TEXT NOT NULL DEFAULT 'auto',
    "messageSubject" TEXT NOT NULL,
    "messageFrom" TEXT NOT NULL,
    "messageDate" DATETIME NOT NULL,
    "vaultFileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategorizedMailAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategorizedMailAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategorizedMailAttachment_vaultFileId_fkey" FOREIGN KEY ("vaultFileId") REFERENCES "MailVaultFile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CategorizedMailAttachment_userId_folder_messageUid_partId_key" ON "CategorizedMailAttachment"("userId", "folder", "messageUid", "partId");
CREATE INDEX "CategorizedMailAttachment_tenantId_idx" ON "CategorizedMailAttachment"("tenantId");
CREATE INDEX "CategorizedMailAttachment_userId_category_idx" ON "CategorizedMailAttachment"("userId", "category");
CREATE INDEX "CategorizedMailAttachment_userId_messageDate_idx" ON "CategorizedMailAttachment"("userId", "messageDate");
