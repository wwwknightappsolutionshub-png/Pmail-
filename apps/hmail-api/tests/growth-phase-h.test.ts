import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { completePaymentCheckout } from "../src/services/payment.service.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const emailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../src/services/platform-email.service.js", () => ({
  notifyInternalAddress: vi.fn().mockResolvedValue(undefined),
  sendPlatformEmail: (...args: unknown[]) => emailMock(...args),
  sendTemplatedPlatformEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

const WIZARD = {
  step1: {
    businessName: "Acme Plumbing",
    industry: "Home services",
    website: "",
    serviceArea: "Toronto GTA",
    productsServices: "Emergency plumbing",
    averageCustomerValue: "$450",
    monthlyRevenueGoal: "$25000",
    monthlyMarketingBudget: "$2000",
  },
  step2: {
    idealCustomer: "Homeowners",
    customerProblems: "Leaks",
    desiredOutcomes: "Fast fix",
    customerObjections: "Price",
    existingCustomerExamples: "Jane",
  },
  step3: {
    competitorUrls: [],
    competitorNames: ["Rival"],
    whyBetter: "Same-day service",
    whyDifferent: "Digital booking",
  },
  step4: {
    mainOffer: "Free inspection",
    upsells: "",
    freeConsultation: true,
    discounts: "",
    guarantees: "30-day guarantee",
  },
  step5: { style: "friendly" as const, notes: "" },
  step6: { assets: [] },
};

async function completeWizard(agent: Awaited<ReturnType<typeof createPanelAgent>>["agent"]) {
  for (const [step, payload] of Object.entries(WIZARD).map(([key, value], index) => [index + 1, value] as const)) {
    await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
  }
  await agent.post("/api/growth/wizard/complete").send({});
  await processGrowthJobQueue();
  await processGrowthJobQueue();
}

async function upgradeTenantToPro(tenantSlug: string) {
  const checkout = await request(app).post("/api/payments/checkout").send({
    provider: "mock",
    productType: "addon",
    productSlug: "prohost-growth-pro",
    tenantSlug,
    customerEmail: "owner@growth.test",
  });
  await completePaymentCheckout(checkout.body.checkout.id);
}

async function completeWizardWithPro(agent: Awaited<ReturnType<typeof createPanelAgent>>["agent"], tenantSlug: string) {
  await completeWizard(agent);
  await upgradeTenantToPro(tenantSlug);
}

describe("Prohost Growth Phase H", () => {
  beforeEach(async () => {
    emailMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds optimization insights after content bundle", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");

    const rows = await testPrisma.growthOptimizationInsight.findMany();
    expect(rows.length).toBeGreaterThan(0);
  });

  it("GET /api/growth/optimization returns insight summary", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizardWithPro(agent, tenant.slug);

    const res = await agent.get("/api/growth/optimization");
    expect(res.status).toBe(200);
    expect(res.body.insights.length).toBeGreaterThan(0);
    expect(res.body.insightCount).toBe(res.body.insights.length);
    expect(typeof res.body.highPriorityCount).toBe("number");
  });

  it("POST /api/growth/optimization/refresh replaces open insights", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizardWithPro(agent, tenant.slug);

    const before = await agent.get("/api/growth/optimization");
    const refreshed = await agent.post("/api/growth/optimization/refresh").send({});
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.insights.length).toBeGreaterThan(0);

    const after = await agent.get("/api/growth/optimization");
    expect(after.body.insights.length).toBeGreaterThan(0);
  });

  it("PATCH /api/growth/optimization/:id dismisses an insight", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizardWithPro(agent, tenant.slug);

    const list = await agent.get("/api/growth/optimization");
    const insightId = list.body.insights[0].id;

    const dismissed = await agent.patch(`/api/growth/optimization/${insightId}`).send({});
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.insight.status).toBe("dismissed");

    const after = await agent.get("/api/growth/optimization");
    expect(after.body.insights.some((i: { id: string }) => i.id === insightId)).toBe(false);
  });

  it("POST /api/growth/optimization/bootstrap ensures channels_ready", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const boot = await agent.post("/api/growth/optimization/bootstrap").send({});
    expect(boot.status).toBe(200);
    expect(boot.body.workspaceStatus).toBe("channels_ready");
    expect(boot.body.insights.length).toBeGreaterThan(0);
  });

  it("pro plan refresh succeeds with analytics-enabled insights", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizardWithPro(agent, tenant.slug);

    const plan = await agent.get("/api/growth/plan");
    expect(plan.body.plan.planSlug).toBe("pro");
    expect(plan.body.plan.limits.analytics).toBe(true);

    const refreshed = await agent.post("/api/growth/optimization/refresh").send({});
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.insights.length).toBeGreaterThan(0);
    expect(
      refreshed.body.insights.some((i: { title: string }) => i.title.includes("Unlock analytics")),
    ).toBe(false);
  });
});
