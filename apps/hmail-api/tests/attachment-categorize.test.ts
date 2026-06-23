import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  ATTACHMENT_CATEGORIES,
  classifyAttachment,
  isAttachmentCategory,
} from "../src/lib/attachment-category.js";
import { ATTACHMENT_CATEGORIZE_ADDON_SLUG } from "../src/services/attachment-categorize.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("attachment categorize (Phase 1.5)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("classifyAttachment", () => {
    it("detects invoices and tax forms from filenames", () => {
      expect(classifyAttachment("invoice-2024-001.pdf", "application/pdf")).toBe("invoice");
      expect(classifyAttachment("W2-2024.pdf", "application/pdf")).toBe("tax_form");
    });

    it("maps mime types to categories", () => {
      expect(classifyAttachment("report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(
        "spreadsheet",
      );
      expect(classifyAttachment("photo.jpg", "image/jpeg")).toBe("image");
    });

    it("validates category slugs", () => {
      expect(isAttachmentCategory("invoice")).toBe(true);
      expect(isAttachmentCategory("unknown")).toBe(false);
      expect(ATTACHMENT_CATEGORIES.length).toBeGreaterThan(5);
    });
  });

  it("GET /api/mail/attachments/categories requires auth", async () => {
    const res = await request(app).get("/api/mail/attachments/categories");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/attachments/categories returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/attachments/categories");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/attachments/categories returns summary when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ATTACHMENT_CATEGORIZE_ADDON_SLUG);

    await testPrisma.categorizedMailAttachment.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        folder: "INBOX",
        messageUid: 10,
        partId: "0",
        filename: "invoice-march.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1200,
        category: "invoice",
        categorySource: "auto",
        messageSubject: "March invoice",
        messageFrom: "billing@vendor.test",
        messageDate: new Date(),
      },
    });

    const res = await agent.get("/api/mail/attachments/categories");
    expect(res.status).toBe(200);
    const invoice = res.body.categories.find((row: { category: string }) => row.category === "invoice");
    expect(invoice?.count).toBe(1);
  });

  it("POST /api/mail/attachments/scan returns zero upserts in test mailbox", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ATTACHMENT_CATEGORIZE_ADDON_SLUG);

    const res = await agent.post("/api/mail/attachments/scan").send({ folder: "INBOX" });
    expect(res.status).toBe(200);
    expect(res.body.scannedMessages).toBe(0);
    expect(res.body.upsertedAttachments).toBe(0);
  });

  it("PATCH /api/mail/attachments/:id/category updates manual category", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ATTACHMENT_CATEGORIZE_ADDON_SLUG);

    const row = await testPrisma.categorizedMailAttachment.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        folder: "INBOX",
        messageUid: 11,
        partId: "0",
        filename: "scan.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 900,
        category: "document",
        categorySource: "auto",
        messageSubject: "Scan",
        messageFrom: "office@test.local",
        messageDate: new Date(),
      },
    });

    const res = await agent.patch(`/api/mail/attachments/${row.id}/category`).send({ category: "contract" });
    expect(res.status).toBe(200);
    expect(res.body.attachment.category).toBe("contract");
    expect(res.body.attachment.categorySource).toBe("manual");
  });

  it("GET /api/mail/attachments/categorized lists records", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, ATTACHMENT_CATEGORIZE_ADDON_SLUG);

    await testPrisma.categorizedMailAttachment.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        folder: "INBOX",
        messageUid: 12,
        partId: "0",
        filename: "receipt.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 400,
        category: "receipt",
        categorySource: "auto",
        messageSubject: "Receipt",
        messageFrom: "store@test.local",
        messageDate: new Date(),
      },
    });

    const res = await agent.get("/api/mail/attachments/categorized?category=receipt");
    expect(res.status).toBe(200);
    expect(res.body.attachments).toHaveLength(1);
    expect(res.body.attachments[0].filename).toBe("receipt.pdf");
  });
});
