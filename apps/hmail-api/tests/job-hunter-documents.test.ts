import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { publishCvDocumentToUserDocuments } from "../src/services/job-hunter-documents.service.js";
import { createCvDocument } from "../src/services/job-hunter-cv.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import { sendMail } from "../src/services/smtp.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

vi.mock("../src/services/imap.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/imap.service.js")>();
  return {
    ...actual,
    verifyImapLogin: vi.fn(async () => undefined),
    appendToSentFolder: vi.fn(async () => "Sent"),
  };
});

vi.mock("../src/services/smtp.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/smtp.service.js")>();
  return {
    ...actual,
    verifySmtpLogin: vi.fn(async () => undefined),
    sendMail: vi.fn(async () => ({ messageId: "<job-hunter-documents-test@mock>" })),
  };
});

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

describe("Job Hunter Phase 5 — documents index", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    vi.mocked(sendMail).mockClear();
  });

  it("POST /api/job-hunter/documents/publish requires auth", async () => {
    const res = await request(app).post("/api/job-hunter/documents/publish").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/job-hunter/documents/publish returns 403 without addon or career unlock", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    const cv = await createCvDocument(user.id, { title: "Test CV", region: "UK" });
    const res = await agent.post("/api/job-hunter/documents/publish").send({ cvDocumentId: cv.id });
    expect(res.status).toBe(403);
  });

  it("publish creates pinned UserDocument and list sorts pinned first", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const cv = await createCvDocument(user.id, { title: "Pinned CV", region: "UK" });
    const published = await agent.post("/api/job-hunter/documents/publish").send({ cvDocumentId: cv.id });
    expect(published.status).toBe(201);
    expect(published.body.document.isPinned).toBe(true);
    expect(published.body.document.isCareerCv).toBe(true);

    const unpinnedCv = await createCvDocument(user.id, { title: "Older CV", region: "US" });
    await publishCvDocumentToUserDocuments(user.id, tenant.id, unpinnedCv.id, { isPinned: false });

    const list = await agent.get("/api/mail/documents");
    expect(list.status).toBe(200);
    expect(list.body.documents).toHaveLength(2);
    expect(list.body.documents[0].isPinned).toBe(true);
    expect(list.body.documents[0].filename).toMatch(/Pinned-CV/i);
  });

  it("PATCH /api/mail/documents/:id/pin unpins document but keeps it in list", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const cv = await createCvDocument(user.id, { title: "Toggle CV", region: "CA" });
    const published = await agent.post("/api/job-hunter/documents/publish").send({ cvDocumentId: cv.id });
    const documentId = published.body.document.id as string;

    const unpinned = await agent.patch(`/api/mail/documents/${documentId}/pin`).send({ isPinned: false });
    expect(unpinned.status).toBe(200);
    expect(unpinned.body.document.isPinned).toBe(false);

    const list = await agent.get("/api/mail/documents");
    expect(list.body.documents.some((doc: { id: string }) => doc.id === documentId)).toBe(true);
    expect(list.body.documents.every((doc: { isPinned: boolean }) => !doc.isPinned)).toBe(true);
  });

  it("GET /api/mail/documents/:id/download returns stored file bytes", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const cv = await createCvDocument(user.id, { title: "Download CV", region: "UK" });
    const published = await agent.post("/api/job-hunter/documents/publish").send({ cvDocumentId: cv.id });
    const documentId = published.body.document.id as string;

    const downloaded = await agent
      .get(`/api/mail/documents/${documentId}/download`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(downloaded.status).toBe(200);
    expect(downloaded.headers["content-type"]).toMatch(/application\/pdf/);
    expect((downloaded.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("POST /api/mail/send attaches career document via userDocumentIds", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);
    await testPrisma.userComposeSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, undoSendSeconds: 0 },
      update: { undoSendSeconds: 0 },
    });

    const cv = await createCvDocument(user.id, { title: "Send CV", region: "US" });
    const published = await agent.post("/api/job-hunter/documents/publish").send({ cvDocumentId: cv.id });
    const documentId = published.body.document.id as string;

    const res = await agent.post("/api/mail/send").send({
      to: "recruiter@example.com",
      subject: "Application with CV",
      text: "Please see attached CV.",
      userDocumentIds: [documentId],
    });

    expect(res.status).toBe(201);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mailInput = vi.mocked(sendMail).mock.calls[0]?.[0];
    expect(mailInput?.attachments?.length).toBe(1);
    expect(mailInput?.attachments?.[0]?.filename).toMatch(/Send-CV/i);
    expect(Buffer.isBuffer(mailInput?.attachments?.[0]?.content)).toBe(true);
  });
});
