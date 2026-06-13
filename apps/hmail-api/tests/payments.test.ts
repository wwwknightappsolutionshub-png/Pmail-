import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function seedTenant() {
  await seedAddonCatalog();
  return testPrisma.tenant.upsert({
    where: { slug: "demo" },
    create: {
      slug: "demo",
      name: "Demo Tenant",
      branding: { create: {} },
      mail: { create: {} },
    },
    update: {},
  });
}

describe("payments stripe paystack mock", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTenant();
    await testPrisma.hostingPlan.create({
      data: {
        slug: "starter",
        name: "Starter",
        priceCents: 999,
        features: "[]",
      },
    });
  });

  it("lists payment providers including mock in test mode", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/payments/providers");
    expect(res.status).toBe(200);
    expect(res.body.providers.some((p: { id: string }) => p.id === "mock")).toBe(true);
    expect(res.body.mockMode).toBe(true);
  });

  it("creates mock checkout for hosting plan", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      tenantSlug: "demo",
      customerEmail: "buyer@example.com",
    });
    expect(res.status).toBe(201);
    expect(res.body.checkout.status).toBe("pending");
    expect(res.body.checkout.checkoutUrl).toContain("/checkout/mock");
  });

  it("completes mock checkout and activates hosting subscription", async () => {
    const request = (await import("supertest")).default;
    const createRes = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      tenantSlug: "demo",
      customerEmail: "buyer@example.com",
    });
    const checkoutId = createRes.body.checkout.id;

    const completeRes = await request(app).post(`/api/payments/mock/complete/${checkoutId}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.checkout.status).toBe("completed");

    const sub = await testPrisma.hostingPlanSubscription.findFirst({
      where: { tenantId: (await testPrisma.tenant.findUnique({ where: { slug: "demo" } }))!.id },
    });
    expect(sub?.status).toBe("active");
    expect(sub?.paymentProvider).toBe("mock");
  });

  it("completes mock checkout for addon subscription", async () => {
    const request = (await import("supertest")).default;
    const createRes = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "addon",
      productSlug: "ircc-mail-intel",
      tenantSlug: "demo",
      customerEmail: "firm@example.com",
    });
    expect(createRes.status).toBe(201);

    const checkoutId = createRes.body.checkout.id;
    const completeRes = await request(app).post(`/api/payments/mock/complete/${checkoutId}`);
    expect(completeRes.status).toBe(200);

    const tenant = await testPrisma.tenant.findUnique({ where: { slug: "demo" } });
    const addon = await testPrisma.addon.findFirst({ where: { slug: "ircc-mail-intel" } });
    const sub = await testPrisma.tenantAddonSubscription.findUnique({
      where: { tenantId_addonId: { tenantId: tenant!.id, addonId: addon!.id } },
    });
    expect(sub?.status).toBe("active");
    expect(sub?.paymentProvider).toBe("mock");
  });

  it("rejects checkout for unknown tenant", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "hosting_plan",
      productSlug: "starter",
      tenantSlug: "missing",
      customerEmail: "buyer@example.com",
    });
    expect(res.status).toBe(400);
  });
});
