ALTER TABLE "User" ADD COLUMN "panelWorkspaceTrialStartedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "panelWorkspaceDay5EmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "panelWorkspaceDay7ReminderSent" BOOLEAN NOT NULL DEFAULT false;
