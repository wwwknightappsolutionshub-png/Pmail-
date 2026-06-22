-- Per-user selected business workspace vertical for post-login provisioning.

ALTER TABLE "User" ADD COLUMN "businessVertical" TEXT;

CREATE INDEX "User_businessVertical_idx" ON "User"("businessVertical");
