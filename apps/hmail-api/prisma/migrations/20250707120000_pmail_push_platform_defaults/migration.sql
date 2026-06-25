ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailPushEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "PmailPlatformConfig" (
    "id" TEXT NOT NULL,
    "mailPushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mailPushDefaultForUsers" BOOLEAN NOT NULL DEFAULT true,
    "pwaPushAutoSubscribe" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmailPlatformConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PmailPlatformConfig" ("id", "mailPushEnabled", "mailPushDefaultForUsers", "pwaPushAutoSubscribe", "updatedAt")
VALUES ('default', true, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
