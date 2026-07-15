-- Tenant UI policies + default light theme + Softwire 120-day workspace hides

CREATE TABLE "TenantUiPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUiPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantUiPolicy_tenantId_policyKey_key" ON "TenantUiPolicy"("tenantId", "policyKey");
CREATE INDEX "TenantUiPolicy_tenantId_endsAt_idx" ON "TenantUiPolicy"("tenantId", "endsAt");

ALTER TABLE "TenantUiPolicy" ADD CONSTRAINT "TenantUiPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ALTER COLUMN "uiThemeVersion" SET DEFAULT 'light';
UPDATE "User" SET "uiThemeVersion" = 'light' WHERE "uiThemeVersion" = 'dark';

-- Softwire accountant tenant policies (120 days from deploy)
INSERT INTO "TenantUiPolicy" ("id", "tenantId", "policyKey", "startsAt", "endsAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  policy.key,
  NOW(),
  NOW() + INTERVAL '120 days',
  NOW(),
  NOW()
FROM "Tenant" t
CROSS JOIN (
  VALUES
    ('workspace.messaging'),
    ('workspace.contacts'),
    ('workspace.crm'),
    ('sidebar.platformToolsCollapsed')
) AS policy(key)
WHERE EXISTS (
  SELECT 1
  FROM "User" u
  WHERE u."tenantId" = t.id
    AND lower(u.email) LIKE '%@softwire-accountant.ae'
)
ON CONFLICT ("tenantId", "policyKey") DO UPDATE
SET "endsAt" = EXCLUDED."endsAt", "updatedAt" = NOW();
