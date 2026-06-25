-- Track automatic refer-a-friend runs per connected mailbox (idempotent)
ALTER TABLE "UserMailAccount" ADD COLUMN "referralInviteSentAt" TIMESTAMP(3);
