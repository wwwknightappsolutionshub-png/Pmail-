import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  buildLinkClickUrl,
  isTrackableHref,
  wrapTrackedLinksInHtml,
} from "../src/services/tracking.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("link click tracking (open-tracking extension)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("isTrackableHref", () => {
    it("accepts http(s) links and rejects unsafe schemes", () => {
      expect(isTrackableHref("https://example.com/page")).toBe(true);
      expect(isTrackableHref("http://example.com")).toBe(true);
      expect(isTrackableHref("mailto:a@b.test")).toBe(false);
      expect(isTrackableHref("tel:+15551234567")).toBe(false);
      expect(isTrackableHref("javascript:alert(1)")).toBe(false);
      expect(isTrackableHref("#section")).toBe(false);
    });
  });

  describe("wrapTrackedLinksInHtml", () => {
    it("rewrites unique http(s) anchors to tracking redirect URLs", async () => {
      const { user } = await createAuthenticatedAgent(app);
      const tracking = await testPrisma.sentMessageTracking.create({
        data: {
          userId: user.id,
          toEmail: "recipient@test.local",
          subject: "Links",
          trackingToken: "tok-wrap",
        },
      });

      const html =
        '<p>Hello</p><a href="https://example.com/a">A</a><a href="https://example.com/a">A again</a><a href="https://other.test/b">B</a>';
      const wrapped = await wrapTrackedLinksInHtml(html, tracking.id, "http://localhost:4000");

      expect(wrapped).not.toContain('href="https://example.com/a"');
      expect(wrapped).not.toContain('href="https://other.test/b"');
      expect(wrapped.match(/\/api\/public\/track\/link\//g)?.length).toBe(3);

      const links = await testPrisma.trackedEmailLink.findMany({
        where: { sentMessageTrackingId: tracking.id },
        orderBy: { linkOrder: "asc" },
      });
      expect(links).toHaveLength(2);
      expect(links[0]?.originalUrl).toBe("https://example.com/a");
      expect(links[1]?.originalUrl).toBe("https://other.test/b");
    });
  });

  it("GET /api/public/track/link/:token records click and redirects", async () => {
    const { user } = await createAuthenticatedAgent(app);
    const tracking = await testPrisma.sentMessageTracking.create({
      data: {
        userId: user.id,
        toEmail: "recipient@test.local",
        subject: "Click test",
        trackingToken: "tok-click",
      },
    });
    const link = await testPrisma.trackedEmailLink.create({
      data: {
        sentMessageTrackingId: tracking.id,
        originalUrl: "https://destination.example/landing",
        clickToken: "click-token-abc",
        linkOrder: 0,
      },
    });

    const res = await request(app).get("/api/public/track/link/click-token-abc");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://destination.example/landing");
    expect(res.headers["x-tracking-notice"]).toMatch(/privacy/i);

    const updated = await testPrisma.trackedEmailLink.findUnique({ where: { id: link.id } });
    expect(updated?.clickCount).toBe(1);
    expect(updated?.firstClickedAt).toBeTruthy();
  });

  it("GET /api/mail/tracking requires auth", async () => {
    const res = await request(app).get("/api/mail/tracking");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/tracking returns 403 without open-tracking addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/tracking");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/open tracking/i);
  });

  it("GET /api/mail/tracking lists link click summaries when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "open-tracking");

    const tracking = await testPrisma.sentMessageTracking.create({
      data: {
        userId: user.id,
        toEmail: "recipient@test.local",
        subject: "Summary",
        trackingToken: "tok-summary",
      },
    });
    await testPrisma.trackedEmailLink.create({
      data: {
        sentMessageTrackingId: tracking.id,
        originalUrl: "https://example.com",
        clickToken: "click-summary",
        clickCount: 2,
        linkOrder: 0,
      },
    });

    const res = await agent.get("/api/mail/tracking");
    expect(res.status).toBe(200);
    expect(res.body.tracking).toHaveLength(1);
    expect(res.body.tracking[0]).toMatchObject({
      subject: "Summary",
      linkCount: 1,
      totalLinkClicks: 2,
    });
  });

  it("GET /api/mail/tracking/:id returns per-link detail when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "open-tracking");

    const tracking = await testPrisma.sentMessageTracking.create({
      data: {
        userId: user.id,
        toEmail: "recipient@test.local",
        subject: "Detail",
        trackingToken: "tok-detail",
      },
    });
    await testPrisma.trackedEmailLink.create({
      data: {
        sentMessageTrackingId: tracking.id,
        originalUrl: "https://example.com/detail",
        clickToken: "click-detail",
        linkOrder: 0,
      },
    });

    const res = await agent.get(`/api/mail/tracking/${tracking.id}`);
    expect(res.status).toBe(200);
    expect(res.body.tracking.links).toHaveLength(1);
    expect(res.body.tracking.links[0].originalUrl).toBe("https://example.com/detail");
  });

  it("GET /api/mail/tracking/:id returns 403 without open-tracking addon", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    const tracking = await testPrisma.sentMessageTracking.create({
      data: {
        userId: user.id,
        toEmail: "recipient@test.local",
        subject: "Gated",
        trackingToken: "tok-gated",
      },
    });

    const res = await agent.get(`/api/mail/tracking/${tracking.id}`);
    expect(res.status).toBe(403);
  });

  it("buildLinkClickUrl uses public API base", () => {
    expect(buildLinkClickUrl("abc", "https://api.example.com")).toBe(
      "https://api.example.com/api/public/track/link/abc",
    );
  });
});
