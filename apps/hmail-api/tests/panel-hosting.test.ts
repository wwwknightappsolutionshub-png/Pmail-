import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { createHostingAccount } from "../src/services/hosting-accounts.service.js";
import { resetTestDatabase, seedTestTenant, testPrisma } from "./helpers.js";

const app = createApp();

async function createAdminAgent() {
  const email = "admin@test.local";
  const password = "test-admin-pass";
  const admin = await testPrisma.platformAdmin.create({
    data: { email, passwordHash: hashPassword(password), name: "Test Admin" },
  });
  const token = randomUUID();
  await testPrisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const request = (await import("supertest")).default;
  const agent = request.agent(app);
  return {
    agent: {
      get: (path: string) => agent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      post: (path: string) => agent.post(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      patch: (path: string) => agent.patch(path).set("Cookie", [`hostnet_admin_session=${token}`]),
      delete: (path: string) => agent.delete(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    },
  };
}

describe("panel and hosting admin", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedAddonCatalog();
  });

  it("panel login returns dashboard stats", async () => {
    const { tenant } = await seedTestTenant();
    await createHostingAccount({
      tenantId: tenant.id,
      username: "site",
      domain: "example.test",
      password: "panel-pass-1",
      homePath: "/home/site",
    });

    const request = (await import("supertest")).default;
    const loginRes = await request(app).post("/api/panel/auth/login").send({
      username: "site",
      domain: "example.test",
      password: "panel-pass-1",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.account.domain).toBe("example.test");

    const agent = request.agent(app);
    const dashRes = await agent
      .get("/api/panel/dashboard")
      .set("Cookie", [`hostnet_panel_session=${loginRes.body.token}`]);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.stats.diskPercent).toBeGreaterThanOrEqual(0);
    expect(dashRes.body.quickLinks.length).toBeGreaterThan(0);
  });

  it("admin can CRUD hosting accounts", async () => {
    const { tenant } = await seedTestTenant();
    const { agent } = await createAdminAgent();

    const createRes = await agent.post("/api/admin/hosting-accounts").send({
      tenantId: tenant.id,
      username: "client1",
      domain: "client.test",
      password: "secret123",
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.account.loginId).toBe("client1@client.test");

    const listRes = await agent.get("/api/admin/hosting-accounts");
    expect(listRes.status).toBe(200);
    expect(listRes.body.hostingAccounts.length).toBe(1);
  });

  it("admin can list and update tenants", async () => {
    await seedTestTenant();
    const { agent } = await createAdminAgent();

    const listRes = await agent.get("/api/admin/tenants");
    expect(listRes.status).toBe(200);
    expect(listRes.body.tenants.length).toBeGreaterThanOrEqual(1);

    const tenant = listRes.body.tenants[0];
    const patchRes = await agent.patch(`/api/admin/tenants/${tenant.id}`).send({
      name: "Renamed Tenant",
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.tenant.name).toBe("Renamed Tenant");
  });
});
