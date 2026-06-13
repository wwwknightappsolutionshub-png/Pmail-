-- CreateTable
CREATE TABLE "MailContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailContactList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailContactListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailContactListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailContactGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailContactGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailContactGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailContact_userId_idx" ON "MailContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailContact_userId_email_key" ON "MailContact"("userId", "email");

-- CreateIndex
CREATE INDEX "MailContactList_userId_idx" ON "MailContactList"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailContactList_userId_name_key" ON "MailContactList"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MailContactListMember_listId_contactId_key" ON "MailContactListMember"("listId", "contactId");

-- CreateIndex
CREATE INDEX "MailContactGroup_userId_idx" ON "MailContactGroup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailContactGroup_userId_name_key" ON "MailContactGroup"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MailContactGroupMember_groupId_contactId_key" ON "MailContactGroupMember"("groupId", "contactId");

-- AddForeignKey
ALTER TABLE "MailContact" ADD CONSTRAINT "MailContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactList" ADD CONSTRAINT "MailContactList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactListMember" ADD CONSTRAINT "MailContactListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MailContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactListMember" ADD CONSTRAINT "MailContactListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MailContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactGroup" ADD CONSTRAINT "MailContactGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactGroupMember" ADD CONSTRAINT "MailContactGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MailContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailContactGroupMember" ADD CONSTRAINT "MailContactGroupMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MailContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
