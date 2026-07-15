CREATE TABLE "TenantUiPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantUiPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TenantUiPolicy_tenantId_policyKey_key" ON "TenantUiPolicy"("tenantId", "policyKey");
CREATE INDEX "TenantUiPolicy_tenantId_endsAt_idx" ON "TenantUiPolicy"("tenantId", "endsAt");

UPDATE "User" SET "uiThemeVersion" = 'light' WHERE "uiThemeVersion" = 'dark';

INSERT OR REPLACE INTO "TenantUiPolicy" ("id", "tenantId", "policyKey", "startsAt", "endsAt", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  t.id,
  policy.key,
  datetime('now'),
  datetime('now', '+120 days'),
  datetime('now'),
  datetime('now')
FROM "Tenant" t
CROSS JOIN (
  SELECT 'workspace.messaging' AS key
  UNION ALL SELECT 'workspace.contacts'
  UNION ALL SELECT 'workspace.crm'
  UNION ALL SELECT 'sidebar.platformToolsCollapsed'
) AS policy
WHERE EXISTS (
  SELECT 1
  FROM "User" u
  WHERE u."tenantId" = t.id
    AND lower(u.email) LIKE '%@softwire-accountant.ae'
);
