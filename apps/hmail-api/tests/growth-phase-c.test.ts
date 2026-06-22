import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

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

describe("Prohost Growth Phase C", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bootstraps pipeline stages and capture form after content bundle", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(workspace?.status).toBe("channels_ready");

    const stages = await agent.get("/api/growth/pipeline/stages");
    expect(stages.status).toBe(200);
    expect(stages.body.stages).toHaveLength(7);
    expect(stages.body.stages[0].slug).toBe("new");

    const forms = await agent.get("/api/growth/forms");
    expect(forms.body.forms[0].formKey).toBe("capture");
  });

  it("captures public leads and exposes them on the pipeline board", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const capture = await request(app)
      .post(`/api/public/growth/${tenant.slug}/leads`)
      .send({
        payload: {
          fullName: "Pat Rivera",
          email: "pat@example.com",
          phone: "555-0100",
          message: "Need emergency plumbing help this weekend please",
        },
        source: "form",
        sourcePage: "homepage",
        attribution: { utm_source: "google" },
      });
    expect(capture.status).toBe(201);
    expect(capture.body.score).toBeGreaterThan(0);

    const board = await agent.get("/api/growth/pipeline/board");
    expect(board.status).toBe(200);
    expect(board.body.leadsByStage.new).toHaveLength(1);
    expect(board.body.leadsByStage.new[0].email).toBe("pat@example.com");
  });

  it("moves leads between pipeline stages", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    await request(app)
      .post(`/api/public/growth/${tenant.slug}/leads`)
      .send({
        payload: { fullName: "Sam Lee", email: "sam@example.com", message: "Quote please" },
      });

    const leads = await agent.get("/api/growth/leads");
    const leadId = leads.body.leads[0].id;

    const moved = await agent.patch(`/api/growth/leads/${leadId}/stage`).send({ stageSlug: "qualified" });
    expect(moved.status).toBe(200);
    expect(moved.body.lead.stageSlug).toBe("qualified");

    const stats = await agent.get("/api/growth/leads/stats");
    expect(stats.body.stats.byStage.qualified).toBe(1);
  });

  it("GET /api/public/growth/:tenantSlug/capture-form returns active form", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const form = await request(app).get(`/api/public/growth/${tenant.slug}/capture-form`);
    expect(form.status).toBe(200);
    expect(form.body.submitUrl).toContain("/api/public/growth/");
    expect(form.body.form.fields.length).toBeGreaterThan(0);
  });
});
