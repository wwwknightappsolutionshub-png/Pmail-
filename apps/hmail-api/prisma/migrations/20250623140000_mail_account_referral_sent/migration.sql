-- Track automatic refer-a-friend runs per connected mailbox (idempotent)
ALTER TABLE "UserMailAccount" ADD COLUMN IF NOT EXISTS "referralInviteSentAt" TIMESTAMP(3);
