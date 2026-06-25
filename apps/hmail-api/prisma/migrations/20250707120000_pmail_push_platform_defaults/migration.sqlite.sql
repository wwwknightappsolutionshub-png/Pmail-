ALTER TABLE "User" ADD COLUMN "mailPushEnabled" BOOLEAN NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "PmailPlatformConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mailPushEnabled" BOOLEAN NOT NULL DEFAULT 1,
    "mailPushDefaultForUsers" BOOLEAN NOT NULL DEFAULT 1,
    "pwaPushAutoSubscribe" BOOLEAN NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

INSERT OR IGNORE INTO "PmailPlatformConfig" ("id", "mailPushEnabled", "mailPushDefaultForUsers", "pwaPushAutoSubscribe", "updatedAt")
VALUES ('default', 1, 1, 1, CURRENT_TIMESTAMP);
