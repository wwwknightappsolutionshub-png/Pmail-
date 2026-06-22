CREATE TABLE "ReContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReContact_tenantId_lastName_idx" ON "ReContact"("tenantId", "lastName");

CREATE TABLE "ReListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "mlsNumber" TEXT,
    "listPriceCents" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedUserId" TEXT,
    "sellerContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReListing_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReListing_sellerContactId_fkey" FOREIGN KEY ("sellerContactId") REFERENCES "ReContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ReListing_tenantId_status_idx" ON "ReListing"("tenantId", "status");
CREATE INDEX "ReListing_tenantId_mlsNumber_idx" ON "ReListing"("tenantId", "mlsNumber");

CREATE TABLE "ReShowing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReShowing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReShowing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ReListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReShowing_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ReContact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReShowing_tenantId_scheduledAt_idx" ON "ReShowing"("tenantId", "scheduledAt");
CREATE INDEX "ReShowing_listingId_idx" ON "ReShowing"("listingId");

CREATE TABLE "ReQuickReplyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReQuickReplyTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReQuickReplyTemplate_tenantId_slug_key" ON "ReQuickReplyTemplate"("tenantId", "slug");
CREATE INDEX "ReQuickReplyTemplate_category_idx" ON "ReQuickReplyTemplate"("category");

CREATE TABLE "ReDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offer',
    "offerAmountCents" INTEGER,
    "buyerContactId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ReListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReDeal_buyerContactId_fkey" FOREIGN KEY ("buyerContactId") REFERENCES "ReContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ReDeal_tenantId_status_idx" ON "ReDeal"("tenantId", "status");
CREATE INDEX "ReDeal_listingId_idx" ON "ReDeal"("listingId");

CREATE TABLE "ReDealNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReDealNote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ReDeal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReDealNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ReDealNote_dealId_createdAt_idx" ON "ReDealNote"("dealId", "createdAt");
