-- Auto Reply complimentary activation + upsell tracking
ALTER TABLE "UserComposeSettings" ADD COLUMN "autoReplyComplimentaryStartedAt" TIMESTAMP(3);
ALTER TABLE "UserComposeSettings" ADD COLUMN "autoReplyUpsellEmailSent" BOOLEAN NOT NULL DEFAULT false;
