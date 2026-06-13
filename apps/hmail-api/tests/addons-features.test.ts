import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
} from "./helpers.js";

describe("addons and features e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/addons requires auth", async () => {
    const res = await request(app).get("/api/addons");
    expect(res.status).toBe(401);
  });

  it("lists addons with release phases and coming soon flags", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/addons");
    expect(res.status).toBe(200);
    expect(res.body.addons).toHaveLength(15);

    const ai = res.body.addons.find((a: { slug: string }) => a.slug === "ai-ircc-summarizer");
    expect(ai.comingSoon).toBe(true);
    expect(ai.releasePhase).toBe(3);

    const desk = res.body.addons.find((a: { slug: string }) => a.slug === "immigration-desk");
    expect(desk.releasePhase).toBe(1);
    expect(desk.comingSoon).toBe(false);
  });

  it("rejects trial start for coming soon addons", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/ai-ircc-summarizer/trial");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coming soon/i);
  });

  it("starts free trial and exposes entitlements", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/immigration-desk/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("immigration-desk");

    await grantAddonTrial(tenant.id, "immigration-templates");
    const templates = await agent.get("/api/features/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
  });

  it("returns 403 for feature routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/desk/matters");
    expect(res.status).toBe(403);
  });

  it("phase 1: immigration desk + checklists + compliance flow", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");
    await grantAddonTrial(tenant.id, "program-checklists");
    await grantAddonTrial(tenant.id, "compliance-pack");

    const clientRes = await agent.post("/api/features/desk/clients").send({
      firstName: "Jane",
      lastName: "Maple",
      email: "jane@example.com",
    });
    expect(clientRes.status).toBe(201);

    const matterRes = await agent.post("/api/features/desk/matters").send({
      clientId: clientRes.body.client.id,
      title: "Express Entry — Jane Maple",
      uci: "1234-5678",
      program: "express_entry",
    });
    expect(matterRes.status).toBe(201);
    const matterId = matterRes.body.matter.id;

    const checklist = await agent.get(`/api/features/checklists/${matterId}`);
    expect(checklist.status).toBe(200);
    expect(checklist.body.items.length).toBeGreaterThan(0);

    const itemId = checklist.body.items[0].id;
    const toggle = await agent
      .patch(`/api/features/checklists/${matterId}/items/${itemId}`)
      .send({ isComplete: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.item.isComplete).toBe(true);

    const audit = await agent.get("/api/features/compliance/audit");
    expect(audit.status).toBe(200);
    expect(audit.body.logs.some((l: { action: string }) => l.action === "matter.created")).toBe(true);
    expect(audit.body.logs.some((l: { userEmail: string }) => l.userEmail === user.email)).toBe(true);
  });

  it("phase 1: scheduled send validates future date", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "scheduled-send");

    const bad = await agent.post("/api/features/scheduled").send({
      to: "client@example.com",
      subject: "Test",
      scheduledFor: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const good = await agent.post("/api/features/scheduled").send({
      to: "client@example.com",
      subject: "Future message",
      html: "<p>Hi</p>",
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(good.status).toBe(201);

    const list = await agent.get("/api/features/scheduled");
    expect(list.body.messages).toHaveLength(1);
  });

  it("phase 2: IRCC classify, link mail, deadlines, portal", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");
    await grantAddonTrial(tenant.id, "ircc-mail-intel");
    await grantAddonTrial(tenant.id, "case-linked-mail");
    await grantAddonTrial(tenant.id, "deadline-guard");
    await grantAddonTrial(tenant.id, "client-portal");

    const clientRes = await agent.post("/api/features/desk/clients").send({
      firstName: "Alex",
      lastName: "Chen",
    });
    const matterRes = await agent.post("/api/features/desk/matters").send({
      clientId: clientRes.body.client.id,
      title: "Study permit",
      program: "study_permit",
    });
    const matterId = matterRes.body.matter.id;

    const classify = await agent.post("/api/features/ircc/classify").send({
      folder: "INBOX",
      messageUid: 42,
      sender: "noreply@cic.gc.ca",
      subject: "Biometrics instruction letter",
    });
    expect(classify.status).toBe(201);
    expect(classify.body.classification.classification).toBe("biometrics");

    const link = await agent.post("/api/features/mail-links").send({
      matterId,
      folder: "INBOX",
      messageUid: 42,
      subject: "Biometrics instruction letter",
    });
    expect(link.status).toBe(201);

    const deadline = await agent.post("/api/features/deadlines").send({
      matterId,
      title: "Biometrics due",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(deadline.status).toBe(201);

    const portal = await agent.post(`/api/features/portal/${matterId}/access`);
    expect(portal.status).toBe(201);
    expect(portal.body.access.portalUrl).toContain("/portal/");

    const doc = await agent.post(`/api/features/portal/${matterId}/documents`).send({
      label: "Passport scan",
    });
    expect(doc.status).toBe(201);
  });

  it("rejects invalid desk client payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");

    const res = await agent.post("/api/features/desk/clients").send({ firstName: "", lastName: "" });
    expect(res.status).toBe(400);
  });
});
