import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { completePaymentCheckout } from "../src/services/payment.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { createPanelAgent, grantAddonTrial, resetTestDatabase, testPrisma } from "./helpers.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";

vi.mock("../src/services/platform-email.service.js", () => ({
  notifyInternalAddress: vi.fn().mockResolvedValue(undefined),
  sendPlatformEmail: vi.fn().mockResolvedValue(undefined),
  sendTemplatedPlatformEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function createSuperAdminAgent() {
  const email = "super-growth@test.local";
  const password = "super-admin-pass12";
  const admin = await testPrisma.platformAdmin.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: "Super Admin",
      role: "super_admin",
    },
  });

  const token = randomUUID();
  await testPrisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const agent = request.agent(app);
  return {
    agent: {
      get: (path: string) => agent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      post: (path: string) => agent.post(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      patch: (path: string) => agent.patch(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      delete: (path: string) => agent.delete(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    },
  };
}

const WIZARD_STEP1 = {
  businessName: "Gating Co",
  industry: "Services",
  website: "",
  serviceArea: "Toronto",
  productsServices: "Consulting",
  averageCustomerValue: "$500",
  monthlyRevenueGoal: "$10000",
  monthlyMarketingBudget: "$1000",
};

async function bootstrapGrowthWorkspace(tenantId: string, hostingAccountId: string) {
  await testPrisma.growthWorkspace.create({
    data: {
      tenantId,
      hostingAccountId,
      status: "onboarding",
      settings: {
        create: { tenantId, planSlug: "starter", planTierOverride: false },
      },
      businessProfile: {
        create: { step1Json: JSON.stringify(WIZARD_STEP1) },
      },
    },
  });
}

describe("Growth admin gating", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedAddonCatalog();
    await seedGrowthPromptTemplates();
  }, 60000);

  it("returns growth ops block on tenant ops payload", async () => {
    const tenant = await testPrisma.tenant.create({
      data: { slug: "growth-ops", name: "Growth Ops", branding: { create: {} }, mail: { create: {} } },
    });
    const hosting = await testPrisma.hostingAccount.create({
      data: {
        tenantId: tenant.id,
        username: "owner",
        domain: "growth-ops.test",
        homePath: "/home/owner",
        passwordHash: hashPassword("pass"),
      },
    });
    await bootstrapGrowthWorkspace(tenant.id, hosting.id);

    const { agent } = await createSuperAdminAgent();
    const res = await agent.get(`/api/admin/tenants/${tenant.id}/ops`);
    expect(res.status).toBe(200);
    expect(res.body.ops.growth.hasWorkspace).toBe(true);
    expect(res.body.ops.growth.planSlug).toBe("starter");
    expect(res.body.ops.growth.effectivePlanSlug).toBe("starter");
  });

  it("grants and revokes Growth subscription via admin", async () => {
    const { agent: panelAgent, tenant } = await createPanelAgent(app);
    await panelAgent.put("/api/growth/wizard/step/1").send(WIZARD_STEP1);

    const { agent } = await createSuperAdminAgent();

    const grantRes = await agent
      .post(`/api/admin/tenants/${tenant.id}/addon-subscriptions`)
      .send({ addonSlug: "prohost-growth-pro", periodDays: 30 });
    expect(grantRes.status).toBe(201);
    expect(grantRes.body.subscription.addonSlug).toBe("prohost-growth-pro");
    expect(grantRes.body.subscription.status).toBe("active");

    const opsRes = await agent.get(`/api/admin/tenants/${tenant.id}/ops`);
    expect(opsRes.body.ops.subscriptions.some((s: { status: string }) => s.status === "active")).toBe(true);
    expect(opsRes.body.ops.growth.effectivePlanSlug).toBe("pro");

    const revokeRes = await agent.delete(
      `/api/admin/tenants/${tenant.id}/addon-subscriptions/${grantRes.body.subscription.id}`,
    );
    expect(revokeRes.status).toBe(204);

    const afterOps = await agent.get(`/api/admin/tenants/${tenant.id}/ops`);
    expect(afterOps.body.ops.growth.effectivePlanSlug).toBe("starter");
  });

  it("sets Growth plan tier with admin override and audit log", async () => {
    const { agent: panelAgent, tenant } = await createPanelAgent(app);
    await panelAgent.put("/api/growth/wizard/step/1").send(WIZARD_STEP1);

    const { agent } = await createSuperAdminAgent();
    const patchRes = await agent.patch(`/api/admin/tenants/${tenant.id}/growth-plan`).send({
      planSlug: "agency",
      planTierOverride: true,
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.growth.planSlug).toBe("agency");
    expect(patchRes.body.growth.planTierOverride).toBe(true);

    const audit = await testPrisma.growthAuditLog.findFirst({
      where: { tenantId: tenant.id, action: "admin.plan_tier.set" },
    });
    expect(audit).toBeTruthy();
    expect(JSON.parse(audit!.metadataJson!).planSlug).toBe("agency");
  });

  it("blocks panel owner from PATCH planSlug on settings", async () => {
    const { agent } = await createPanelAgent(app);
    await agent.put("/api/growth/wizard/step/1").send(WIZARD_STEP1);

    const res = await agent.patch("/api/growth/settings").send({ planSlug: "pro" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("forbidden");
  });

  it("returns 403 for optimization on starter and 200 after pro checkout", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await grantAddonTrial(tenant.id, "prohost-growth");
    await agent.put("/api/growth/wizard/step/1").send(WIZARD_STEP1);

    const blocked = await agent.get("/api/growth/optimization");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("feature_locked");

    const checkout = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "addon",
      productSlug: "prohost-growth-pro",
      tenantSlug: tenant.slug,
      customerEmail: "owner@growth.test",
    });
    await completePaymentCheckout(checkout.body.checkout.id);

    const plan = await agent.get("/api/growth/plan");
    expect(plan.body.plan.limits.analytics).toBe(true);

    const allowed = await agent.get("/api/growth/optimization");
    expect(allowed.status).toBe(200);
  });
});
