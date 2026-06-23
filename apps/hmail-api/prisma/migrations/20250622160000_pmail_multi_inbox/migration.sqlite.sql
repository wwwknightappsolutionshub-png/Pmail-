-- PMail+ multi-inbox v1 (Phase 1.3)
CREATE TABLE "UserMailAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "providerPreset" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecure" BOOLEAN NOT NULL DEFAULT 1,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT 1,
    "encryptedMailPassword" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserMailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserMailAccount_userId_email_key" ON "UserMailAccount"("userId", "email");
CREATE INDEX "UserMailAccount_userId_idx" ON "UserMailAccount"("userId");

ALTER TABLE "Session" ADD COLUMN "activeMailAccountId" TEXT REFERENCES "UserMailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Session_activeMailAccountId_idx" ON "Session"("activeMailAccountId");
