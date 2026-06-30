import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hashPassword, hashToken } from "../src/lib/crypto.js";
import { seedEmailTemplates } from "../src/services/email-template.service.js";
import { processPmailProspectDemoEmails } from "../src/services/pmail-prospect-demo.service.js";
import { resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

async function seedBrandingTenant() {
  await testPrisma.tenant.upsert({
    where: { slug: "prohost" },
    create: {
      slug: "prohost",
      name: "Prohost Cloud",
      branding: {
        create: {
          productName: "PMail+",
          primaryColor: "#0d4f6c",
          accentColor: "#0d9488",
          backgroundColor: "#0f2744",
        },
      },
      mail: {
        create: {
          imapHost: "imap.hostinger.com",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "smtp.hostinger.com",
          smtpPort: 465,
          smtpSecure: true,
          mailOnboardingComplete: true,
        },
      },
    },
    update: {},
  });
}

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
    await seedBrandingTenant();
    await seedEmailTemplates();
  });

  it("POST /api/public/prospects/register provisions a 72-hour demo and welcome email", async () => {
    const res = await request(app).post("/api/public/prospects/register").send({
      fullName: "Alex Prospect",
      email: "alex@company.test",
      company: "Acme Co",
      tenantSlug: "prohost",
      consentPrivacy: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.prospect.email).toBe("alex@company.test");
    expect(res.body.prospect.status).toBe("invited");
    expect(res.body.prospect.demoTenantSlug).toMatch(/^pmail-demo-/);
    expect(res.body.prospect.demoProvisionedAt).toBeTruthy();
    expect(res.body.prospect.demoExpiresAt).toBeTruthy();
    expect(res.body.prospect.demoWelcomeEmailSent).toBe(true);
    expect(res.body.prospect.demoActive).toBe(true);

    const row = await testPrisma.pmailProspect.findFirst({ where: { email: "alex@company.test" } });
    expect(row?.userId).toBeTruthy();
    expect(row?.tenantId).toBeTruthy();

    const user = await testPrisma.user.findUnique({ where: { id: row!.userId! } });
    expect(user?.prospectDemoExpiresAt).toBeTruthy();
    expect(user?.prospectDemoPasswordHash).toBeTruthy();
    expect(user?.businessVertical).toBe("accounting");

    const emailLog = await testPrisma.platformEmailLog.findFirst({
      where: { toAddress: "alex@company.test", templateSlug: "pmail-prospect-welcome" },
    });
    expect(emailLog?.status).toBe("logged_dev");

    const loginRes = await request(app).post("/api/auth/login").send({
      tenantSlug: row!.demoTenantSlug,
      email: "alex@company.test",
      password: "wrong-password",
    });
    expect(loginRes.status).toBe(401);
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

  it("POST /api/public/prospects/register returns existing active demo prospect", async () => {
    const first = await request(app).post("/api/public/prospects/register").send({
      fullName: "Existing Lead",
      email: "existing@company.test",
      consentPrivacy: true,
    });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/public/prospects/register").send({
      fullName: "Existing Lead",
      email: "existing@company.test",
      consentPrivacy: true,
    });

    expect(second.status).toBe(201);
    expect(second.body.prospect.demoTenantSlug).toBe(first.body.prospect.demoTenantSlug);
    expect(await testPrisma.pmailProspect.count({ where: { email: "existing@company.test" } })).toBe(1);
    expect(await testPrisma.tenant.count({ where: { slug: first.body.prospect.demoTenantSlug } })).toBe(1);
  });

  it("sends upsell email before demo expiry and closes expired demos", async () => {
    const res = await request(app).post("/api/public/prospects/register").send({
      fullName: "Upsell Lead",
      email: "upsell@company.test",
      consentPrivacy: true,
    });
    expect(res.status).toBe(201);

    const prospect = await testPrisma.pmailProspect.findFirstOrThrow({
      where: { email: "upsell@company.test" },
    });

    const almostExpired = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await testPrisma.pmailProspect.update({
      where: { id: prospect.id },
      data: { demoExpiresAt: almostExpired },
    });
    await testPrisma.user.update({
      where: { id: prospect.userId! },
      data: { prospectDemoExpiresAt: almostExpired },
    });

    await processPmailProspectDemoEmails();

    const upsellLog = await testPrisma.platformEmailLog.findFirst({
      where: { toAddress: "upsell@company.test", templateSlug: "pmail-prospect-upsell" },
    });
    expect(upsellLog?.status).toBe("logged_dev");

    await testPrisma.pmailProspect.update({
      where: { id: prospect.id },
      data: { demoExpiresAt: new Date(Date.now() - 60_000) },
    });
    await testPrisma.user.update({
      where: { id: prospect.userId! },
      data: { prospectDemoExpiresAt: new Date(Date.now() - 60_000) },
    });

    await processPmailProspectDemoEmails();

    const user = await testPrisma.user.findUnique({ where: { id: prospect.userId! } });
    expect(user?.isActive).toBe(false);
    const closed = await testPrisma.pmailProspect.findUnique({ where: { id: prospect.id } });
    expect(closed?.status).toBe("closed");
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
