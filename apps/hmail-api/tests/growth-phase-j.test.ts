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

async function upgradeToPro(tenant: { slug: string }) {
  const checkout = await request(app).post("/api/payments/checkout").send({
    provider: "mock",
    productType: "addon",
    productSlug: "prohost-growth-pro",
    tenantSlug: tenant.slug,
    customerEmail: "owner@growth.test",
  });
  await completePaymentCheckout(checkout.body.checkout.id);
}

describe("Prohost Growth Phase J", () => {
  beforeEach(async () => {
    emailMock.mockClear();
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  }, 60000);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("seeds channel deliveries after content bundle (channels_ready)", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findFirst();
    expect(workspace?.status).toBe("channels_ready");

    const deliveries = await testPrisma.growthChannelDelivery.findMany();
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries.some((d) => d.channelType === "social_post" && d.status === "scheduled")).toBe(true);
  });

  it("GET /api/growth/channels/assets lists social and email assets", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const res = await agent.get("/api/growth/channels/assets");
    expect(res.status).toBe(200);
    expect(res.body.assets.some((a: { assetType: string }) => a.assetType === "social_post")).toBe(true);
    expect(res.body.assets.some((a: { assetType: string }) => a.assetType === "email_sequence")).toBe(true);
  });

  it("POST /api/growth/channels/social/:id/send emails copy pack on Pro plan", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToPro(tenant);

    const assets = await agent.get("/api/growth/channels/assets");
    const social = assets.body.assets.find((a: { assetType: string }) => a.assetType === "social_post");

    const sent = await agent.post(`/api/growth/channels/social/${social.id}/send`).send({});
    expect(sent.status).toBe(200);
    expect(sent.body.delivery.status).toBe("sent");
    expect(emailMock).toHaveBeenCalled();
  });

  it("blocks channel send on starter plan", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const assets = await agent.get("/api/growth/channels/assets");
    const social = assets.body.assets.find((a: { assetType: string }) => a.assetType === "social_post");

    const sent = await agent.post(`/api/growth/channels/social/${social.id}/send`).send({});
    expect(sent.status).toBe(403);
    expect(sent.body.code).toBe("feature_locked");
  });

  it("POST /api/growth/channels/bootstrap ensures channels_ready", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const boot = await agent.post("/api/growth/channels/bootstrap").send({});
    expect(boot.status).toBe(200);
    expect(boot.body.workspaceStatus).toBe("channels_ready");
  });
});
