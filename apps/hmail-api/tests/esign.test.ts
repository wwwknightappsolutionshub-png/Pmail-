import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { mapDropboxSignStatus } from "../src/lib/esign-mime.js";
import { ESIGN_FROM_EMAIL_ADDON_SLUG, createEsignDownloadToken } from "../src/services/esign.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

const PDF_BASE64 =
  "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXT4+CmVuZG9iago=e";

describe("e-sign from email (Phase 1.6)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("mapDropboxSignStatus", () => {
    it("maps provider states to internal statuses", () => {
      expect(mapDropboxSignStatus({ isComplete: true, isDeclined: false, hasError: false })).toBe("signed");
      expect(mapDropboxSignStatus({ isComplete: false, isDeclined: true, hasError: false })).toBe("declined");
      expect(
        mapDropboxSignStatus({
          isComplete: false,
          isDeclined: false,
          hasError: false,
          signatures: [{ statusCode: "expired" }],
        }),
      ).toBe("expired");
    });
  });

  it("GET /api/mail/esign requires auth", async () => {
    const res = await request(app).get("/api/mail/esign");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/esign returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/esign");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/esign lists requests when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ESIGN_FROM_EMAIL_ADDON_SLUG);

    await testPrisma.mailEsignRequest.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        status: "awaiting_signature",
        documentName: "contract.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200,
        storagePath: "contract.pdf",
        downloadToken: createEsignDownloadToken(),
        expiresAt: new Date(Date.now() + 86400000),
        signerEmail: "signer@test.local",
        signerName: "Signer Test",
        subject: "Please sign",
        message: "Review attached",
      },
    });

    const res = await agent.get("/api/mail/esign");
    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].documentName).toBe("contract.pdf");
  });

  it("POST /api/mail/esign/upload creates request in test mode", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ESIGN_FROM_EMAIL_ADDON_SLUG);

    const res = await agent.post("/api/mail/esign/upload").send({
      fileName: "agreement.pdf",
      mimeType: "application/pdf",
      dataBase64: PDF_BASE64,
      signerEmail: "client@test.local",
      signerName: "Client Test",
      subject: "Agreement",
      message: "Please sign this agreement",
    });
    expect(res.status).toBe(201);
    expect(res.body.request.documentName).toBe("agreement.pdf");
    expect(res.body.request.status).toBe("awaiting_signature");
    expect(res.body.request.documentDownloadUrl).toMatch(/\/api\/public\/esign\//);
  });

  it("GET /api/public/esign/:token downloads stored document", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ESIGN_FROM_EMAIL_ADDON_SLUG);

    const PDF_BASE64 =
      Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");

    const created = await agent.post("/api/mail/esign/upload").send({
      fileName: "download.pdf",
      mimeType: "application/pdf",
      dataBase64: PDF_BASE64,
      signerEmail: "signer@test.local",
      signerName: "Signer Test",
      subject: "Please sign",
      message: "",
    });
    expect(created.status).toBe(201);

    const row = await testPrisma.mailEsignRequest.findFirst({
      where: { documentName: "download.pdf" },
    });
    expect(row?.downloadToken).toBeTruthy();

    const res = await request(app).get(`/api/public/esign/${row!.downloadToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");

    const updated = await testPrisma.mailEsignRequest.findUnique({ where: { id: row!.id } });
    expect(updated?.downloadCount).toBe(1);
  });

  it("POST /api/mail/esign/:id/refresh returns existing row in test mode", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ESIGN_FROM_EMAIL_ADDON_SLUG);

    const row = await testPrisma.mailEsignRequest.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        providerRequestId: "test-refresh-id",
        status: "awaiting_signature",
        documentName: "refresh.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 900,
        storagePath: "refresh.pdf",
        downloadToken: createEsignDownloadToken(),
        expiresAt: new Date(Date.now() + 86400000),
        signerEmail: "signer@test.local",
        signerName: "Signer Test",
        subject: "Please sign",
        message: "",
      },
    });

    const res = await agent.post(`/api/mail/esign/${row.id}/refresh`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("awaiting_signature");
  });
});
