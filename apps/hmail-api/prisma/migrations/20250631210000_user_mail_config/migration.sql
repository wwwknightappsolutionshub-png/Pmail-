-- CreateTable
CREATE TABLE "UserMailConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerPreset" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL DEFAULT 465,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMailConfig_userId_key" ON "UserMailConfig"("userId");

-- AddForeignKey
ALTER TABLE "UserMailConfig" ADD CONSTRAINT "UserMailConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
