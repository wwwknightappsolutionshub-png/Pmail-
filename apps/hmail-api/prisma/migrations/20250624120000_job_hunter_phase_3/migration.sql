-- Job Hunter Phase 3 — application history

CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mailAccountId" TEXT,
    "company" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "imapFolder" TEXT,
    "messageUid" INTEGER,
    "messageMessageId" TEXT,
    "threadHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplication_userId_appliedAt_idx" ON "JobApplication"("userId", "appliedAt" DESC);
CREATE INDEX "JobApplication_userId_status_idx" ON "JobApplication"("userId", "status");
CREATE UNIQUE INDEX "JobApplication_userId_imapFolder_messageUid_key" ON "JobApplication"("userId", "imapFolder", "messageUid");
CREATE UNIQUE INDEX "JobApplication_userId_messageMessageId_key" ON "JobApplication"("userId", "messageMessageId");

ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_mailAccountId_fkey" FOREIGN KEY ("mailAccountId") REFERENCES "UserMailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
