import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { encryptSecret } from "../src/lib/crypto.js";
import { MULTI_INBOX_ADDON_SLUG } from "../src/services/mail-account.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("multi-inbox (Phase 1.3)", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/mail/accounts requires auth", async () => {
    const res = await request(app).get("/api/mail/accounts");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/accounts returns 403 without multi-inbox addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/accounts");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/accounts lists primary account when entitled", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const res = await agent.get("/api/mail/accounts");
    expect(res.status).toBe(200);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.accounts[0].email).toBe(user.email);
    expect(res.body.accounts[0].isPrimary).toBe(true);
    expect(res.body.accounts[0].isActive).toBe(true);
    expect(res.body.activeMailAccountId).toBe(res.body.accounts[0].id);
  });

  it("POST /api/mail/accounts creates secondary account", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const res = await agent.post("/api/mail/accounts").send({
      email: "secondary@testfirm.ca",
      password: "secondary-pass",
      label: "Secondary",
      providerPreset: "custom",
      imapHost: "local.pmail.test",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "local.pmail.test",
      smtpPort: 465,
      smtpSecure: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.account?.email).toBe("secondary@testfirm.ca");
    expect(res.body.account?.isPrimary).toBe(false);

    const rows = await testPrisma.userMailAccount.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(2);
  });

  it("POST /api/mail/accounts/:id/activate switches active session account", async () => {
    const { agent, user, tenant, token } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const secondary = await testPrisma.userMailAccount.create({
      data: {
        userId: user.id,
        email: "secondary@testfirm.ca",
        label: "Secondary",
        providerPreset: "custom",
        imapHost: "local.pmail.test",
        imapPort: 993,
        imapSecure: true,
        smtpHost: "local.pmail.test",
        smtpPort: 465,
        smtpSecure: true,
        encryptedMailPassword: encryptSecret("secondary-pass"),
        isPrimary: false,
        sortOrder: 1,
      },
    });

    await testPrisma.userMailAccount.create({
      data: {
        userId: user.id,
        email: user.email,
        label: "Primary",
        providerPreset: "microsoft",
        imapHost: "imap.hostinger.com",
        imapPort: 993,
        imapSecure: true,
        smtpHost: "smtp.hostinger.com",
        smtpPort: 465,
        smtpSecure: true,
        encryptedMailPassword: encryptSecret("test-mail-password"),
        isPrimary: true,
        sortOrder: 0,
      },
    });

    const res = await agent.post(`/api/mail/accounts/${secondary.id}/activate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.activeMailAccountId).toBe(secondary.id);
    expect(res.body.accounts.find((row: { id: string }) => row.id === secondary.id)?.isActive).toBe(true);

    const session = await testPrisma.session.findFirst({ where: { userId: user.id } });
    expect(session?.activeMailAccountId).toBe(secondary.id);
    expect(token).toBeTruthy();
  });

  it("DELETE /api/mail/accounts/:id blocks primary removal", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const list = await agent.get("/api/mail/accounts");
    const primaryId = list.body.accounts[0].id;

    const res = await agent.delete(`/api/mail/accounts/${primaryId}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/primary/i);

    const count = await testPrisma.userMailAccount.count({ where: { userId: user.id } });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("DELETE /api/mail/accounts/:id removes secondary account", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const secondary = await testPrisma.userMailAccount.create({
      data: {
        userId: user.id,
        email: "remove-me@testfirm.ca",
        providerPreset: "custom",
        imapHost: "local.pmail.test",
        imapPort: 993,
        imapSecure: true,
        smtpHost: "local.pmail.test",
        smtpPort: 465,
        smtpSecure: true,
        encryptedMailPassword: encryptSecret("pass"),
        isPrimary: false,
        sortOrder: 1,
      },
    });

    const res = await agent.delete(`/api/mail/accounts/${secondary.id}`);
    expect(res.status).toBe(204);

    const row = await testPrisma.userMailAccount.findUnique({ where: { id: secondary.id } });
    expect(row).toBeNull();
  });

  it("GET /api/mail/accounts/unread-summary requires multi-inbox addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/accounts/unread-summary");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/accounts/unread-summary returns unread counts when entitled", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, MULTI_INBOX_ADDON_SLUG);

    const res = await agent.get("/api/mail/accounts/unread-summary");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts[0]).toMatchObject({
      id: expect.any(String),
      email: expect.any(String),
      unread: expect.any(Number),
      isActive: expect.any(Boolean),
      isPrimary: expect.any(Boolean),
    });
  });

  it("GET /api/mail/recipient-suggestions returns deduped suggestions", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/recipient-suggestions?q=a");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });
});
