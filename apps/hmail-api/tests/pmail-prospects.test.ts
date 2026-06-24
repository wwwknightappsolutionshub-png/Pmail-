import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function createSuperAdminAgent() {
  const email = "super-prospect@test.local";
  const password = "super-admin-pass12";
  const admin = await testPrisma.platformAdmin.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: "Super Admin",
      role: "super_admin",
    },
  });

  const token = randomUUID();
  await testPrisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const agent = request.agent(app);
  return {
    agent: {
      get: (path: string) => agent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      patch: (path: string) => agent.patch(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    },
  };
}

describe("PMail+ prospect capture", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("POST /api/public/prospects/register creates a prospect", async () => {
    const res = await request(app).post("/api/public/prospects/register").send({
      fullName: "Alex Prospect",
      email: "alex@company.test",
      company: "Acme Co",
      tenantSlug: "prohost",
      consentPrivacy: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.prospect.email).toBe("alex@company.test");
    expect(res.body.prospect.status).toBe("interested");

    const row = await testPrisma.pmailProspect.findFirst({ where: { email: "alex@company.test" } });
    expect(row?.fullName).toBe("Alex Prospect");
    expect(row?.tenantSlug).toBe("prohost");
  });

  it("POST /api/public/prospects/register validates required fields", async () => {
    const res = await request(app).post("/api/public/prospects/register").send({
      fullName: "",
      email: "not-an-email",
      consentPrivacy: false,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("POST /api/public/prospects/register returns existing open prospect", async () => {
    await testPrisma.pmailProspect.create({
      data: {
        fullName: "Existing Lead",
        email: "existing@company.test",
        status: "interested",
      },
    });

    const res = await request(app).post("/api/public/prospects/register").send({
      fullName: "Existing Lead",
      email: "existing@company.test",
      consentPrivacy: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.prospect.email).toBe("existing@company.test");
    expect(await testPrisma.pmailProspect.count({ where: { email: "existing@company.test" } })).toBe(1);
  });

  it("GET /api/admin/pmail-prospects requires super admin", async () => {
    const res = await request(app).get("/api/admin/pmail-prospects");
    expect(res.status).toBe(401);
  });

  it("super admin can list and update prospects", async () => {
    const prospect = await testPrisma.pmailProspect.create({
      data: {
        fullName: "Pipeline Lead",
        email: "pipeline@company.test",
        status: "interested",
      },
    });

    const { agent } = await createSuperAdminAgent();
    const list = await agent.get("/api/admin/pmail-prospects");
    expect(list.status).toBe(200);
    expect(list.body.prospects.some((entry: { id: string }) => entry.id === prospect.id)).toBe(true);

    const stats = await agent.get("/api/admin/pmail-prospects/stats");
    expect(stats.status).toBe(200);
    expect(stats.body.stats.total).toBeGreaterThanOrEqual(1);

    const updated = await agent.patch(`/api/admin/pmail-prospects/${prospect.id}`).send({
      status: "contacted",
      notes: "Called back",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.prospect.status).toBe("contacted");
    expect(updated.body.prospect.notes).toBe("Called back");
  });
});
