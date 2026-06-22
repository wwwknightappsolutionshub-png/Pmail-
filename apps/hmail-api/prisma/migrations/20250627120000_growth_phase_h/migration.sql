-- Phase H: Growth optimization insights

CREATE TABLE "GrowthOptimizationInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actionLabel" TEXT,
    "actionTarget" TEXT,
    "metricsJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'open',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthOptimizationInsight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GrowthOptimizationInsight_workspaceId_status_sortOrder_idx" ON "GrowthOptimizationInsight"("workspaceId", "status", "sortOrder");
CREATE INDEX "GrowthOptimizationInsight_tenantId_idx" ON "GrowthOptimizationInsight"("tenantId");

ALTER TABLE "GrowthOptimizationInsight" ADD CONSTRAINT "GrowthOptimizationInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "GrowthWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
