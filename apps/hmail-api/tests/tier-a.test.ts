import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  seedTestTenant,
  testPrisma,
  createAdminAgent,
} from "./helpers.js";

vi.mock("../src/services/imap.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/imap.service.js")>();
  return {
    ...actual,
    verifyImapLogin: vi.fn(async () => undefined),
  };
});

vi.mock("../src/services/smtp.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/smtp.service.js")>();
  return {
    ...actual,
    verifySmtpLogin: vi.fn(async () => undefined),
    sendMail: vi.fn(async () => ({ messageId: "<test@mock>" })),
  };
});

describe("Tier A production APIs", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("POST /api/public/leads creates a lead", async () => {
    const res = await request(app).post("/api/public/leads").send({
      fullName: "Jane Doe",
      email: "jane@acme.test",
      company: "Acme Inc",
      teamSize: "11-50",
      message: "Interested in PMail+",
      consentPrivacy: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.lead.id).toBeTruthy();

    const row = await testPrisma.marketingLead.findFirst({ where: { email: "jane@acme.test" } });
    expect(row?.company).toBe("Acme Inc");
  });

  it("login requires provider setup for users without mail config", async () => {
    const tenant = await testPrisma.tenant.create({
      data: {
        slug: "new-firm",
        name: "New Firm",
        branding: { create: { productName: "PMail+" } },
        mail: { create: { mailOnboardingComplete: false } },
      },
    });
    await testPrisma.user.create({
      data: { tenantId: tenant.id, email: "user@newfirm.test" },
    });

    const preflight = await request(app).get("/api/auth/login-preflight").query({
      tenantSlug: "new-firm",
      email: "user@newfirm.test",
    });
    expect(preflight.status).toBe(200);
    expect(preflight.body.needsProviderSetup).toBe(true);

    const loginRes = await request(app).post("/api/auth/login").send({
      tenantSlug: "new-firm",
      email: "user@newfirm.test",
      password: "secret",
    });
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.error).toMatch(/provider/i);
  });

  it("PUT /api/public/onboarding/:slug/mail completes setup with test credentials", async () => {
    await testPrisma.tenant.create({
      data: {
        slug: "onboard-co",
        name: "Onboard Co",
        branding: { create: {} },
        mail: { create: { mailOnboardingComplete: false } },
      },
    });

    const res = await request(app).put("/api/public/onboarding/onboard-co/mail").send({
      imapHost: "outlook.office365.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
      testEmail: "user@onboard-co.test",
      testPassword: "app-password",
    });
    expect(res.status).toBe(200);
    expect(res.body.mailOnboardingComplete).toBe(true);

    const mail = await testPrisma.tenantMailConfig.findFirst({
      where: { tenant: { slug: "onboard-co" } },
    });
    expect(mail?.smtpHost).toBe("smtp.office365.com");
    expect(mail?.mailOnboardingComplete).toBe(true);
  });

  it("GET /api/admin/leads lists captured leads", async () => {
    await testPrisma.marketingLead.create({
      data: {
        fullName: "Lead One",
        email: "lead@test.local",
        company: "Co",
      },
    });
    const { agent } = await createAdminAgent(app);
    const res = await agent.get("/api/admin/leads");
    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBeGreaterThanOrEqual(1);
  });

  it("workspace CRM requires bespoke-workspace addon", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    const denied = await agent.get("/api/features/workspace/crm");
    expect(denied.status).toBe(403);

    await grantAddonTrial(tenant.id, "bespoke-workspace");
    const ok = await agent.get("/api/features/workspace/crm");
    expect(ok.status).toBe(200);
    expect(ok.body.records).toEqual([]);
  });

  it("POST workspace CRM record persists to database", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "bespoke-workspace");

    const res = await agent.post("/api/features/workspace/crm").send({
      name: "Alice Client",
      email: "alice@client.test",
      stage: "lead",
    });
    expect(res.status).toBe(201);

    const row = await testPrisma.crmRecord.findFirst({ where: { email: "alice@client.test" } });
    expect(row?.name).toBe("Alice Client");
  });

  it("GET tracking pixel records an open", async () => {
    const { user } = await createAuthenticatedAgent(app);
    const tracking = await testPrisma.sentMessageTracking.create({
      data: {
        userId: user.id,
        toEmail: "recipient@test.local",
        subject: "Hello",
        trackingToken: "abc123token",
      },
    });

    const res = await request(app).get("/api/public/track/abc123token.gif");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/gif/);

    const updated = await testPrisma.sentMessageTracking.findUnique({ where: { id: tracking.id } });
    expect(updated?.openCount).toBe(1);
  });

  it("compose settings round-trip", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    const patch = await agent.patch("/api/mail/compose-settings").send({ displayName: "Test Lawyer" });
    expect(patch.status).toBe(200);

    const get = await agent.get("/api/mail/compose-settings");
    expect(get.status).toBe(200);
    expect(get.body.settings.displayName).toBe("Test Lawyer");

    const sig = await agent.post("/api/mail/signatures").send({
      name: "Default",
      body: "<p>Regards</p>",
    });
    expect(sig.status).toBe(201);

    const settings = await testPrisma.userComposeSettings.findUnique({ where: { userId: user.id } });
    expect(settings?.displayName).toBe("Test Lawyer");
  });
});
