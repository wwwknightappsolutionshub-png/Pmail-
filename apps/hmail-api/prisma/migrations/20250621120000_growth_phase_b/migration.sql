-- Prohost Growth Phase B — day-one content bundle

CREATE TABLE "GrowthContentAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "bodyJson" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthContentAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthContentAsset_tenantId_idx" ON "GrowthContentAsset"("tenantId");
CREATE INDEX "GrowthContentAsset_workspaceId_assetType_idx" ON "GrowthContentAsset"("workspaceId", "assetType");
CREATE INDEX "GrowthContentAsset_workspaceId_sortOrder_idx" ON "GrowthContentAsset"("workspaceId", "sortOrder");

ALTER TABLE "GrowthContentAsset" ADD CONSTRAINT "GrowthContentAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
