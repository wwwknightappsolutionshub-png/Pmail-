import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

async function unlockCareerWorkspace(userId: string, tenantId: string, manual = true) {
  await testPrisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      enabled: true,
    },
    update: {
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      enabled: true,
    },
  });
}

describe("Job Hunter Phase 4 — CV builder", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/job-hunter/cv/templates requires auth", async () => {
    const res = await request(app).get("/api/job-hunter/cv/templates");
    expect(res.status).toBe(401);
  });

  it("GET /api/job-hunter/cv/templates returns 403 when career nav locked", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await testPrisma.userJobHunterSettings.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tierBDisclosureAcceptedAt: new Date(),
        careerScore: 5,
        manualJobHuntingOverride: false,
      },
    });

    const res = await agent.get("/api/job-hunter/cv/templates");
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("career_nav_locked");
  });

  it("GET /api/job-hunter/cv/templates filters by region and role", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const ukRes = await agent.get("/api/job-hunter/cv/templates?region=UK");
    expect(ukRes.status).toBe(200);
    expect(ukRes.body.templates.length).toBeGreaterThanOrEqual(2);
    expect(ukRes.body.templates.every((t: { region: string }) => t.region === "UK")).toBe(true);

    const engRes = await agent.get("/api/job-hunter/cv/templates?role=engineering");
    expect(engRes.status).toBe(200);
    expect(engRes.body.templates.some((t: { roleCategory: string }) => t.roleCategory === "engineering")).toBe(
      true,
    );
    expect(engRes.body.filters.roleCategories).toContain("engineering");
  });

  it("POST /api/job-hunter/cv/documents creates from UK template and PATCH persists edits", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const created = await agent.post("/api/job-hunter/cv/documents").send({
      templateId: "uk-data-analyst-consulting",
      region: "UK",
    });
    expect(created.status).toBe(201);
    expect(created.body.document.region).toBe("UK");
    expect(created.body.document.content.fullName).toBeTruthy();

    const documentId = created.body.document.id as string;

    const patched = await agent.patch(`/api/job-hunter/cv/documents/${documentId}`).send({
      title: "My UK Analyst CV",
      content: {
        ...created.body.document.content,
        summary: "Updated summary for persistence test.",
      },
    });
    expect(patched.status).toBe(200);
    expect(patched.body.document.title).toBe("My UK Analyst CV");
    expect(patched.body.document.content.summary).toBe("Updated summary for persistence test.");

    const reloaded = await agent.get(`/api/job-hunter/cv/documents/${documentId}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.document.content.summary).toBe("Updated summary for persistence test.");
  });

  it("POST /api/job-hunter/cv/documents/:id/export-pdf returns application/pdf", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const created = await agent.post("/api/job-hunter/cv/documents").send({
      templateId: "us-software-engineer-tech",
      title: "Export Test CV",
    });
    expect(created.status).toBe(201);

    const exported = await agent
      .post(`/api/job-hunter/cv/documents/${created.body.document.id}/export-pdf`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });

    expect(exported.status).toBe(200);
    expect(exported.headers["content-type"]).toMatch(/application\/pdf/);
    expect(Buffer.isBuffer(exported.body)).toBe(true);
    expect((exported.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("all primary regions have at least two templates", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    for (const region of ["US", "CA", "UK", "ME"]) {
      const res = await agent.get(`/api/job-hunter/cv/templates?region=${region}`);
      expect(res.status).toBe(200);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(2);
    }
  });
});
