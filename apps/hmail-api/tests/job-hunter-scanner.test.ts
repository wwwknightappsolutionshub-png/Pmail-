import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { isCvLikeAttachment } from "../src/lib/cv-attachment-detect.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import { createAuthenticatedAgent, grantAddonTrial, resetTestDatabase } from "./helpers.js";

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

describe("Job Hunter Phase 2 — CV scanner", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("cv-attachment-detect", () => {
    it("detects CV-like filenames and mimes", () => {
      expect(
        isCvLikeAttachment({ fileName: "John_Resume.pdf", mimeType: "application/pdf" }),
      ).toBe(true);
      expect(isCvLikeAttachment({ fileName: "invoice.pdf", mimeType: "application/pdf" })).toBe(false);
      expect(isCvLikeAttachment({ fileName: "photo.jpg", mimeType: "image/jpeg" })).toBe(false);
    });
  });

  it("GET /api/job-hunter/scanner/regions requires auth", async () => {
    const res = await request(app).get("/api/job-hunter/scanner/regions");
    expect(res.status).toBe(401);
  });

  it("GET /api/job-hunter/scanner/regions lists supported regions", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/job-hunter/scanner/regions");
    expect(res.status).toBe(200);
    expect(res.body.regions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "US" }),
        expect.objectContaining({ code: "CA" }),
        expect.objectContaining({ code: "UK" }),
        expect.objectContaining({ code: "ME" }),
        expect.objectContaining({ code: "INTL" }),
      ]),
    );
  });

  it("POST /api/job-hunter/scanner/rate requires auth", async () => {
    const res = await request(app).post("/api/job-hunter/scanner/rate").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/job-hunter/scanner/rate returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      dataBase64: Buffer.from("fake").toString("base64"),
      region: "US",
      fromToastOptIn: true,
    });
    expect(res.status).toBe(403);
  });

  it("POST /api/job-hunter/scanner/rate returns 400 for invalid region", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      dataBase64: Buffer.from("fake").toString("base64"),
      region: "EU",
      fromToastOptIn: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid region/i);
  });

  it("POST /api/job-hunter/scanner/rate returns 400 for invalid file type", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      dataBase64: Buffer.from("fake").toString("base64"),
      region: "US",
      fromToastOptIn: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF and Word/i);
  });

  it("POST /api/job-hunter/scanner/rate succeeds with mock LLM via toast opt-in", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      dataBase64: Buffer.from("fake-pdf").toString("base64"),
      region: "US",
      targetRole: "Software Engineer",
      fromToastOptIn: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.rating.overallScore).toBe(78);
    expect(res.body.rating.categories.ats.score).toBe(80);
    expect(res.body.rating.improvements.length).toBeGreaterThan(0);
  });

  it("POST /api/job-hunter/scanner/rate returns 503 when LLM is not configured", async () => {
    const llm = await import("../src/services/job-hunter-llm.service.js");
    vi.mocked(llm.isJobHunterLlmConfigured).mockResolvedValue(false);

    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const res = await agent.post("/api/job-hunter/scanner/rate").send({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      dataBase64: Buffer.from("fake-pdf").toString("base64"),
      region: "UK",
      fromToastOptIn: true,
    });
    expect(res.status).toBe(503);
    expect(String(res.body?.error ?? "")).toMatch(/not configured/i);

    vi.mocked(llm.isJobHunterLlmConfigured).mockResolvedValue(true);
  });
});
