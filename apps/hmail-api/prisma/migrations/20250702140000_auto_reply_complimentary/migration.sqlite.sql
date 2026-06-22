-- Auto Reply complimentary activation + upsell tracking
ALTER TABLE "UserComposeSettings" ADD COLUMN "autoReplyComplimentaryStartedAt" DATETIME;
ALTER TABLE "UserComposeSettings" ADD COLUMN "autoReplyUpsellEmailSent" BOOLEAN NOT NULL DEFAULT 0;
