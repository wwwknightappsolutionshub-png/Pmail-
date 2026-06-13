import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request, { type Agent } from "supertest";
import type { Express } from "express";
import { encryptSecret, hashToken } from "../src/lib/crypto.js";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedImmigrationTemplates } from "../src/services/templates.service.js";

resolveDatabaseUrl();

const prisma = new PrismaClient();

export async function resetTestDatabase(): Promise<void> {
  await prisma.complianceAuditLog.deleteMany();
  await prisma.portalDocumentRequest.deleteMany();
  await prisma.portalAccess.deleteMany();
  await prisma.matterDeadline.deleteMany();
  await prisma.mailMatterLink.deleteMany();
  await prisma.irccMailClassification.deleteMany();
  await prisma.matterChecklistItem.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.client.deleteMany();
  await prisma.scheduledMessage.deleteMany();
  await prisma.addonEmailLog.deleteMany();
  await prisma.tenantAddonTrial.deleteMany();
  await prisma.tenantAddonSubscription.deleteMany();
  await prisma.addonMarketing.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.paymentCheckout.deleteMany();
  await prisma.hostingPlanSubscription.deleteMany();
  await prisma.vpsInstance.deleteMany();
  await prisma.panelSession.deleteMany();
  await prisma.hostingAccount.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.platformAdmin.deleteMany();
  await prisma.siteSection.deleteMany();
  await prisma.hostingPlan.deleteMany();
  await prisma.session.deleteMany();
  await prisma.mailContactListMember.deleteMany();
  await prisma.mailContactGroupMember.deleteMany();
  await prisma.mailContactList.deleteMany();
  await prisma.mailContactGroup.deleteMany();
  await prisma.mailContact.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenantBranding.deleteMany();
  await prisma.tenantMailConfig.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.addon.deleteMany();
}

export async function seedTestTenant() {
  await seedAddonCatalog();
  await seedImmigrationTemplates();

  const tenant = await prisma.tenant.create({
    data: {
      slug: "test-firm",
      name: "Test Immigration Firm",
      branding: { create: { productName: "hmail" } },
      mail: { create: {} },
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "lawyer@testfirm.ca",
      displayName: "Test Lawyer",
    },
  });

  return { tenant, user };
}

export async function createAuthenticatedAgent(app: Express): Promise<{
  agent: Agent;
  tenant: Awaited<ReturnType<typeof seedTestTenant>>["tenant"];
  user: Awaited<ReturnType<typeof seedTestTenant>>["user"];
  token: string;
}> {
  const { tenant, user } = await seedTestTenant();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      encryptedMailPassword: encryptSecret("test-mail-password"),
      expiresAt,
    },
  });

  const agent = request.agent(app);
  const withAuth = {
    get: (path: string) => agent.get(path).set("Cookie", [`hmail_session=${token}`]),
    post: (path: string) => agent.post(path).set("Cookie", [`hmail_session=${token}`]),
    patch: (path: string) => agent.patch(path).set("Cookie", [`hmail_session=${token}`]),
    delete: (path: string) => agent.delete(path).set("Cookie", [`hmail_session=${token}`]),
  };

  return { agent: withAuth, tenant, user, token };
}

export async function grantAddonTrial(tenantId: string, slug: string): Promise<void> {
  const addon = await prisma.addon.findFirst({ where: { slug } });
  if (!addon) throw new Error(`Addon not found: ${slug}`);

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 7);

  await prisma.tenantAddonTrial.upsert({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
    create: { tenantId, addonId: addon.id, endsAt, status: "active" },
    update: { endsAt, status: "active" },
  });
}

export { prisma as testPrisma };
