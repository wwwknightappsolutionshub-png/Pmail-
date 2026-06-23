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

const MOCK_RATING = {
  overallScore: 78,
  categories: {
    ats: { score: 80, notes: "Good heading structure" },
    format: { score: 75, notes: "Clean layout" },
    keywords: { score: 70, notes: "Add more role keywords" },
    sections: { score: 82, notes: "Experience and education present" },
  },
  regionNotes: "US one-page preference noted.",
  improvements: ["Quantify achievements with metrics", "Add a skills section with ATS keywords"],
  targetRole: "Software Engineer",
  region: "US",
  fileName: "resume.pdf",
};

vi.mock("../src/lib/cv-text-extract.js", () => ({
  CV_SCANNER_ALLOWED_MIMES: new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ]),
  normalizeCvMimeType: (_mime: string, fileName: string) =>
    fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
  extractTextFromCv: vi.fn(async () =>
    "Professional Summary\nExperience\nSoftware Engineer at Acme Corp\nEducation\nBS Computer Science\nSkills\nJavaScript TypeScript",
  ),
}));

vi.mock("../src/services/job-hunter-llm.service.js", () => ({
  isJobHunterLlmConfigured: vi.fn(async () => true),
  callJobHunterLlmJson: vi.fn(async () => MOCK_RATING),
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

describe("Job Hunter Career Hub — templates & dashboard API", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/job-hunter/cv/templates returns grouped professions with four samples each", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const res = await agent.get("/api/job-hunter/cv/templates");
    expect(res.status).toBe(200);
    expect(res.body.groupedByProfession).toBeInstanceOf(Array);
    expect(res.body.groupedByProfession.length).toBeGreaterThanOrEqual(17);

    for (const group of res.body.groupedByProfession) {
      expect(group.templates.length).toBe(4);
      expect(group.label).toBeTruthy();
      for (const template of group.templates) {
        expect(template.experienceLevel).toMatch(/^(entry|mid|senior)$/);
        expect(template.title).toBeTruthy();
        expect(template.description).toBeTruthy();
      }
    }

    expect(res.body.filters.experienceLevels).toEqual(["entry", "mid", "senior"]);
    expect(res.body.filters.professions.length).toBeGreaterThanOrEqual(17);

    const ukLegal = res.body.groupedByProfession.find((g: { profession: string }) => g.profession === "legal");
    expect(ukLegal?.templates.every((t: { region: string }) => t.region === "UK")).toBe(true);
    expect(ukLegal?.templates.length).toBe(4);
  });

  it("GET /api/job-hunter/cv/templates filters by country and experience level", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const ukRes = await agent.get("/api/job-hunter/cv/templates?region=UK&experienceLevel=entry");
    expect(ukRes.status).toBe(200);
    expect(ukRes.body.templates.length).toBeGreaterThan(0);
    expect(ukRes.body.templates.every((t: { region: string }) => t.region === "UK")).toBe(true);
    expect(ukRes.body.templates.every((t: { experienceLevel: string }) => t.experienceLevel === "entry")).toBe(true);
  });

  it("GET /api/job-hunter/cv/templates sorts by country when requested", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const res = await agent.get("/api/job-hunter/cv/templates?sortBy=country");
    expect(res.status).toBe(200);
    const regions = res.body.templates.map((t: { region: string }) => t.region);
    const sorted = [...regions].sort((a, b) => a.localeCompare(b));
    expect(regions).toEqual(sorted);
  });

  it("POST /api/job-hunter/cv/documents creates ATS-ready document from hub template", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const templatesRes = await agent.get("/api/job-hunter/cv/templates?role=engineering");
    const templateId = templatesRes.body.templates[0].id;

    const createRes = await agent.post("/api/job-hunter/cv/documents").send({ templateId, region: "US" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.document.content.fullName).toBeTruthy();
    expect(createRes.body.document.content.experience.length).toBeGreaterThan(0);
    expect(createRes.body.document.content.skills.length).toBeGreaterThan(0);
  });

  it("POST /api/job-hunter/scanner/rate benchmarks uploaded CV with suggestions", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const minimalPdfBase64 =
      "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKENWKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMjEgMDAwMDAgbiAKMDAwMDAwMDIxOCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI5NwolJUVPRg==";

    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      dataBase64: minimalPdfBase64,
      region: "US",
      targetRole: "Software Engineer",
    });

    expect(res.status).toBe(200);
    expect(res.body.rating.overallScore).toBeGreaterThan(0);
    expect(res.body.rating.improvements.length).toBeGreaterThan(0);
    expect(res.body.rating.regionNotes).toBeTruthy();
    expect(res.body.rating.categories.ats.score).toBeGreaterThan(0);
  });
});
