import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  APPLY_ASSIST_CREDITS_PER_PACK,
  JOB_APPLY_ASSIST_ADDON_SLUG,
} from "../src/services/job-hunter-apply-assist.service.js";
import { publishCvDocumentToUserDocuments } from "../src/services/job-hunter-documents.service.js";
import { createCvDocument } from "../src/services/job-hunter-cv.service.js";
import { mockCompleteCheckout } from "../src/services/payment.service.js";
import { sendMail } from "../src/services/smtp.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  grantApplyAssistCredits,
  resetTestDatabase,
  testPrisma,
  unlockCareerWorkspace,
} from "./helpers.js";

const MOCK_EMAIL_PREFILL = {
  subject: "Application — Software Engineer",
  bodyText: "Dear hiring team,\n\nPlease find my application attached.\n\nBest regards,\nAlex",
  bodyHtml: "<p>Dear hiring team,</p><p>Please find my application attached.</p>",
  company: "Acme Corp",
};

vi.mock("../src/services/smtp.service.js", () => ({
  sendMail: vi.fn(async () => ({ messageId: "<apply-assist-test@mock>" })),
}));

vi.mock("../src/services/job-hunter-llm.service.js", () => ({
  isJobHunterLlmConfigured: vi.fn(async () => true),
  callJobHunterLlmJson: vi.fn(async () => MOCK_EMAIL_PREFILL),
  JobHunterLlmUnavailableError: class JobHunterLlmUnavailableError extends Error {
    name = "JobHunterLlmUnavailableError";
    constructor() {
      super("Job Hunter AI is not configured. Set MARKETING_AI_API_KEY or OPENAI_API_KEY.");
    }
  },
}));

async function setupApplyAssistUser(app: ReturnType<typeof createApp>) {
  const ctx = await createAuthenticatedAgent(app);
  await grantAddonTrial(ctx.tenant.id, JOB_HUNTER_ADDON_SLUG);
  await grantAddonTrial(ctx.tenant.id, JOB_APPLY_ASSIST_ADDON_SLUG);
  await unlockCareerWorkspace(ctx.user.id, ctx.tenant.id);
  await grantApplyAssistCredits(ctx.tenant.id, ctx.user.id, 5);
  return ctx;
}

describe("Job Hunter Phase 8 — Apply Assist", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    vi.mocked(sendMail).mockClear();
  });

  it("GET /api/job-hunter/apply-assist/wallet requires auth", async () => {
    const res = await request(app).get("/api/job-hunter/apply-assist/wallet");
    expect(res.status).toBe(401);
  });

  it("GET /api/job-hunter/apply-assist/wallet returns 403 without apply-assist addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/job-hunter/apply-assist/wallet");
    expect(res.status).toBe(403);
  });

  it("email-apply: queue → prefill → confirm sends mail and deducts 1 credit", async () => {
    const { agent, user, tenant } = await setupApplyAssistUser(app);
    const cv = await createCvDocument(user.id, { title: "Apply CV", region: "US" });
    const doc = await publishCvDocumentToUserDocuments(user.id, tenant.id, cv.id);

    const queueRes = await agent.post("/api/job-hunter/apply-assist/queue").send({
      channel: "email_apply",
      targetRole: "Software Engineer",
      region: "US",
      careersEmail: "careers@acme.example",
      company: "Acme Corp",
      userDocumentId: doc.id,
    });
    expect(queueRes.status).toBe(201);

    const prefillRes = await agent.post(`/api/job-hunter/apply-assist/queue/${queueRes.body.item.id}/prefill`);
    expect(prefillRes.status).toBe(200);
    expect(prefillRes.body.item.prefilled.subject).toContain("Application");

    const beforeWallet = await agent.get("/api/job-hunter/apply-assist/wallet");
    expect(beforeWallet.body.wallet.balance).toBe(5);

    const confirmRes = await agent.post(`/api/job-hunter/apply-assist/queue/${queueRes.body.item.id}/confirm`).send({});
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.wallet.balance).toBe(4);
    expect(confirmRes.body.application.company).toBe("Acme Corp");
    expect(sendMail).toHaveBeenCalledTimes(1);

    const apps = await agent.get("/api/job-hunter/applications");
    expect(apps.body.applications.some((a: { id: string }) => a.id === confirmRes.body.application.id)).toBe(true);
  });

  it("does not deduct credits when prefill fails", async () => {
    const llm = await import("../src/services/job-hunter-llm.service.js");
    vi.mocked(llm.callJobHunterLlmJson).mockResolvedValueOnce({ subject: "x", bodyText: "", bodyHtml: "" });

    const { agent, user, tenant } = await setupApplyAssistUser(app);
    const queueRes = await agent.post("/api/job-hunter/apply-assist/queue").send({
      channel: "email_apply",
      targetRole: "Engineer",
      region: "US",
      careersEmail: "jobs@company.example",
    });
    expect(queueRes.status).toBe(201);

    const prefillRes = await agent.post(`/api/job-hunter/apply-assist/queue/${queueRes.body.item.id}/prefill`);
    expect(prefillRes.status).toBe(400);

    const wallet = await agent.get("/api/job-hunter/apply-assist/wallet");
    expect(wallet.body.wallet.balance).toBe(5);
  });

  it("enforces 20 confirmed assists per day", async () => {
    const { agent, user, tenant } = await setupApplyAssistUser(app);
    await grantApplyAssistCredits(tenant.id, user.id, 20);

    const now = new Date();
    for (let i = 0; i < 20; i += 1) {
      await testPrisma.jobApplyAssistQueue.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          channel: "email_apply",
          status: "confirmed",
          targetRole: "Engineer",
          region: "US",
          confirmedAt: now,
        },
      });
    }

    const cv = await createCvDocument(user.id, { title: "Cap CV", region: "US" });
    const doc = await publishCvDocumentToUserDocuments(user.id, tenant.id, cv.id);
    const queueRes = await agent.post("/api/job-hunter/apply-assist/queue").send({
      channel: "email_apply",
      targetRole: "Engineer",
      region: "US",
      careersEmail: "cap@example.com",
      userDocumentId: doc.id,
    });
    await agent.post(`/api/job-hunter/apply-assist/queue/${queueRes.body.item.id}/prefill`);

    const confirmRes = await agent.post(`/api/job-hunter/apply-assist/queue/${queueRes.body.item.id}/confirm`).send({});
    expect(confirmRes.status).toBe(429);
    expect(confirmRes.body.reason).toBe("apply_assist_daily_cap");
  });

  it("purchase credits increases wallet balance after checkout completes", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_APPLY_ASSIST_ADDON_SLUG);

    const purchaseRes = await agent.post("/api/job-hunter/apply-assist/purchase").send({ provider: "mock" });
    expect(purchaseRes.status).toBe(201);

    await mockCompleteCheckout(purchaseRes.body.checkout.id);

    const wallet = await agent.get("/api/job-hunter/apply-assist/wallet");
    expect(wallet.status).toBe(200);
    expect(wallet.body.wallet.balance).toBe(APPLY_ASSIST_CREDITS_PER_PACK);
    void user;
  });
});
