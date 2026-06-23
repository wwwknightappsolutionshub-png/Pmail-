import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { MARKETPLACE_PLATFORM_BUNDLE_SLUGS, JOB_HUNTER_ADDON_SLUG, JOB_HUNTER_STANDALONE_USER_PRICE_CENTS, getCatalogEntry, resolveAddonUserPriceCents } from "../src/data/addon-catalog.js";
import {
  classifyMailboxDomain,
  defaultScanEnabledForEmail,
  isCareerNavUnlocked,
} from "../src/lib/job-hunter.js";
import {
  userCanRunJobHunterScan,
} from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";
import { encryptSecret } from "../src/lib/crypto.js";

async function ensureTestMailAccount(userId: string, email: string) {
  const existing = await testPrisma.userMailAccount.findFirst({ where: { userId, isPrimary: true } });
  if (existing) return existing;
  return testPrisma.userMailAccount.create({
    data: {
      userId,
      email,
      providerPreset: "custom",
      imapHost: "local.pmail.test",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "local.pmail.test",
      smtpPort: 465,
      smtpSecure: true,
      encryptedMailPassword: encryptSecret("test-mail-password"),
      isPrimary: true,
      sortOrder: 0,
    },
  });
}

describe("Job Hunter Phase 1 — Tier B & settings", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("job-hunter lib", () => {
    it("classifies personal vs work mailbox domains", () => {
      expect(classifyMailboxDomain("user@gmail.com")).toBe("personal");
      expect(defaultScanEnabledForEmail("user@gmail.com")).toBe(true);
      expect(classifyMailboxDomain("user@acme-corp.com")).toBe("work");
      expect(defaultScanEnabledForEmail("user@acme-corp.com")).toBe(false);
    });

    it("unlocks career nav on score threshold or manual override", () => {
      expect(isCareerNavUnlocked({ careerScore: 49, manualJobHuntingOverride: false })).toBe(false);
      expect(isCareerNavUnlocked({ careerScore: 50, manualJobHuntingOverride: false })).toBe(true);
      expect(isCareerNavUnlocked({ careerScore: 0, manualJobHuntingOverride: true })).toBe(true);
    });
  });

  it("catalog includes Job Hunter in Platform bundle", () => {
    expect(MARKETPLACE_PLATFORM_BUNDLE_SLUGS).toContain(JOB_HUNTER_ADDON_SLUG);
    expect(MARKETPLACE_PLATFORM_BUNDLE_SLUGS).not.toContain("job-apply-assist-functionality");
  });

  it("Job Hunter standalone subscription price is $10/mo", () => {
    const entry = getCatalogEntry(JOB_HUNTER_ADDON_SLUG);
    expect(entry).toBeTruthy();
    expect(resolveAddonUserPriceCents(entry!)).toBe(JOB_HUNTER_STANDALONE_USER_PRICE_CENTS);
    expect(JOB_HUNTER_STANDALONE_USER_PRICE_CENTS).toBe(1000);
  });

  it("GET /api/mail/job-hunter/settings requires auth", async () => {
    const res = await request(app).get("/api/mail/job-hunter/settings");
    expect(res.status).toBe(401);
  });

  it("GET /api/mail/job-hunter/settings returns 403 without addon", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/mail/job-hunter/settings");
    expect(res.status).toBe(403);
  });

  it("GET /api/mail/job-hunter/settings requires Tier B disclosure", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);

    const res = await agent.get("/api/mail/job-hunter/settings");
    expect(res.status).toBe(200);
    expect(res.body.settings.needsTierBDisclosure).toBe(true);
    expect(res.body.settings.tierBDisclosureAcceptedAt).toBeNull();
  });

  it("POST /api/mail/job-hunter/consent records Tier B and applies mailbox defaults", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await ensureTestMailAccount(user.id, user.email);

    const accept = await agent.post("/api/mail/job-hunter/consent");
    expect(accept.status).toBe(201);
    expect(accept.body.settings.needsTierBDisclosure).toBe(false);
    expect(accept.body.settings.tierBDisclosureAcceptedAt).toBeTruthy();

    const row = await testPrisma.userJobHunterSettings.findUnique({ where: { userId: user.id } });
    expect(row?.tierBDisclosureVersion).toBeTruthy();

    const account = await testPrisma.userMailAccount.findFirst({ where: { userId: user.id } });
    expect(account).toBeTruthy();
    const scanRow = await testPrisma.jobHunterMailAccountSettings.findUnique({
      where: { mailAccountId: account!.id },
    });
    expect(scanRow).toBeTruthy();
    expect(scanRow?.scanEnabled).toBe(false);
  });

  it("PUT /api/mail/job-hunter/settings updates pause and manual override", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await agent.post("/api/mail/job-hunter/consent");

    const res = await agent.put("/api/mail/job-hunter/settings").send({
      pause90Days: true,
      manualJobHuntingOverride: true,
      regionCode: "CA",
    });
    expect(res.status).toBe(200);
    expect(res.body.settings.paused).toBe(true);
    expect(res.body.settings.manualJobHuntingOverride).toBe(true);
    expect(res.body.settings.careerNavUnlocked).toBe(true);
    expect(res.body.settings.regionCode).toBe("CA");
  });

  it("POST /api/mail/job-hunter/inferences/delete clears career score", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await agent.post("/api/mail/job-hunter/consent");

    await testPrisma.userJobHunterSettings.update({
      where: { userId: user.id },
      data: { careerScore: 72 },
    });

    const res = await agent.post("/api/mail/job-hunter/inferences/delete");
    expect(res.status).toBe(200);
    expect(res.body.settings.careerScore).toBe(0);
    expect(res.body.settings.inferencesDeletedAt).toBeTruthy();
  });

  it("userCanRunJobHunterScan is false without Tier B consent", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const account = await ensureTestMailAccount(user.id, user.email);

    const allowed = await userCanRunJobHunterScan(tenant.id, user.id, account.id);
    expect(allowed).toBe(false);
  });

  it("userCanRunJobHunterScan respects per-account opt-out", async () => {
    const { user, tenant, agent } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    const account = await ensureTestMailAccount(user.id, user.email);
    await agent.post("/api/mail/job-hunter/consent");

    await testPrisma.jobHunterMailAccountSettings.update({
      where: { mailAccountId: account.id },
      data: { scanEnabled: false },
    });

    const allowed = await userCanRunJobHunterScan(tenant.id, user.id, account.id);
    expect(allowed).toBe(false);
  });
});
