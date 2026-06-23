-- PMail+ multi-inbox v1 (Phase 1.3)
CREATE TABLE "UserMailAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "providerPreset" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "encryptedMailPassword" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMailAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMailAccount_userId_email_key" ON "UserMailAccount"("userId", "email");
CREATE INDEX "UserMailAccount_userId_idx" ON "UserMailAccount"("userId");

ALTER TABLE "UserMailAccount" ADD CONSTRAINT "UserMailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session" ADD COLUMN "activeMailAccountId" TEXT;
CREATE INDEX "Session_activeMailAccountId_idx" ON "Session"("activeMailAccountId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_activeMailAccountId_fkey" FOREIGN KEY ("activeMailAccountId") REFERENCES "UserMailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
