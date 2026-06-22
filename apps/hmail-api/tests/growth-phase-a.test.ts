import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

const STEP1 = {
  businessName: "Acme Plumbing",
  industry: "Home services",
  website: "https://acme-plumbing.test",
  serviceArea: "Toronto GTA",
  productsServices: "Emergency plumbing, drain cleaning, water heaters",
  averageCustomerValue: "$450",
  monthlyRevenueGoal: "$25000",
  monthlyMarketingBudget: "$2000",
};

const STEP2 = {
  idealCustomer: "Homeowners with urgent repair needs",
  customerProblems: "Leaks, clogs, no hot water",
  desiredOutcomes: "Fast fix, fair pricing, trustworthy technician",
  customerObjections: "Price, availability, trust",
  existingCustomerExamples: "Jane on Oak St — water heater replacement",
};

const STEP3 = {
  competitorUrls: ["https://competitor-a.test"],
  competitorNames: ["Rival Plumbing"],
  whyBetter: "Same-day service with upfront pricing",
  whyDifferent: "Digital booking and live ETA tracking",
};

const STEP4 = {
  mainOffer: "Free inspection + $49 drain clearing",
  upsells: "Annual maintenance plan",
  freeConsultation: true,
  discounts: "10% for seniors",
  guarantees: "30-day workmanship guarantee",
};

const STEP5 = {
  style: "friendly" as const,
  notes: "Plain language, no jargon",
};

const STEP6 = {
  assets: [{ kind: "logo" as const, url: "/api/growth/assets/test/logo.svg", fileName: "logo.svg" }],
};

describe("Prohost Growth Phase A", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  });

  it("GET /api/growth/workspace requires panel auth", async () => {
    const res = await request(app).get("/api/growth/workspace");
    expect(res.status).toBe(401);
  });

  it("creates tenant-scoped workspace and saves wizard steps", async () => {
    const { agent, tenant } = await createPanelAgent(app);

    const workspaceRes = await agent.get("/api/growth/workspace");
    expect(workspaceRes.status).toBe(200);
    expect(workspaceRes.body.workspace.tenantId).toBe(tenant.id);
    expect(workspaceRes.body.workspace.status).toBe("onboarding");

    for (const [step, payload] of [
      [1, STEP1],
      [2, STEP2],
      [3, STEP3],
      [4, STEP4],
      [5, STEP5],
      [6, STEP6],
    ] as const) {
      const res = await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
      expect(res.status).toBe(200);
      expect(res.body.workspace.wizard.steps[`step${step}`]).toMatchObject(payload);
    }
  });

  it("completes wizard, enqueues pipeline, and runs agent orchestration skeleton", async () => {
    const { agent, tenant } = await createPanelAgent(app);

    for (const [step, payload] of [
      [1, STEP1],
      [2, STEP2],
      [3, STEP3],
      [4, STEP4],
      [5, STEP5],
      [6, STEP6],
    ] as const) {
      await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
    }

    const completeRes = await agent.post("/api/growth/wizard/complete").send({});
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.workspace.wizard.completed).toBe(true);
    expect(completeRes.body.job.jobType).toBe("orchestration_pipeline");

    await processGrowthJobQueue();
    await processGrowthJobQueue();

    const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(workspace?.status).toBe("channels_ready");

    const runs = await agent.get("/api/growth/agent-runs");
    expect(runs.status).toBe(200);
    expect(runs.body.runs.length).toBe(5);
    expect(runs.body.runs.every((r: { status: string }) => r.status === "completed")).toBe(true);

    const prompts = await agent.get("/api/growth/prompts");
    expect(prompts.status).toBe(200);
    expect(prompts.body.prompts.length).toBeGreaterThanOrEqual(5);
  });

  it("GET /api/growth/agents returns registry", async () => {
    const { agent } = await createPanelAgent(app);
    const res = await agent.get("/api/growth/agents");
    expect(res.status).toBe(200);
    expect(res.body.agents).toHaveLength(5);
  });

  it("accepts flexible step 1 website values", async () => {
    const { agent } = await createPanelAgent(app);
    const base = {
      businessName: "Acme Plumbing",
      industry: "Home services",
      serviceArea: "Toronto GTA",
      productsServices: "Emergency plumbing",
      averageCustomerValue: "$450",
      monthlyRevenueGoal: "$25000",
      monthlyMarketingBudget: "$2000",
    };

    for (const website of ["", null, "localhost:5174", "http://localhost:5174/"]) {
      const res = await agent.put("/api/growth/wizard/step/1").send({ ...base, website });
      expect(res.status).toBe(200);
    }
  });
});
