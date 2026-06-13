import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedAddonMarketing } from "../src/services/addon-marketing.service.js";
import { seedSiteSections } from "../src/services/cms.service.js";
import { seedHostingPlans } from "../src/services/hosting-plans.service.js";
import { resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function seedBase() {
  await seedAddonCatalog();
  await seedSiteSections();
  await seedHostingPlans();
  await seedAddonMarketing();
}

async function createSuperAdminAgent() {
  const email = "super@test.local";
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

  const request = (await import("supertest")).default;
  const agent = request.agent(app);
  const withAuth = {
    get: (path: string) => agent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    post: (path: string) => agent.post(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    patch: (path: string) => agent.patch(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    delete: (path: string) => agent.delete(path).set("Cookie", [`hostnet_admin_session=${token}`]),
  };

  return { agent: withAuth, admin };
}

describe("admin phase 2 unified ops", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });

  it("rejects dashboard without auth", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns dashboard analytics with live DB counts", async () => {
    const tenant = await testPrisma.tenant.create({
      data: { slug: "firm-a", name: "Firm A", branding: { create: {} }, mail: { create: {} } },
    });
    await testPrisma.user.create({
      data: { tenantId: tenant.id, email: "user@firm-a.local" },
    });
    await testPrisma.vpsInstance.create({
      data: { tenantId: tenant.id, label: "VPS 1", hostname: "vps1.test", status: "running" },
    });

    const { agent } = await createSuperAdminAgent();
    const res = await agent.get("/api/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.dashboard.summary.tenants.total).toBeGreaterThanOrEqual(1);
    expect(res.body.dashboard.summary.mailUsers.total).toBeGreaterThanOrEqual(1);
    expect(res.body.dashboard.summary.vps.total).toBeGreaterThanOrEqual(1);
  });

  it("manages tenant mail users branding and addon trials", async () => {
    const tenant = await testPrisma.tenant.create({
      data: { slug: "ops-tenant", name: "Ops Tenant", branding: { create: {} }, mail: { create: {} } },
    });
    const addon = await testPrisma.addon.findFirst({ where: { slug: "ircc-mail-intel" } });
    expect(addon).toBeTruthy();

    const { agent } = await createSuperAdminAgent();

    const brandingRes = await agent
      .patch(`/api/admin/tenants/${tenant.id}/branding`)
      .send({ productName: "FirmMail", primaryColor: "#112233" });
    expect(brandingRes.status).toBe(200);
    expect(brandingRes.body.branding.productName).toBe("FirmMail");

    const mailRes = await agent
      .patch(`/api/admin/tenants/${tenant.id}/mail`)
      .send({ smtpHost: "smtp.custom.test", smtpPort: 587 });
    expect(mailRes.status).toBe(200);
    expect(mailRes.body.mail.smtpHost).toBe("smtp.custom.test");

    const userRes = await agent
      .post(`/api/admin/tenants/${tenant.id}/mail-users`)
      .send({ email: "lawyer@ops-tenant.local", displayName: "Lawyer" });
    expect(userRes.status).toBe(201);

    const trialRes = await agent
      .post(`/api/admin/tenants/${tenant.id}/addon-trials`)
      .send({ addonSlug: "ircc-mail-intel", trialDays: 14 });
    expect(trialRes.status).toBe(201);

    const opsRes = await agent.get(`/api/admin/tenants/${tenant.id}/ops`);
    expect(opsRes.status).toBe(200);
    expect(opsRes.body.ops.users.length).toBe(1);
    expect(opsRes.body.ops.trials.length).toBe(1);
    expect(opsRes.body.ops.branding.productName).toBe("FirmMail");

    const revokeRes = await agent.delete(
      `/api/admin/tenants/${tenant.id}/addon-trials/${trialRes.body.trial.id}`,
    );
    expect(revokeRes.status).toBe(204);
  });

  it("CRUDs VPS instances", async () => {
    const { agent } = await createSuperAdminAgent();

    const createRes = await agent.post("/api/admin/vps").send({
      label: "Staging VPS",
      hostname: "staging.vps.test",
      ipAddress: "10.0.0.5",
      status: "running",
    });
    expect(createRes.status).toBe(201);
    const vpsId = createRes.body.vps.id;

    const listRes = await agent.get("/api/admin/vps");
    expect(listRes.status).toBe(200);
    expect(listRes.body.vpsInstances.length).toBe(1);

    const patchRes = await agent.patch(`/api/admin/vps/${vpsId}`).send({ status: "stopped" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.vps.status).toBe("stopped");

    const delRes = await agent.delete(`/api/admin/vps/${vpsId}`);
    expect(delRes.status).toBe(204);
  });

  it("manages platform admins for super_admin only", async () => {
    const { agent, admin } = await createSuperAdminAgent();

    const createRes = await agent.post("/api/admin/platform-admins").send({
      email: "newadmin@test.local",
      name: "New Admin",
      password: "new-admin-pass12",
      role: "admin",
    });
    expect(createRes.status).toBe(201);

    const listRes = await agent.get("/api/admin/platform-admins");
    expect(listRes.status).toBe(200);
    expect(listRes.body.platformAdmins.length).toBe(2);

    const regularAdmin = await testPrisma.platformAdmin.create({
      data: {
        email: "regular@test.local",
        passwordHash: hashPassword("regular-pass12"),
        name: "Regular",
        role: "admin",
      },
    });
    const regularToken = randomUUID();
    await testPrisma.adminSession.create({
      data: {
        adminId: regularAdmin.id,
        tokenHash: hashToken(regularToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const request = (await import("supertest")).default;
    const forbidden = await request(app)
      .get("/api/admin/platform-admins")
      .set("Cookie", [`hostnet_admin_session=${regularToken}`]);
    expect(forbidden.status).toBe(403);

    const delRes = await agent.delete(`/api/admin/platform-admins/${createRes.body.admin.id}`);
    expect(delRes.status).toBe(204);

    const selfDelete = await agent.delete(`/api/admin/platform-admins/${admin.id}`);
    expect(selfDelete.status).toBe(400);
  });

  it("records audit log on VPS create", async () => {
    const { agent } = await createSuperAdminAgent();
    await agent.post("/api/admin/vps").send({
      label: "Audit VPS",
      hostname: "audit.vps.test",
    });

    const auditRes = await agent.get("/api/admin/audit-log");
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.logs.some((l: { action: string }) => l.action === "vps.create")).toBe(true);
  });

  it("deletes hosting plan via admin API", async () => {
    const plan = await testPrisma.hostingPlan.findFirst({ where: { slug: "starter" } });
    expect(plan).toBeTruthy();

    const { agent } = await createSuperAdminAgent();
    const res = await agent.delete(`/api/admin/hosting-plans/${plan!.id}`);
    expect(res.status).toBe(204);

    const remaining = await testPrisma.hostingPlan.findUnique({ where: { id: plan!.id } });
    expect(remaining).toBeNull();
  });
});
