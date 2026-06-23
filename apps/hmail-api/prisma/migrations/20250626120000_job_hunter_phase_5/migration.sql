-- Job Hunter Phase 5: User documents index for published CVs

CREATE TABLE "UserDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "jobHunterCvDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDocument_userId_isPinned_updatedAt_idx" ON "UserDocument"("userId", "isPinned" DESC, "updatedAt" DESC);
CREATE INDEX "UserDocument_userId_source_idx" ON "UserDocument"("userId", "source");
CREATE INDEX "UserDocument_jobHunterCvDocumentId_idx" ON "UserDocument"("jobHunterCvDocumentId");

ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserDocument" ADD CONSTRAINT "UserDocument_jobHunterCvDocumentId_fkey" FOREIGN KEY ("jobHunterCvDocumentId") REFERENCES "JobHunterCvDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
