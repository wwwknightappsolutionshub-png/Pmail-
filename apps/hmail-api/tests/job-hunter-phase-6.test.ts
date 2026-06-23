import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

const MOCK_PREP = {
  questions: [
    {
      question: "Tell me about a time you led a cross-functional project.",
      answerOutline: ["Set context and goal", "Explain your role", "Share measurable outcome"],
      tips: ["Use STAR format", "Quantify impact"],
    },
    {
      question: "Why are you interested in this role?",
      answerOutline: ["Company mission alignment", "Role fit with skills", "Growth opportunity"],
      tips: ["Be specific to the posting"],
    },
    {
      question: "Describe a challenging stakeholder situation.",
      answerOutline: ["Conflict context", "Actions taken", "Resolution"],
      tips: ["Stay professional"],
    },
    {
      question: "How do you prioritize competing deadlines?",
      answerOutline: ["Assessment framework", "Communication", "Delivery example"],
      tips: ["Mention tools or rituals"],
    },
    {
      question: "What questions do you have for us?",
      answerOutline: ["Team structure", "Success metrics", "Next steps"],
      tips: ["Prepare 3 questions"],
    },
  ],
  generalTips: ["Research the company", "Prepare 2 STAR stories", "Test your video setup"],
};

vi.mock("../src/services/job-hunter-llm.service.js", () => ({
  isJobHunterLlmConfigured: vi.fn(async () => true),
  callJobHunterLlmJson: vi.fn(async () => MOCK_PREP),
  JobHunterLlmUnavailableError: class JobHunterLlmUnavailableError extends Error {
    name = "JobHunterLlmUnavailableError";
    constructor() {
      super("Job Hunter AI is not configured. Set MARKETING_AI_API_KEY or OPENAI_API_KEY.");
    }
  },
}));

async function unlockCareerWorkspace(userId: string, tenantId: string) {
  await testPrisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: true,
      careerScore: 50,
      enabled: true,
    },
    update: {
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: true,
      careerScore: 50,
      enabled: true,
    },
  });
}

describe("Job Hunter Phase 6 — job sites & interview prep", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/job-hunter/job-sites requires auth", async () => {
    const res = await request(app).get("/api/job-hunter/job-sites");
    expect(res.status).toBe(401);
  });

  it("GET /api/job-hunter/job-sites returns 403 when career nav locked", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await testPrisma.userJobHunterSettings.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tierBDisclosureAcceptedAt: new Date(),
        careerScore: 5,
        manualJobHuntingOverride: false,
      },
    });

    const res = await agent.get("/api/job-hunter/job-sites");
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("career_nav_locked");
  });

  it("job-sites CRUD persists links for user", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const linkedIn = await agent.post("/api/job-hunter/job-sites").send({
      label: "LinkedIn",
      url: "https://www.linkedin.com/jobs/",
    });
    expect(linkedIn.status).toBe(201);
    expect(linkedIn.body.link.label).toBe("LinkedIn");

    const indeed = await agent.post("/api/job-hunter/job-sites").send({
      label: "Indeed",
      url: "https://www.indeed.com/",
    });
    expect(indeed.status).toBe(201);

    const list = await agent.get("/api/job-hunter/job-sites");
    expect(list.status).toBe(200);
    expect(list.body.links).toHaveLength(2);

    const updated = await agent.patch(`/api/job-hunter/job-sites/${linkedIn.body.link.id}`).send({
      label: "LinkedIn Jobs",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.link.label).toBe("LinkedIn Jobs");

    const deleted = await agent.delete(`/api/job-hunter/job-sites/${indeed.body.link.id}`);
    expect(deleted.status).toBe(204);

    const afterDelete = await agent.get("/api/job-hunter/job-sites");
    expect(afterDelete.body.links).toHaveLength(1);
    expect(afterDelete.body.links[0].url).toMatch(/linkedin/i);
  });

  it("POST /api/job-hunter/interview-prep requires auth", async () => {
    const res = await request(app).post("/api/job-hunter/interview-prep").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/job-hunter/interview-prep returns 400 when job description missing", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const res = await agent.post("/api/job-hunter/interview-prep").send({
      targetRole: "Product Manager",
      region: "US",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/jobDescription or applicationId/i);
  });

  it("POST /api/job-hunter/interview-prep returns mock LLM prep output", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const res = await agent.post("/api/job-hunter/interview-prep").send({
      jobDescription:
        "We are hiring a Senior Product Manager to own roadmap for a B2B SaaS platform. Responsibilities include discovery, PRD writing, stakeholder alignment, and measuring adoption across enterprise customers.",
      targetRole: "Senior Product Manager",
      region: "UK",
    });

    expect(res.status).toBe(200);
    expect(res.body.prep.questions.length).toBeGreaterThanOrEqual(4);
    expect(res.body.prep.region).toBe("UK");
    expect(res.body.prep.questions[0].question).toBeTruthy();
    expect(res.body.prep.generalTips.length).toBeGreaterThan(0);
  });
});
