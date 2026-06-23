import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { FILE_VAULT_ADDON_SLUG } from "../src/services/file-vault.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

const PDF_BASE64 =
  "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9MZW5ndGggNCAwIFIvRmlsdGVyL0ZsYXRlRGVjb2RlPj4Kc3RyZWFtCnicYwrWDAwUTA0MDBT0DRT0DQAADMACCgplbmRzdHJlYW0KZW5kb2JqCjQgMCBvYmoKMTMKZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgMyAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMSAwIFJdL0NvdW50IDE+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTU0IDAwMDAwIG4gCjAwMDAwMDAyNDggMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDg5IDAwMDAwIG4gCjAwMDAwMDAzMTcgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCA1IDAgUj4+CnN0YXJ0eHJlZgo0MDMKJSVFT0Y=";

describe("file vault (Phase 1.2)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/mail/vault requires auth", async () => {
    const res = await request(app).get("/api/mail/vault");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/vault returns 403 without file-vault addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/vault");
    expect(res.status).toBe(403);
  });

  it("POST /api/mail/vault uploads and lists files when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, FILE_VAULT_ADDON_SLUG);

    const upload = await agent.post("/api/mail/vault").send({
      fileName: "proposal.pdf",
      mimeType: "application/pdf",
      dataBase64: PDF_BASE64,
    });
    expect(upload.status).toBe(201);
    expect(upload.body.file.originalName).toBe("proposal.pdf");
    expect(upload.body.file.downloadUrl).toMatch(/\/api\/public\/vault\//);
    expect(upload.body.file.downloadToken).toBeUndefined();

    const list = await agent.get("/api/mail/vault");
    expect(list.status).toBe(200);
    expect(list.body.files).toHaveLength(1);
    expect(list.body.files[0].downloadUrl).toMatch(/\/api\/public\/vault\//);

    const row = await testPrisma.mailVaultFile.findFirst({ where: { userId: user.id } });
    expect(row?.originalName).toBe("proposal.pdf");
  });

  it("GET /api/public/vault/:token downloads file and increments count", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const row = await testPrisma.mailVaultFile.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        originalName: "shared.pdf",
        storagePath: "missing-on-disk.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 12,
        downloadToken: "vault-download-token",
        expiresAt: expires,
      },
    });

    const { saveStoredFile } = await import("../src/services/file-storage.service.js");
    const stored = await saveStoredFile({
      namespace: "vault",
      tenantId: tenant.id,
      fileName: "shared.pdf",
      mimeType: "application/pdf",
      dataBase64: PDF_BASE64,
      maxBytes: 1024 * 1024,
      allowedMime: { "application/pdf": ".pdf" },
    });
    await testPrisma.mailVaultFile.update({
      where: { id: row.id },
      data: { storagePath: stored.storagePath },
    });

    const res = await request(app).get("/api/public/vault/vault-download-token");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/);
    expect(res.headers["x-tracking-notice"]).toMatch(/privacy/i);

    const updated = await testPrisma.mailVaultFile.findUnique({ where: { id: row.id } });
    expect(updated?.downloadCount).toBe(1);
  });

  it("GET /api/public/vault/:token returns 404 for expired link", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);
    await testPrisma.mailVaultFile.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        originalName: "old.pdf",
        storagePath: "old.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 12,
        downloadToken: "expired-vault-token",
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await request(app).get("/api/public/vault/expired-vault-token");
    expect(res.status).toBe(404);
  });

  it("DELETE /api/mail/vault/:id removes owned file when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, FILE_VAULT_ADDON_SLUG);

    const row = await testPrisma.mailVaultFile.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        originalName: "remove-me.pdf",
        storagePath: "remove-me.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 12,
        downloadToken: "remove-token",
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const del = await agent.delete(`/api/mail/vault/${row.id}`);
    expect(del.status).toBe(204);

    const gone = await testPrisma.mailVaultFile.findUnique({ where: { id: row.id } });
    expect(gone).toBeNull();
  });

  it("POST /api/mail/send returns 403 when vaultFileIds provided without addon", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    const row = await testPrisma.mailVaultFile.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        originalName: "blocked.pdf",
        storagePath: "blocked.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 12,
        downloadToken: "blocked-token",
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    const res = await agent.post("/api/mail/send").send({
      to: "client@example.com",
      subject: "Files",
      text: "See attached link",
      vaultFileIds: [row.id],
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/file vault/i);
  });
});
