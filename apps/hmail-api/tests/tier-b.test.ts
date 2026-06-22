import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAdminAgent,
  resetTestDatabase,
  seedTestTenant,
  testPrisma,
} from "./helpers.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";

describe("Tier B production APIs", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    await seedAddonCatalog();
    await testPrisma.hostingPlan.create({
      data: {
        slug: "starter",
        name: "Starter",
        priceCents: 999,
        features: "[]",
      },
    });
  });

  it("PATCH /api/admin/leads/:id updates status and notes", async () => {
    const lead = await testPrisma.marketingLead.create({
      data: {
        fullName: "Jane Doe",
        email: "jane@acme.test",
        company: "Acme Inc",
      },
    });
    const { agent } = await createAdminAgent(app);
    const res = await agent.patch(`/api/admin/leads/${lead.id}`).send({
      status: "contacted",
      notes: "Called back — interested in Starter plan",
    });
    expect(res.status).toBe(200);
    expect(res.body.lead.status).toBe("contacted");
    expect(res.body.lead.notes).toContain("Starter plan");
  });

  it("POST /api/admin/leads/:id/convert provisions tenant and panel account", async () => {
    const lead = await testPrisma.marketingLead.create({
      data: {
        fullName: "Bob Buyer",
        email: "bob@newco.test",
        company: "New Co LLC",
      },
    });
    const { agent } = await createAdminAgent(app);
    const res = await agent.post(`/api/admin/leads/${lead.id}/convert`);
    expect(res.status).toBe(200);
    expect(res.body.tenant.slug).toBeTruthy();
    expect(res.body.panelLoginId).toContain("@");
    expect(res.body.panelPassword).toBeTruthy();

    const updated = await testPrisma.marketingLead.findUnique({ where: { id: lead.id } });
    expect(updated?.status).toBe("converted");
    expect(updated?.tenantId).toBeTruthy();

    const account = await testPrisma.hostingAccount.findFirst({
      where: { tenantId: updated!.tenantId! },
    });
    expect(account).toBeTruthy();

    const user = await testPrisma.user.findFirst({
      where: { tenantId: updated!.tenantId!, email: "bob@newco.test" },
    });
    expect(user).toBeTruthy();
  });

  it("self-serve checkout with provision creates tenant and resources on payment complete", async () => {
    const createRes = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      customerEmail: "buyer@startup.test",
      provision: {
        orgName: "Startup Labs",
        domain: "startup.hostnet.local",
      },
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.checkout.tenantSlug).toBeTruthy();

    const checkoutId = createRes.body.checkout.id;
    const completeRes = await request(app).post(`/api/payments/mock/complete/${checkoutId}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.checkout.status).toBe("completed");
    expect(completeRes.body.provisioning?.panelLoginId).toContain("startup.hostnet.local");
    expect(completeRes.body.provisioning?.tenantSlug).toBeTruthy();

    const tenant = await testPrisma.tenant.findFirst({
      where: { slug: completeRes.body.provisioning.tenantSlug },
    });
    expect(tenant).toBeTruthy();

    const account = await testPrisma.hostingAccount.findFirst({ where: { tenantId: tenant!.id } });
    expect(account?.domain).toBe("startup.hostnet.local");

    const user = await testPrisma.user.findFirst({
      where: { tenantId: tenant!.id, email: "buyer@startup.test" },
    });
    expect(user).toBeTruthy();

    const trial = await testPrisma.tenantAddonTrial.findFirst({
      where: { tenantId: tenant!.id, addon: { slug: "bespoke-workspace" } },
      include: { addon: true },
    });
    expect(trial?.status).toBe("active");
  });

  it("GET /api/payments/checkout/:id returns provisioning summary after complete", async () => {
    const { tenant } = await seedTestTenant();
    const createRes = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      tenantSlug: tenant.slug,
      customerEmail: "existing@demo.test",
      provision: { orgName: tenant.name },
    });
    const checkoutId = createRes.body.checkout.id;
    await request(app).post(`/api/payments/mock/complete/${checkoutId}`);

    const getRes = await request(app).get(`/api/payments/checkout/${checkoutId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.checkout.provisioning?.status).toBe("completed");
    expect(getRes.body.checkout.tenantSlug).toBe(tenant.slug);
  });

  it("rejects checkout without tenant slug or organization name", async () => {
    const res = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      customerEmail: "orphan@test.local",
    });
    expect(res.status).toBe(400);
  });
});
