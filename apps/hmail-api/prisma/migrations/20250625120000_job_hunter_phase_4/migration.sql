-- Job Hunter Phase 4 — CV builder documents

CREATE TABLE "JobHunterCvDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "role" TEXT,
    "industry" TEXT,
    "contentJson" TEXT NOT NULL,
    "pdfStoragePath" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobHunterCvDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobHunterCvDocument_userId_updatedAt_idx" ON "JobHunterCvDocument"("userId", "updatedAt" DESC);

ALTER TABLE "JobHunterCvDocument" ADD CONSTRAINT "JobHunterCvDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
