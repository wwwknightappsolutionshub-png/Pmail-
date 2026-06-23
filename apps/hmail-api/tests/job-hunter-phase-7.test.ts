import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { JOB_HUNTER_TRIAL_EXPIRED_REASON } from "../src/services/job-hunter-entitlement.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  expireCareerTrial,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
  unlockCareerWorkspace,
} from "./helpers.js";

describe("Job Hunter Phase 7 — monetization & career trial", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    process.env.JOB_HUNTER_TRIAL_MINUTES = "43200";
  });

  it("starts career trial once when career workspace unlocks", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);

    await testPrisma.userJobHunterSettings.upsert({
      where: { userId: user.id },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        tierBDisclosureAcceptedAt: new Date(),
        manualJobHuntingOverride: true,
        careerScore: 50,
        enabled: true,
      },
      update: {
        manualJobHuntingOverride: true,
        careerScore: 50,
      },
    });

    const first = await agent.get("/api/job-hunter/applications");
    expect(first.status).toBe(200);

    const afterFirst = await testPrisma.userJobHunterSettings.findUnique({ where: { userId: user.id } });
    expect(afterFirst?.careerUnlockedAt).toBeTruthy();
    const firstUnlock = afterFirst!.careerUnlockedAt!;

    await agent.get("/api/job-hunter/applications");
    const afterSecond = await testPrisma.userJobHunterSettings.findUnique({ where: { userId: user.id } });
    expect(afterSecond?.careerUnlockedAt?.getTime()).toBe(firstUnlock.getTime());
  });

  it("grants full write access during active career trial without marketplace addon", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await unlockCareerWorkspace(user.id, tenant.id);

    const createRes = await agent.post("/api/job-hunter/applications").send({
      company: "Acme Corp",
      roleTitle: "Engineer",
    });
    expect(createRes.status).toBe(201);

    const settingsRes = await agent.get("/api/mail/job-hunter/settings");
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.settings.entitlement.careerTrialActive).toBe(true);
    expect(settingsRes.body.settings.entitlement.canWrite).toBe(true);
  });

  it("returns 403 on write endpoints after career trial expires", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await unlockCareerWorkspace(user.id, tenant.id);
    await expireCareerTrial(user.id);

    const createRes = await agent.post("/api/job-hunter/applications").send({
      company: "Acme Corp",
      roleTitle: "Engineer",
    });
    expect(createRes.status).toBe(403);
    expect(createRes.body.reason).toBe(JOB_HUNTER_TRIAL_EXPIRED_REASON);

    const listRes = await agent.get("/api/job-hunter/applications");
    expect(listRes.status).toBe(200);
  });

  it("marketplace trial grants addon access and 30-day window", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);

    const entRes = await agent.get("/api/addons/entitlements");
    expect(entRes.status).toBe(200);
    expect(entRes.body.slugs).toContain(JOB_HUNTER_ADDON_SLUG);

    const trial = await testPrisma.tenantAddonTrial.findFirst({
      where: { tenantId: tenant.id },
      include: { addon: true },
    });
    expect(trial?.addon.slug).toBe(JOB_HUNTER_ADDON_SLUG);
    const daysLeft = Math.ceil((trial!.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    expect(daysLeft).toBeGreaterThanOrEqual(29);
    expect(daysLeft).toBeLessThanOrEqual(30);
  });

  it("startAddonTrial API rejects duplicate marketplace trial", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);

    const second = await agent.post(`/api/addons/${JOB_HUNTER_ADDON_SLUG}/trial`);
    expect(second.status).toBe(400);
  });

  it("respects JOB_HUNTER_TRIAL_MINUTES for fast QA expiry", async () => {
    process.env.JOB_HUNTER_TRIAL_MINUTES = "0";
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await unlockCareerWorkspace(user.id, tenant.id);
    await expireCareerTrial(user.id);

    const prepRes = await agent.post("/api/job-hunter/interview-prep").send({
      jobDescription: "Senior engineer role",
      targetRole: "Engineer",
    });
    expect(prepRes.status).toBe(403);
    expect(prepRes.body.reason).toBe(JOB_HUNTER_TRIAL_EXPIRED_REASON);
  });
});
