import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  buildUnsubscribeOptions,
  decodeSenderKey,
  encodeSenderKey,
  isSafeUnsubscribeUrl,
  parseListUnsubscribeHeader,
} from "../src/lib/list-unsubscribe.js";
import { INBOX_CLEANUP_ADDON_SLUG } from "../src/services/inbox-cleanup.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("inbox cleanup (Phase 1.4)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("list-unsubscribe helpers", () => {
    it("parses angle-bracket unsubscribe URLs", () => {
      const urls = parseListUnsubscribeHeader(
        "<https://news.example.com/unsub?id=1>, <mailto:unsub@news.example.com>",
      );
      expect(urls).toEqual(["https://news.example.com/unsub?id=1", "mailto:unsub@news.example.com"]);
    });

    it("builds http options and prefers one-click POST", () => {
      const options = buildUnsubscribeOptions({
        listUnsubscribe: "<https://news.example.com/unsub>",
        listUnsubscribePost: "List-Unsubscribe=One-Click",
      });
      expect(options).toEqual([{ url: "https://news.example.com/unsub", method: "post" }]);
    });

    it("rejects unsafe unsubscribe URLs", () => {
      expect(isSafeUnsubscribeUrl("http://127.0.0.1/unsub")).toBe(false);
      expect(isSafeUnsubscribeUrl("https://example.com/unsub")).toBe(true);
    });

    it("round-trips sender keys", () => {
      const email = "newsletter@brand.test";
      expect(decodeSenderKey(encodeSenderKey(email))).toBe(email);
    });
  });

  it("GET /api/mail/cleanup/senders requires auth", async () => {
    const res = await request(app).get("/api/mail/cleanup/senders");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/cleanup/senders returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/cleanup/senders");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/cleanup/senders returns empty analysis when entitled", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, INBOX_CLEANUP_ADDON_SLUG);

    const res = await agent.get("/api/mail/cleanup/senders?folder=INBOX");
    expect(res.status).toBe(200);
    expect(res.body.folder).toBe("INBOX");
    expect(res.body.scannedCount).toBe(0);
    expect(res.body.senders).toEqual([]);
  });

  it("POST /api/mail/cleanup/senders/action returns zero processed in test mailbox", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, INBOX_CLEANUP_ADDON_SLUG);

    const res = await agent.post("/api/mail/cleanup/senders/action").send({
      folder: "INBOX",
      senderKey: encodeSenderKey("newsletter@brand.test"),
      action: "markRead",
    });
    expect(res.status).toBe(200);
    expect(res.body.processedCount).toBe(0);
    expect(res.body.action).toBe("markRead");
  });

  it("GET /api/mail/cleanup/logs lists unsubscribe history", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, INBOX_CLEANUP_ADDON_SLUG);

    await testPrisma.mailUnsubscribeLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        senderEmail: "newsletter@brand.test",
        folder: "INBOX",
        messageUid: 42,
        unsubscribeUrl: "https://example.com/unsub",
        method: "post",
        status: "success",
        httpStatus: 200,
      },
    });

    const res = await agent.get("/api/mail/cleanup/logs");
    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].senderEmail).toBe("newsletter@brand.test");
  });

  it("POST /api/mail/cleanup/unsubscribe fails when message has no http unsubscribe link", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, INBOX_CLEANUP_ADDON_SLUG);

    const res = await agent.post("/api/mail/cleanup/unsubscribe").send({
      folder: "INBOX",
      uid: 99,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unsubscribe/i);
  });

  it("executeUnsubscribeRequest uses fetch for safe URLs", async () => {
    const { executeUnsubscribeRequest } = await import("../src/lib/list-unsubscribe.js");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 200, statusText: "OK" }),
    );

    const result = await executeUnsubscribeRequest({
      url: "https://example.com/unsub",
      method: "post",
    });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();

    fetchMock.mockRestore();
  });
});
