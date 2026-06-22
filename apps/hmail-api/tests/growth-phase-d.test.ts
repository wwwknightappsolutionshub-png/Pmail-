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

async function completeChatFlow(tenantSlug: string) {
  const started = await request(app)
    .post(`/api/public/growth/${tenantSlug}/chat/sessions`)
    .send({ sourcePage: "homepage" });
  expect(started.status).toBe(201);
  const sessionId = started.body.sessionId as string;

  const replies = ["Pat Rivera", "pat@example.com", "n/a", "Burst pipe in basement", "ASAP"];
  let last = started.body;
  for (const message of replies) {
    const res = await request(app)
      .post(`/api/public/growth/${tenantSlug}/chat/sessions/${sessionId}/messages`)
      .send({ message });
    expect(res.status).toBe(200);
    last = res.body;
  }
  return { sessionId, result: last };
}

describe("Prohost Growth Phase D", () => {
  beforeEach(async () => {
    notifyMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bootstraps chatbot config after content bundle (channels_ready)", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");

    const bot = await agent.get("/api/growth/chatbot");
    expect(bot.status).toBe(200);
    expect(bot.body.configs[0].botKey).toBe("qualification");
    expect(bot.body.configs[0].steps.length).toBeGreaterThan(4);
  });

  it("GET /api/public/growth/:tenantSlug/chatbot returns public config", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const meta = await request(app).get(`/api/public/growth/${tenant.slug}/chatbot`);
    expect(meta.status).toBe(200);
    expect(meta.body.startUrl).toContain("/chat/sessions");
  });

  it("completes chat flow and creates a chatbot lead on the pipeline", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const { result } = await completeChatFlow(tenant.slug);
    expect(result.status).toBe("completed");
    expect(result.leadId).toBeTruthy();

    const board = await agent.get("/api/growth/pipeline/board");
    expect(board.body.leadsByStage.qualified).toHaveLength(1);
    expect(board.body.leadsByStage.qualified[0].email).toBe("pat@example.com");

    const lead = await agent.get(`/api/growth/leads/${result.leadId}`);
    expect(lead.body.lead.source).toBe("chatbot");
    expect(lead.body.chatSession).toBeTruthy();
    expect(lead.body.chatSession.messages.length).toBeGreaterThan(3);
  });

  it("sends email notification when chatbot creates a lead", async () => {
    const { agent, tenant, username, domain } = await createPanelAgent(app);
    await completeWizard(agent);

    await completeChatFlow(tenant.slug);

    await vi.waitFor(() => {
      expect(notifyMock).toHaveBeenCalled();
    });
    expect(notifyMock.mock.calls[0]?.[0]).toBe(`${username}@${domain}`);
  });
});
