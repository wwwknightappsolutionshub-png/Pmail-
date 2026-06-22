import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const notifyMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../src/services/platform-email.service.js", () => ({
  notifyInternalAddress: (...args: unknown[]) => notifyMock(...args),
  sendPlatformEmail: vi.fn().mockResolvedValue(undefined),
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

async function upgradeToProPlan(tenantId: string) {
  const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId } });
  if (!workspace) return;
  await testPrisma.growthWorkspaceSettings.updateMany({
    where: { workspaceId: workspace.id },
    data: { planSlug: "pro" },
  });
}

describe("Prohost Growth Phase E", () => {
  beforeEach(async () => {
    notifyMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets channels_ready after content bundle generation", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");
  });

  it("records public page_view events with UTM attribution", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToProPlan(tenant.id);

    const event = await request(app)
      .post(`/api/public/growth/${tenant.slug}/analytics/events`)
      .send({
        eventType: "page_view",
        sourcePage: "homepage",
        path: "/index.html",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "spring",
        referrer: "https://google.com",
      });
    expect(event.status).toBe(201);

    const dash = await agent.get("/api/growth/analytics/dashboard?days=30");
    expect(dash.status).toBe(200);
    expect(dash.body.dashboard.totals.pageViews).toBe(1);
    expect(dash.body.dashboard.byUtmSource.google).toBe(1);
    expect(dash.body.dashboard.bySourcePage.homepage.pageViews).toBe(1);
  });

  it("rejects invalid analytics event types", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToProPlan(tenant.id);

    const event = await request(app)
      .post(`/api/public/growth/${tenant.slug}/analytics/events`)
      .send({ eventType: "invalid_event" });
    expect(event.status).toBe(400);
    expect(event.body.error).toMatch(/Invalid event type/i);

    const dash = await agent.get("/api/growth/analytics/dashboard");
    expect(dash.body.dashboard.totals.pageViews).toBe(0);
  });

  it("aggregates funnel metrics from form submit and chat complete", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToProPlan(tenant.id);

    await request(app)
      .post(`/api/public/growth/${tenant.slug}/analytics/events`)
      .send({ eventType: "page_view", sourcePage: "homepage" });
    await request(app)
      .post(`/api/public/growth/${tenant.slug}/analytics/events`)
      .send({ eventType: "page_view", sourcePage: "homepage" });

    const lead = await request(app)
      .post(`/api/public/growth/${tenant.slug}/leads`)
      .send({
        payload: {
          fullName: "Sam Lee",
          email: "sam@example.com",
          message: "Need a quote",
        },
        source: "form",
        sourcePage: "homepage",
        attribution: { utm_source: "newsletter" },
      });
    expect(lead.status).toBe(201);

    const started = await request(app)
      .post(`/api/public/growth/${tenant.slug}/chat/sessions`)
      .send({ sourcePage: "homepage" });
    expect(started.status).toBe(201);
    const sessionId = started.body.sessionId as string;

    const replies = ["Alex Kim", "alex@example.com", "n/a", "Kitchen remodel", "ASAP"];
    for (const message of replies) {
      const res = await request(app)
        .post(`/api/public/growth/${tenant.slug}/chat/sessions/${sessionId}/messages`)
        .send({ message });
      expect(res.status).toBe(200);
    }

    const dash = await agent.get("/api/growth/analytics/dashboard");
    expect(dash.status).toBe(200);
    expect(dash.body.dashboard.totals.pageViews).toBe(2);
    expect(dash.body.dashboard.totals.formSubmits).toBe(1);
    expect(dash.body.dashboard.totals.chatOpens).toBe(1);
    expect(dash.body.dashboard.totals.chatCompletes).toBe(1);
    expect(dash.body.dashboard.totals.leads).toBe(2);
    expect(dash.body.dashboard.funnel.conversionRate).toBeGreaterThan(0);
  });

  it("POST /api/growth/automations/bootstrap ensures channels_ready", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const boot = await agent.post("/api/growth/automations/bootstrap").send({});
    expect(boot.status).toBe(200);
    expect(boot.body.workspaceStatus).toBe("channels_ready");
    expect(boot.body.automations.length).toBeGreaterThanOrEqual(3);
  });
});
