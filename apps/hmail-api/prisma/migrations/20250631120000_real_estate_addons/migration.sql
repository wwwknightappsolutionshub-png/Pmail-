-- Real estate add-on models (listing board, showings, quick replies, deal room)

CREATE TABLE "ReContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'buyer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReListing" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReShowing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReShowing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReQuickReplyTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReQuickReplyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReDeal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offer',
    "offerAmountCents" INTEGER,
    "buyerContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReDealNote" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReDealNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReContact_tenantId_lastName_idx" ON "ReContact"("tenantId", "lastName");
CREATE INDEX "ReListing_tenantId_status_idx" ON "ReListing"("tenantId", "status");
CREATE INDEX "ReListing_tenantId_mlsNumber_idx" ON "ReListing"("tenantId", "mlsNumber");
CREATE INDEX "ReShowing_tenantId_scheduledAt_idx" ON "ReShowing"("tenantId", "scheduledAt");
CREATE INDEX "ReShowing_listingId_idx" ON "ReShowing"("listingId");
CREATE UNIQUE INDEX "ReQuickReplyTemplate_tenantId_slug_key" ON "ReQuickReplyTemplate"("tenantId", "slug");
CREATE INDEX "ReQuickReplyTemplate_category_idx" ON "ReQuickReplyTemplate"("category");
CREATE INDEX "ReDeal_tenantId_status_idx" ON "ReDeal"("tenantId", "status");
CREATE INDEX "ReDeal_listingId_idx" ON "ReDeal"("listingId");
CREATE INDEX "ReDealNote_dealId_createdAt_idx" ON "ReDealNote"("dealId", "createdAt");

ALTER TABLE "ReContact" ADD CONSTRAINT "ReContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReListing" ADD CONSTRAINT "ReListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReListing" ADD CONSTRAINT "ReListing_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReListing" ADD CONSTRAINT "ReListing_sellerContactId_fkey" FOREIGN KEY ("sellerContactId") REFERENCES "ReContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReShowing" ADD CONSTRAINT "ReShowing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReShowing" ADD CONSTRAINT "ReShowing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ReListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReShowing" ADD CONSTRAINT "ReShowing_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ReContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReQuickReplyTemplate" ADD CONSTRAINT "ReQuickReplyTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReDeal" ADD CONSTRAINT "ReDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReDeal" ADD CONSTRAINT "ReDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ReListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReDeal" ADD CONSTRAINT "ReDeal_buyerContactId_fkey" FOREIGN KEY ("buyerContactId") REFERENCES "ReContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReDealNote" ADD CONSTRAINT "ReDealNote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "ReDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReDealNote" ADD CONSTRAINT "ReDealNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
