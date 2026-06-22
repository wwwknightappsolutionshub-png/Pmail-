import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processGrowthJobQueue } from "../src/services/growth-orchestrator.service.js";
import { seedGrowthPromptTemplates } from "../src/services/growth-prompt-registry.service.js";
import { createPanelAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

const WIZARD_WITH_SITE = {
  step1: {
    businessName: "Acme Plumbing",
    industry: "Home services",
    website: "https://acme-plumbing.example",
    serviceArea: "Toronto GTA",
    productsServices: "Emergency plumbing, drain cleaning",
    averageCustomerValue: "$450",
    monthlyRevenueGoal: "$25000",
    monthlyMarketingBudget: "$2000",
  },
  step2: {
    idealCustomer: "Homeowners with urgent repair needs",
    customerProblems: "Leaks, clogs, no hot water",
    desiredOutcomes: "Fast fix, fair pricing",
    customerObjections: "Price, availability",
    existingCustomerExamples: "Jane on Oak St",
  },
  step3: {
    competitorUrls: ["https://competitor-a.test"],
    competitorNames: ["Rival Plumbing"],
    whyBetter: "Same-day service with upfront pricing",
    whyDifferent: "Digital booking and live ETA tracking",
  },
  step4: {
    mainOffer: "Free inspection + $49 drain clearing",
    upsells: "Annual maintenance plan",
    freeConsultation: true,
    discounts: "10% for seniors",
    guarantees: "30-day workmanship guarantee",
  },
  step5: { style: "friendly" as const, notes: "Plain language" },
  step6: { assets: [] },
};

const WIZARD_GREENFIELD = {
  ...WIZARD_WITH_SITE,
  step1: { ...WIZARD_WITH_SITE.step1, website: "" },
};

async function completeWizard(
  agent: Awaited<ReturnType<typeof createPanelAgent>>["agent"],
  wizard: typeof WIZARD_WITH_SITE = WIZARD_WITH_SITE,
) {
  for (const [step, payload] of Object.entries(wizard).map(([key, value], index) => [index + 1, value] as const)) {
    await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
  }
  await agent.post("/api/growth/wizard/complete").send({});
  await processGrowthJobQueue();
  await processGrowthJobQueue();
}

function mockPublicWebsiteHtml() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => "text/html" },
      arrayBuffer: async () =>
        new TextEncoder().encode(
          `<html><head><title>Acme Plumbing</title><meta name="description" content="Toronto plumber" /></head><body><h1>Old headline</h1><a href="/contact">Contact</a></body></html>`,
        ).buffer,
    }),
  );
}

describe("Prohost Growth Phase B", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates existing-site bundle when wizard includes a website URL", async () => {
    mockPublicWebsiteHtml();
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(workspace?.status).toBe("channels_ready");

    const bundleRes = await agent.get("/api/growth/content/bundle");
    expect(bundleRes.status).toBe(200);
    expect(bundleRes.body.summary.hasBundle).toBe(true);
    expect(bundleRes.body.summary.contentMode).toBe("existing_site");
    expect(bundleRes.body.summary.totalAssets).toBeGreaterThanOrEqual(47);

    const assetsRes = await agent.get("/api/growth/content/assets");
    const types = new Set(assetsRes.body.assets.map((a: { assetType: string }) => a.assetType));
    expect(types.has("website_audit")).toBe(true);
    expect(types.has("seo_recommendations")).toBe(true);
    expect(types.has("blog_post")).toBe(true);

    const homepage = assetsRes.body.assets.find((a: { assetType: string }) => a.assetType === "homepage_copy");
    expect(homepage.body.contentMode).toBe("improvement");
    expect(homepage.body.suggestedHeroHeadline).toBeTruthy();
    expect(homepage.body.doNotReplaceSite).toBe(true);

    const blog = assetsRes.body.assets.find((a: { assetType: string }) => a.assetType === "blog_post");
    expect(blog.body.contentStrategy).toBe("gap_filling");
  });

  it("generates greenfield bundle when wizard has no website", async () => {
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent, WIZARD_GREENFIELD);

    const bundleRes = await agent.get("/api/growth/content/bundle");
    expect(bundleRes.body.summary.contentMode).toBe("greenfield");

    const assetsRes = await agent.get("/api/growth/content/assets");
    const types = new Set(assetsRes.body.assets.map((a: { assetType: string }) => a.assetType));
    expect(types.has("website_audit")).toBe(false);
    expect(types.has("seo_recommendations")).toBe(false);

    const homepage = assetsRes.body.assets.find((a: { assetType: string }) => a.assetType === "homepage_copy");
    expect(homepage.body.contentMode).toBe("greenfield");
    expect(homepage.body.heroHeadline).toBeTruthy();

    const blog = assetsRes.body.assets.find((a: { assetType: string }) => a.assetType === "blog_post");
    expect(blog.body.contentStrategy).toBe("greenfield");
  });

  it("agent runs include website-aware market research when URL provided", async () => {
    mockPublicWebsiteHtml();
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const runs = await agent.get("/api/growth/agent-runs");
    const market = runs.body.runs.find((r: { agentKey: string }) => r.agentKey === "market_research");
    expect(market?.output?.contentMode).toBe("existing_site");
    expect(market?.output?.existingWebsite?.url).toBe("https://acme-plumbing.example");
    expect(market?.output?.existingWebsite?.analyzed).toBe(true);
  });

  it("GET /api/growth/content/assets/:id returns single homepage asset", async () => {
    mockPublicWebsiteHtml();
    const { agent } = await createPanelAgent(app);
    await completeWizard(agent);

    const list = await agent.get("/api/growth/content/assets?type=homepage_copy");
    const assetId = list.body.assets[0]?.id;
    expect(assetId).toBeTruthy();

    const detail = await agent.get(`/api/growth/content/assets/${assetId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.asset.assetType).toBe("homepage_copy");
    expect(
      detail.body.asset.body.suggestedHeroHeadline ?? detail.body.asset.body.heroHeadline,
    ).toBeTruthy();
  });

  it("backfills content bundle for foundation_ready workspaces without assets", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    for (const [step, payload] of Object.entries(WIZARD_WITH_SITE).map(
      ([key, value], index) => [index + 1, value] as const,
    )) {
      await agent.put(`/api/growth/wizard/step/${step}`).send(payload);
    }
    await agent.post("/api/growth/wizard/complete").send({});
    await processGrowthJobQueue();

    const stuck = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(stuck?.status).toBe("foundation_ready");

    const bundleRes = await agent.get("/api/growth/content/bundle");
    expect(bundleRes.status).toBe(200);
    expect(bundleRes.body.summary.hasBundle).toBe(false);

    await processGrowthJobQueue();

    const ready = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(ready?.status).toBe("channels_ready");
    expect((await agent.get("/api/growth/content/bundle")).body.summary.hasBundle).toBe(true);
  });
});
