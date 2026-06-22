import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { completePaymentCheckout } from "../src/services/payment.service.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const llmMock = vi.fn();
const fetchMock = vi.fn();

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

describe("Prohost Growth requirements (O/I/J ops)", () => {
  beforeEach(async () => {
    llmMock.mockReset();
    fetchMock.mockReset();
    emailMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);

    llmMock.mockImplementation(async (input: { messages?: Array<{ role: string; content: string }> }) => {
      const user = input.messages?.find((m) => m.role === "user")?.content ?? "";
      if (user.includes("optimization") || user.includes("Analytics")) {
        return JSON.stringify({
          weeklyBrief: "- Pause Meta campaign with 0 conversions\n- Publish blog on emergency plumbing\n- Shift $200 to search",
          insights: [
            {
              category: "ads",
              priority: "high",
              title: "Pause underperforming Meta campaign",
              summary: "Meta spend $420 with 0 leads — pause and reallocate to search.",
              actionLabel: "Review ads",
              actionTarget: "/growth/ads-seo",
            },
          ],
        });
      }
      if (user.includes("homepage_copy") || user.includes("Asset type")) {
        return JSON.stringify({ heroHeadline: "LLM Hero Headline", generationMode: "llm" });
      }
      return JSON.stringify({ summary: "LLM ok", generationMode: "llm" });
    });

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

  it("optimization refresh merges AI insights and stores weekly brief", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToPro(tenant);

    const refresh = await agent.post("/api/growth/optimization/refresh").send({});
    expect(refresh.status).toBe(200);
    expect(refresh.body.weeklyBrief?.briefMarkdown).toContain("Pause Meta");

    const summary = await agent.get("/api/growth/optimization");
    expect(summary.body.aiInsightCount).toBeGreaterThan(0);
    expect(summary.body.weeklyBrief).toBeTruthy();
    const aiInsight = summary.body.insights.find((i: { metrics?: { source?: string } }) => i.metrics?.source === "ai");
    expect(aiInsight?.title).toContain("Pause");
  });

  it("content bundle uses LLM generationMode when configured", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const assets = await agent.get("/api/growth/content/assets");
    const homepage = assets.body.assets.find((a: { assetType: string }) => a.assetType === "homepage_copy");
    expect(homepage?.body?.generationMode).toBe("llm");

    const adCopy = assets.body.assets.find((a: { assetType: string }) => a.assetType === "ad_copy");
    expect(adCopy).toBeTruthy();
  });

  it("channel integrations connect and Meta publish skips email pack", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "meta-post-123" }),
    });

    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToPro(tenant);

    const connect = await agent.post("/api/growth/channels/integrations").send({
      provider: "meta",
      credentials: { pageAccessToken: "test-token", pageId: "page-1" },
      accountLabel: "Test Page",
    });
    expect(connect.status).toBe(201);
    expect(connect.body.integration.connected).toBe(true);

    const assets = await agent.get("/api/growth/channels/assets");
    const social = assets.body.assets.find((a: { assetType: string }) => a.assetType === "social_post");
    expect(social).toBeTruthy();

    const send = await agent.post(`/api/growth/channels/social/${social.id}/send`).send({});
    expect(send.status).toBe(200);
    expect(send.body.delivery.result.method).toBe("meta_api");
    expect(fetchMock).toHaveBeenCalled();
    expect(emailMock).not.toHaveBeenCalled();
  });

  it("ads-seo bootstrap creates campaigns and keyword ranks", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToPro(tenant);

    const res = await agent.get("/api/growth/ads-seo");
    expect(res.status).toBe(200);
    expect(res.body.campaigns.length).toBeGreaterThanOrEqual(2);
    expect(res.body.keywords.length).toBeGreaterThanOrEqual(5);

    const google = res.body.campaigns.find((c: { platform: string }) => c.platform === "google_ads");
    await agent.post("/api/growth/ads-seo/link-account").send({
      platform: "google_ads",
      credentials: { developerToken: "dev", customerId: "123" },
    });

    const sync = await agent.post(`/api/growth/ads-seo/campaigns/${google.id}/sync`).send({});
    expect(sync.status).toBe(200);
    expect(sync.body.campaign.externalId).toBeTruthy();

    const ranks = await agent.post("/api/growth/ads-seo/ranks/refresh").send({});
    expect(ranks.status).toBe(200);
    expect(ranks.body.keywords[0].currentRank).toBeTruthy();
  });

  it("weekly brief email endpoint sends when brief exists", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToPro(tenant);
    await agent.post("/api/growth/optimization/refresh").send({});

    const emailed = await agent.post("/api/growth/optimization/brief/email").send({});
    expect(emailed.status).toBe(200);
    expect(emailed.body.sent).toBe(true);
    expect(emailMock).toHaveBeenCalled();

    const brief = await testPrisma.growthWeeklyBrief.findFirst({});
    expect(brief?.emailedAt).toBeTruthy();
  });
});
