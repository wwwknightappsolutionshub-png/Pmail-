import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { createAdminAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function createRegularAdminAgent() {
  const email = "regular-admin@test.local";
  const password = "regular-admin-pass12";
  const admin = await testPrisma.platformAdmin.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: "Regular Admin",
      role: "admin",
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

  const baseAgent = request.agent(app);
  const withAuth = {
    get: (path: string) => baseAgent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
  };

  return { agent: withAuth, admin };
}

describe("PMail+ management overview", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/admin/pmail/overview requires admin auth", async () => {
    const res = await request(app).get("/api/admin/pmail/overview");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/pmail/overview returns core stats for regular admins", async () => {
    const { agent } = await createRegularAdminAgent();

    const res = await agent.get("/api/admin/pmail/overview");
    expect(res.status).toBe(200);
    expect(res.body.overview).toBeDefined();
    expect(res.body.overview.presence).toBeDefined();
    expect(res.body.overview.platform).toBeDefined();
    expect(res.body.overview.addons).toMatchObject({
      activeTrials: expect.any(Number),
      activeSubscriptions: expect.any(Number),
    });
    expect(res.body.overview.tenantsWithMailConfig).toBeTypeOf("number");
    expect(res.body.overview.asOf).toBeTruthy();
    expect(res.body.overview.push).toBeUndefined();
  });

  it("GET /api/admin/pmail/overview includes push stats for super admins", async () => {
    const { agent } = await createAdminAgent(app);

    const res = await agent.get("/api/admin/pmail/overview");
    expect(res.status).toBe(200);
    expect(res.body.overview.push).toBeDefined();
    expect(res.body.overview.push).toMatchObject({
      vapidConfigured: expect.any(Boolean),
    });
  });
});
