-- Bespoke Mail demo workspace persistence (anonymous session state)
CREATE TABLE "BespokeDemoWorkspace" (
    "id" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BespokeDemoWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BespokeDemoWorkspace_useCaseId_sessionKey_key" ON "BespokeDemoWorkspace"("useCaseId", "sessionKey");
CREATE INDEX "BespokeDemoWorkspace_sessionKey_idx" ON "BespokeDemoWorkspace"("sessionKey");
