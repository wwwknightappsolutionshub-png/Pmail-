-- Phase F: Growth SaaS packaging (settings, team, plan)

CREATE TABLE "GrowthWorkspaceSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planSlug" TEXT NOT NULL DEFAULT 'starter',
    "notifyEmail" TEXT,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthWorkspaceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthTeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'marketer',
    "hostingAccountId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GrowthWorkspaceSettings_workspaceId_key" ON "GrowthWorkspaceSettings"("workspaceId");
CREATE INDEX "GrowthWorkspaceSettings_tenantId_idx" ON "GrowthWorkspaceSettings"("tenantId");
CREATE UNIQUE INDEX "GrowthTeamMember_workspaceId_email_key" ON "GrowthTeamMember"("workspaceId", "email");
CREATE INDEX "GrowthTeamMember_tenantId_idx" ON "GrowthTeamMember"("tenantId");
CREATE INDEX "GrowthTeamMember_workspaceId_role_idx" ON "GrowthTeamMember"("workspaceId", "role");

ALTER TABLE "GrowthWorkspaceSettings" ADD CONSTRAINT "GrowthWorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthTeamMember" ADD CONSTRAINT "GrowthTeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
