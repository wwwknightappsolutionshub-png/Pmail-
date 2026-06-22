import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createAdminAgent, resetTestDatabase, testPrisma } from "./helpers.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { processBillingLifecycle } from "../src/services/billing-lifecycle.service.js";

describe("Tier D enterprise ops", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    await seedAddonCatalog();
  });

  it("GET /health returns liveness", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("GET /health/ready confirms database connectivity", async () => {
    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.checks.database.ok).toBe(true);
  });

  it("GET /api/public/privacy returns compliance notices", async () => {
    const res = await request(app).get("/api/public/privacy");
    expect(res.status).toBe(200);
    expect(res.body.leads.consentRequired).toContain("privacy");
    expect(res.body.openTracking.summary).toMatch(/tracking/i);
  });

  it("POST /api/public/leads requires privacy consent", async () => {
    const denied = await request(app).post("/api/public/leads").send({
      fullName: "Jane",
      email: "jane@test.local",
      company: "Co",
    });
    expect(denied.status).toBe(400);
    expect(denied.body.error).toMatch(/consent/i);

    const ok = await request(app).post("/api/public/leads").send({
      fullName: "Jane",
      email: "jane@test.local",
      company: "Co",
      consentPrivacy: true,
    });
    expect(ok.status).toBe(201);
  });

  it("GET /api/public/track/:token.gif includes tracking notice header", async () => {
    const res = await request(app).get("/api/public/track/testtoken.gif");
    expect(res.status).toBe(200);
    expect(res.headers["x-tracking-notice"]).toMatch(/privacy/i);
  });

  it("billing lifecycle marks expired subscriptions past_due then canceled", async () => {
    const tenant = await testPrisma.tenant.create({
      data: { slug: "bill-co", name: "Bill Co", branding: { create: {} }, mail: { create: {} } },
    });
    const plan = await testPrisma.hostingPlan.create({
      data: { slug: "starter", name: "Starter", priceCents: 999, features: "[]" },
    });
    const past = new Date();
    past.setDate(past.getDate() - 10);

    await testPrisma.hostingPlanSubscription.create({
      data: {
        tenantId: tenant.id,
        hostingPlanId: plan.id,
        status: "active",
        paymentProvider: "mock",
        currentPeriodEnd: past,
      },
    });

    const first = await processBillingLifecycle();
    expect(first.markedPastDue).toBe(1);

    const sub = await testPrisma.hostingPlanSubscription.findFirst({ where: { tenantId: tenant.id } });
    expect(sub?.status).toBe("past_due");

    await testPrisma.hostingPlanSubscription.update({
      where: { id: sub!.id },
      data: { pastDueSince: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });

    const second = await processBillingLifecycle();
    expect(second.canceled).toBe(1);

    const final = await testPrisma.hostingPlanSubscription.findFirst({ where: { tenantId: tenant.id } });
    expect(final?.status).toBe("canceled");
  });

  it("GET /api/admin/ops/system-status returns ops summary for admin", async () => {
    const { agent } = await createAdminAgent(app);
    const res = await agent.get("/api/admin/system-status");
    expect(res.status).toBe(200);
    expect(res.body.readiness.status).toBe("ready");
    expect(res.body.billing.graceDays).toBeGreaterThan(0);
    expect(res.body.counts).toBeTruthy();
  });
});
