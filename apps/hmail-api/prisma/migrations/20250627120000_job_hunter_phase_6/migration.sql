-- Job Hunter Phase 6: job site links

CREATE TABLE "UserJobSiteLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJobSiteLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserJobSiteLink_userId_sortOrder_idx" ON "UserJobSiteLink"("userId", "sortOrder");

ALTER TABLE "UserJobSiteLink" ADD CONSTRAINT "UserJobSiteLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
