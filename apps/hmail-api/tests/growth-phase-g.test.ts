import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const emailMock = vi.fn().mockResolvedValue(undefined);
const notifyMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../src/services/platform-email.service.js", () => ({
  notifyInternalAddress: (...args: unknown[]) => notifyMock(...args),
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

describe("Prohost Growth Phase G", () => {
  beforeEach(async () => {
    emailMock.mockClear();
    notifyMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds default automations after content bundle (channels_ready)", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");

    const list = await agent.get("/api/growth/automations");
    expect(list.status).toBe(200);
    expect(list.body.automations.length).toBe(3);
    expect(list.body.automations.some((a: { name: string }) => a.name.includes("Welcome"))).toBe(true);
  });

  it("runs nurture email automation when a public lead is captured", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const lead = await request(app)
      .post(`/api/public/growth/${tenant.slug}/leads`)
      .send({
        payload: {
          fullName: "Jordan Lee",
          email: "jordan@example.com",
          message: "Need help",
        },
        source: "form",
        sourcePage: "homepage",
      });
    expect(lead.status).toBe(201);

    await vi.waitFor(() => {
      expect(emailMock).toHaveBeenCalled();
    });

    const runs = await agent.get("/api/growth/automations/runs");
    expect(runs.body.runs.some((r: { status: string }) => r.status === "success")).toBe(true);
    expect(emailMock.mock.calls.some((call) => call[0]?.to === "jordan@example.com")).toBe(true);
  });

  it("moves chatbot leads to qualified via chat_completed automation", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const started = await request(app)
      .post(`/api/public/growth/${tenant.slug}/chat/sessions`)
      .send({ sourcePage: "homepage" });
    expect(started.status).toBe(201);
    const sessionId = started.body.sessionId as string;

    const replies = ["Sam Rivera", "sam@example.com", "n/a", "Kitchen leak", "ASAP"];
    for (const message of replies) {
      const res = await request(app)
        .post(`/api/public/growth/${tenant.slug}/chat/sessions/${sessionId}/messages`)
        .send({ message });
      expect(res.status).toBe(200);
    }

    const board = await agent.get("/api/growth/pipeline/board");
    const qualified = board.body.leadsByStage.qualified ?? [];
    const inNew = board.body.leadsByStage.new ?? [];
    const found =
      qualified.some((l: { email: string }) => l.email === "sam@example.com") ||
      inNew.some((l: { email: string }) => l.email === "sam@example.com");
    expect(found).toBe(true);

    await vi.waitFor(async () => {
      const latest = await agent.get("/api/growth/pipeline/board");
      const q = latest.body.leadsByStage.qualified ?? [];
      expect(q.some((l: { email: string }) => l.email === "sam@example.com")).toBe(true);
    });
  });

  it("PATCH /api/growth/automations/:id toggles isActive", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const list = await agent.get("/api/growth/automations");
    const automationId = list.body.automations[0].id as string;

    const patched = await agent.patch(`/api/growth/automations/${automationId}`).send({ isActive: false });
    expect(patched.status).toBe(200);
    expect(patched.body.automation.isActive).toBe(false);
  });

  it("POST /api/growth/automations creates a custom rule", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const created = await agent.post("/api/growth/automations").send({
      name: "Notify on manual lead",
      triggerType: "lead_created",
      actionType: "notify_owner",
      triggerFilter: { sources: ["manual"] },
    });
    expect(created.status).toBe(201);
    expect(created.body.automation.name).toBe("Notify on manual lead");
  });
});
