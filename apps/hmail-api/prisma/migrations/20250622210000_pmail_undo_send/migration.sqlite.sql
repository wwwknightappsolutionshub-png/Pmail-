-- PMail+ undo send (delayed outgoing mail with cancel window)
ALTER TABLE "UserComposeSettings" ADD COLUMN "undoSendSeconds" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "ScheduledMessage" ADD COLUMN "sendKind" TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE "ScheduledMessage" ADD COLUMN "payloadJson" TEXT;
