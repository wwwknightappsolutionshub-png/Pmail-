import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  buildSlaThreadKey,
  computeSlaThreadStatus,
  normalizeSlaSubject,
} from "../src/lib/email-sla.js";
import {
  EMAIL_SLA_TRACKER_ADDON_SLUG,
  createSlaReportDownloadToken,
} from "../src/services/email-sla.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("email SLA tracker (Phase 2.1)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("email-sla lib", () => {
    it("normalizes subjects and builds stable thread keys", () => {
      expect(normalizeSlaSubject("Re: Fwd: Quote request")).toBe("Quote request");
      expect(buildSlaThreadKey("Re: Quote request", "client@test.local")).toBe("quote request|client@test.local");
    });

    it("computes thread status from deadlines", () => {
      const firstInboundAt = new Date("2025-06-01T10:00:00Z");
      const deadlineAt = new Date("2025-06-02T10:00:00Z");
      const atRiskAt = new Date("2025-06-01T20:00:00Z");
      expect(
        computeSlaThreadStatus({
          status: "open",
          respondedAt: null,
          dismissedAt: null,
          firstInboundAt,
          deadlineAt,
          atRiskAt,
          now: new Date("2025-06-01T12:00:00Z"),
        }),
      ).toBe("open");
      expect(
        computeSlaThreadStatus({
          status: "open",
          respondedAt: null,
          dismissedAt: null,
          firstInboundAt,
          deadlineAt,
          atRiskAt,
          now: new Date("2025-06-02T11:00:00Z"),
        }),
      ).toBe("breached");
    });
  });

  it("GET /api/mail/sla/settings requires auth", async () => {
    const res = await request(app).get("/api/mail/sla/settings");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/sla/settings returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/sla/settings");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/sla/settings returns defaults when entitled", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, EMAIL_SLA_TRACKER_ADDON_SLUG);

    const res = await agent.get("/api/mail/sla/settings");
    expect(res.status).toBe(200);
    expect(res.body.settings.responseHours).toBe(24);
    expect(res.body.settings.enabled).toBe(true);
  });

  it("GET /api/mail/sla/threads lists tracked threads", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, EMAIL_SLA_TRACKER_ADDON_SLUG);

    const deadlineAt = new Date(Date.now() + 3600000);
    await testPrisma.mailSlaThread.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        threadKey: "support ticket|client@test.local",
        folder: "INBOX",
        messageUid: 42,
        subject: "Support ticket",
        fromEmail: "client@test.local",
        fromDisplay: "Client Test <client@test.local>",
        firstInboundAt: new Date(),
        lastInboundAt: new Date(),
        deadlineAt,
        atRiskAt: new Date(Date.now() + 1800000),
        status: "open",
      },
    });

    const res = await agent.get("/api/mail/sla/threads");
    expect(res.status).toBe(200);
    expect(res.body.threads).toHaveLength(1);
    expect(res.body.threads[0].subject).toBe("Support ticket");
  });

  it("POST /api/mail/sla/scan returns zero in test mailbox", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, EMAIL_SLA_TRACKER_ADDON_SLUG);

    const res = await agent.post("/api/mail/sla/scan").send({ folder: "INBOX" });
    expect(res.status).toBe(200);
    expect(res.body.scannedMessages).toBe(0);
  });

  it("POST /api/mail/sla/reports/export creates secure download link", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, EMAIL_SLA_TRACKER_ADDON_SLUG);

    await testPrisma.mailSlaThread.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        threadKey: "invoice|billing@test.local",
        folder: "INBOX",
        messageUid: 7,
        subject: "Invoice question",
        fromEmail: "billing@test.local",
        fromDisplay: "Billing <billing@test.local>",
        firstInboundAt: new Date(),
        lastInboundAt: new Date(),
        deadlineAt: new Date(Date.now() + 7200000),
        atRiskAt: new Date(Date.now() + 3600000),
        status: "open",
      },
    });

    const res = await agent.post("/api/mail/sla/reports/export");
    expect(res.status).toBe(201);
    expect(res.body.report.downloadUrl).toMatch(/\/api\/public\/sla-report\//);
    expect(res.body.report.rowCount).toBe(1);
  });

  it("GET /api/public/sla-report/:token downloads CSV export", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);
    const token = createSlaReportDownloadToken();
    const csv = "subject,from_email,status\nTest,client@test.local,open\n";
    const { saveStoredFile } = await import("../src/services/file-storage.service.js");
    const stored = await saveStoredFile({
      namespace: "email-sla",
      tenantId: tenant.id,
      fileName: "report.csv",
      mimeType: "text/csv",
      dataBase64: Buffer.from(csv, "utf8").toString("base64"),
      maxBytes: 2 * 1024 * 1024,
      allowedMime: { "text/csv": ".csv" },
    });

    await testPrisma.mailSlaReportExport.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        storagePath: stored.storagePath,
        fileSizeBytes: stored.fileSizeBytes,
        downloadToken: token,
        expiresAt: new Date(Date.now() + 86400000),
        rowCount: 1,
      },
    });

    const res = await request(app).get(`/api/public/sla-report/${token}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("client@test.local");
  });
});
