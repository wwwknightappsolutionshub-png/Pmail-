-- PMail+ inbox cleanup & unsubscribe (Phase 1.4)
CREATE TABLE "MailUnsubscribeLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "messageUid" INTEGER NOT NULL,
    "unsubscribeUrl" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailUnsubscribeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MailUnsubscribeLog_tenantId_idx" ON "MailUnsubscribeLog"("tenantId");
CREATE INDEX "MailUnsubscribeLog_userId_idx" ON "MailUnsubscribeLog"("userId");
CREATE INDEX "MailUnsubscribeLog_createdAt_idx" ON "MailUnsubscribeLog"("createdAt");

ALTER TABLE "MailUnsubscribeLog" ADD CONSTRAINT "MailUnsubscribeLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MailUnsubscribeLog" ADD CONSTRAINT "MailUnsubscribeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
