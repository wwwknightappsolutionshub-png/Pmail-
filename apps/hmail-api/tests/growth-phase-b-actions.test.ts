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

async function upgradeToProPlan(tenantId: string) {
  const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId } });
  if (!workspace) return;
  await testPrisma.growthWorkspaceSettings.updateMany({
    where: { workspaceId: workspace.id },
    data: { planSlug: "pro" },
  });
}

describe("Prohost Growth Phase B actions", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedGrowthPromptTemplates();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POST /content/regenerate queues a new bundle without clearing wizard", async () => {
    const { agent, tenant } = await createPanelAgent(app);
    await completeWizard(agent);

    const regen = await agent.post("/api/growth/content/regenerate").send({});
    expect(regen.status).toBe(200);
    expect(regen.body.job.jobType).toBe("content_bundle");

    await processGrowthJobQueue();

    const workspace = await testPrisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
    expect(workspace?.status).toBe("channels_ready");
    expect(workspace?.wizardCompletedAt).toBeTruthy();
  });

  it("POST /content/assets/:id/publish writes HTML to panel public_html", async () => {
    const { agent, hostingAccountId } = await createPanelAgent(app);
    await completeWizard(agent);

    const list = await agent.get("/api/growth/content/assets?type=homepage_copy");
    const assetId = list.body.assets[0]?.id;
    expect(assetId).toBeTruthy();

    const publish = await agent.post(`/api/growth/content/assets/${assetId}/publish`).send({});
    expect(publish.status).toBe(200);
    expect(publish.body.published.panelPath).toContain("public_html/index.html");

    const file = await testPrisma.panelFileEntry.findFirst({
      where: { accountId: hostingAccountId, parentPath: "/public_html", name: "index.html" },
    });
    expect(file?.content).toContain("Acme Plumbing");
  });

  it("POST /content/publish publishes homepage, landing, and blog files", async () => {
    const { agent, hostingAccountId, tenant } = await createPanelAgent(app);
    await completeWizard(agent);
    await upgradeToProPlan(tenant.id);

    const publish = await agent.post("/api/growth/content/publish").send({});
    expect(publish.status).toBe(200);
    expect(publish.body.publishedCount).toBeGreaterThanOrEqual(12);

    const index = await testPrisma.panelFileEntry.findFirst({
      where: { accountId: hostingAccountId, name: "index.html" },
    });
    expect(index).toBeTruthy();

    const blogCount = await testPrisma.panelFileEntry.count({
      where: { accountId: hostingAccountId, parentPath: "/public_html/blog", type: "file" },
    });
    expect(blogCount).toBe(10);
  });
});
