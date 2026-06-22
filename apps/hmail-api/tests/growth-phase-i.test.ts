import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase } from "./helpers.js";

const llmMock = vi.fn();

vi.mock("../src/services/marketing-ai.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/marketing-ai.service.js")>();
  return {
    ...actual,
    callMarketingAi: (...args: unknown[]) => llmMock(...args),
    getMarketingConfig: vi.fn().mockResolvedValue({
      aiProvider: "openai",
      aiModel: "gpt-4o-mini",
      hasApiKey: true,
      aiBaseUrl: null,
      settings: {},
      updatedAt: new Date().toISOString(),
    }),
  };
});

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

describe("Prohost Growth Phase I", () => {
  beforeEach(async () => {
    llmMock.mockReset();
    llmMock.mockResolvedValue(
      JSON.stringify({
        marketOpportunities: ["LLM opportunity A", "LLM opportunity B"],
        threats: ["LLM threat"],
        growthAreas: ["Emergency calls"],
        summary: "LLM-generated market summary for Acme Plumbing.",
      }),
    );
    process.env.GROWTH_USE_LLM = "true";
    process.env.OPENAI_API_KEY = "test-key";
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GROWTH_USE_LLM;
    delete process.env.OPENAI_API_KEY;
  });

  it("GET /api/growth/agents/llm-status reports configured when API key present", async () => {
    const { agent } = await createPanelAgent(app);
    const res = await agent.get("/api/growth/agents/llm-status");
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
  });

  it("uses LLM output for agent runs when configured", async () => {
    const { agent } = await createPanelAgent(app);
    for (const [step, payload] of Object.entries(WIZARD).map(([key, value], index) => [index + 1, value] as const)) {
      await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
    }
    await agent.post("/api/growth/wizard/complete").send({});
    await processGrowthJobQueue();
    await processGrowthJobQueue();

    expect(llmMock).toHaveBeenCalled();

    const runs = await agent.get("/api/growth/agent-runs");
    const marketRun = runs.body.runs.find((r: { agentKey: string }) => r.agentKey === "market_research");
    expect(marketRun?.output?.generationMode).toBe("llm");
    expect(marketRun?.output?.summary).toContain("LLM-generated");
  });

  it("falls back to template when LLM returns invalid JSON", async () => {
    llmMock.mockResolvedValue("not json at all");
    const { agent } = await createPanelAgent(app);
    for (const [step, payload] of Object.entries(WIZARD).map(([key, value], index) => [index + 1, value] as const)) {
      await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
    }
    await agent.post("/api/growth/wizard/complete").send({});
    await processGrowthJobQueue();
    await processGrowthJobQueue();

    const runs = await agent.get("/api/growth/agent-runs");
    const marketRun = runs.body.runs.find((r: { agentKey: string }) => r.agentKey === "market_research");
    expect(marketRun?.output?.generationMode).toBe("template");
    expect(marketRun?.output?.marketOpportunities?.length).toBeGreaterThan(0);
  });
});
