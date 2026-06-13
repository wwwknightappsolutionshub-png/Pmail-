import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedAddonMarketing } from "../src/services/addon-marketing.service.js";
import { seedSiteSections } from "../src/services/cms.service.js";
import { seedHostingPlans } from "../src/services/hosting-plans.service.js";
import { seedDemoHostingAccount } from "../src/services/hosting-accounts.service.js";
import { resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function seedCmsData() {
  await seedAddonCatalog();
  await seedSiteSections();
  await seedHostingPlans();
  await seedAddonMarketing();

  const tenant = await testPrisma.tenant.create({
    data: { slug: "preview-firm", name: "Preview Firm", branding: { create: {} }, mail: { create: {} } },
  });
  const plan = await testPrisma.hostingPlan.findFirst({ where: { slug: "business" } });
  await seedDemoHostingAccount(tenant.id, plan?.id);
}

async function createAdminAgent() {
  const email = "admin@test.local";
  const password = "test-admin-pass";
  const admin = await testPrisma.platformAdmin.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: "Test Admin",
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

  return { agent: withAuth, admin, email, password };
}

describe("platform CMS", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedCmsData();
  });

  it("returns published landing content on public site endpoint", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/public/site");
    expect(res.status).toBe(200);
    expect(res.body.sections.length).toBeGreaterThanOrEqual(5);
    expect(res.body.hostingPlans.length).toBeGreaterThanOrEqual(3);
    expect(res.body.addonMarketing.length).toBeGreaterThanOrEqual(9);
    expect(res.body.panelPreview.accountLabel).toContain("@");
    expect(res.body.panelPreview.diskPercent).toBeGreaterThanOrEqual(0);
  });

  it("rejects admin sections without auth", async () => {
    const request = (await import("supertest")).default;
    const res = await request(app).get("/api/admin/sections");
    expect(res.status).toBe(401);
  });

  it("allows admin login and CRUD for hosting plans", async () => {
    const request = (await import("supertest")).default;
    const { agent, email, password } = await createAdminAgent();

    const loginRes = await request(app).post("/api/admin/auth/login").send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.admin.email).toBe(email);

    const createRes = await agent.post("/api/admin/hosting-plans").send({
      slug: "enterprise",
      name: "Enterprise",
      priceCents: 4999,
      features: ["Dedicated support"],
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.plan.slug).toBe("enterprise");

    const patchRes = await agent.patch(`/api/admin/hosting-plans/${createRes.body.plan.id}`).send({
      tagline: "Large firms",
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.plan.tagline).toBe("Large firms");
  });

  it("allows admin to update site sections", async () => {
    const { agent } = await createAdminAgent();
    const sectionsRes = await agent.get("/api/admin/sections");
    expect(sectionsRes.status).toBe(200);

    const hero = sectionsRes.body.sections.find((s: { sectionKey: string }) => s.sectionKey === "hero");
    expect(hero).toBeTruthy();

    const patchRes = await agent.patch(`/api/admin/sections/${hero.id}`).send({
      title: "Updated hero headline",
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.section.title).toBe("Updated hero headline");
  });
});
