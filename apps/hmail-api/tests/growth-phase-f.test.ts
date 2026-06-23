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

describe("Prohost Growth Phase F", () => {
  beforeEach(async () => {
    emailMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets channels_ready after content bundle with settings and team", async () => {
    const { agent, hostingAccountId } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");

    const settings = await testPrisma.growthWorkspaceSettings.findFirst();
    expect(settings?.planSlug).toBe("starter");

    const owner = await testPrisma.growthTeamMember.findFirst({ where: { role: "owner" } });
    expect(owner?.hostingAccountId).toBe(hostingAccountId);

    const trial = await testPrisma.tenantAddonTrial.findFirst({
      where: { addon: { slug: "prohost-growth" } },
      include: { addon: true },
    });
    expect(trial?.addon.slug).toBe("prohost-growth");
  });

  it("GET /api/growth/plan returns usage and limits", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const plan = await agent.get("/api/growth/plan");
    expect(plan.status).toBe(200);
    expect(plan.body.plan.planSlug).toBe("starter");
    expect(plan.body.plan.hasAccess).toBe(true);
    expect(plan.body.plan.limits.leadsPerMonth).toBe(50);
    expect(plan.body.role).toBe("owner");
  });

  it("PATCH /api/growth/settings updates notify email for owner", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const patched = await agent.patch("/api/growth/settings").send({
      notifyEmail: "alerts@acme.test",
    });
    expect(patched.status).toBe(200);
    expect(patched.body.settings.notifyEmail).toBe("alerts@acme.test");
  });

  it("owner can invite marketer to team", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const invited = await agent.post("/api/growth/team").send({
      email: "marketer@acme.test",
      role: "marketer",
    });
    expect(invited.status).toBe(201);
    expect(invited.body.member.role).toBe("marketer");

    const settings = await agent.get("/api/growth/settings");
    expect(settings.body.team.length).toBe(2);
  });

  it("blocks analytics dashboard on starter plan", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const dash = await agent.get("/api/growth/analytics/dashboard");
    expect(dash.status).toBe(403);
    expect(dash.body.code).toBe("feature_locked");
  });

  it("upgrades plan to pro after prohost-growth-pro checkout completes", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const checkout = await request(app).post("/api/payments/checkout").send({
      provider: "mock",
      productType: "addon",
      productSlug: "prohost-growth-pro",
      tenantSlug: tenant.slug,
      customerEmail: "owner@growth.test",
    });
    expect(checkout.status).toBe(201);

    await completePaymentCheckout(checkout.body.checkout.id);

    const plan = await agent.get("/api/growth/plan");
    expect(plan.body.plan.planSlug).toBe("pro");

    const dash = await agent.get("/api/growth/analytics/dashboard");
    expect(dash.status).toBe(200);
  });

  it("GET /api/growth/plan/options lists all tiers", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const options = await agent.get("/api/growth/plan/options");
    expect(options.status).toBe(200);
    expect(options.body.plans).toHaveLength(3);
    expect(options.body.plans.map((p: { slug: string }) => p.slug)).toEqual(["starter", "pro", "agency"]);
  });

  it("POST /api/growth/plan/checkout creates pro checkout for owner", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const checkout = await agent.post("/api/growth/plan/checkout").send({
      planSlug: "pro",
      provider: "mock",
      customerEmail: "owner@growth.test",
    });
    expect(checkout.status).toBe(201);
    expect(checkout.body.checkout).toBeDefined();
  });

  it("sends team invite email when marketer is invited", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    emailMock.mockClear();
    await agent.post("/api/growth/team").send({
      email: "marketer@acme.test",
      role: "marketer",
    });

    expect(emailMock).toHaveBeenCalled();
  });

  it("POST /api/growth/packaging/bootstrap ensures channels_ready", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const boot = await agent.post("/api/growth/packaging/bootstrap").send({});
    expect(boot.status).toBe(200);
    expect(boot.body.workspaceStatus).toBe("channels_ready");
    expect(boot.body.team.length).toBeGreaterThanOrEqual(1);
  });
});
