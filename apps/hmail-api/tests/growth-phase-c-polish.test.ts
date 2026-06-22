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

describe("Prohost Growth Phase C polish", () => {
  beforeEach(async () => {
    notifyMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST /api/growth/leads creates a manual lead on the board", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const created = await agent.post("/api/growth/leads").send({
      fullName: "Alex Morgan",
      email: "alex@example.com",
      phone: "555-0199",
      message: "Referred by a friend",
    });
    expect(created.status).toBe(201);
    expect(created.body.lead.source).toBe("manual");
    expect(created.body.lead.fullName).toBe("Alex Morgan");

    const board = await agent.get("/api/growth/pipeline/board");
    expect(board.body.leadsByStage.new).toHaveLength(1);
    expect(board.body.leadsByStage.new[0].email).toBe("alex@example.com");
  });

  it("PATCH /api/growth/leads/:id updates lead fields and recalculates score", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const created = await agent.post("/api/growth/leads").send({
      fullName: "Jordan Lee",
      email: "jordan@example.com",
    });
    const leadId = created.body.lead.id;

    const updated = await agent.patch(`/api/growth/leads/${leadId}`).send({
      phone: "555-0101",
      company: "Lee Co",
      message: "Looking for a full marketing retainer package this quarter",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.lead.phone).toBe("555-0101");
    expect(updated.body.lead.score).toBeGreaterThan(created.body.lead.score);

    const detail = await agent.get(`/api/growth/leads/${leadId}`);
    expect(detail.body.activities.some((a: { activityType: string }) => a.activityType === "updated")).toBe(true);
  });

  it("public capture → pipeline board flow and email notification", async () => {
    const { agent, tenant, username, domain } = await createPanelAgent(app);
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
      });
    expect(capture.status).toBe(201);

    const board = await agent.get("/api/growth/pipeline/board");
    expect(board.body.leadsByStage.new[0].email).toBe("pat@example.com");

    await vi.waitFor(() => {
      expect(notifyMock).toHaveBeenCalled();
    });
    expect(notifyMock.mock.calls[0]?.[0]).toBe(`${username}@${domain}`);
    expect(String(notifyMock.mock.calls[0]?.[1])).toContain("New Growth lead");
  });

  it("manual lead creation does not send email notification", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    await agent.post("/api/growth/leads").send({
      fullName: "Manual Only",
      email: "manual@example.com",
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("PATCH /api/growth/leads/:id/stage moves lead via drag-drop API", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    await request(app)
      .post(`/api/public/growth/${tenant.slug}/leads`)
      .send({ payload: { fullName: "Sam Lee", email: "sam@example.com" } });

    const leads = await agent.get("/api/growth/leads");
    const leadId = leads.body.leads[0].id;

    const moved = await agent.patch(`/api/growth/leads/${leadId}/stage`).send({ stageSlug: "contacted" });
    expect(moved.status).toBe(200);

    const board = await agent.get("/api/growth/pipeline/board");
    expect(board.body.leadsByStage.contacted).toHaveLength(1);
    expect(board.body.leadsByStage.new ?? []).toHaveLength(0);
  });
});
