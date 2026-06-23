import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { classifyCareerMail } from "../src/lib/job-hunter-career-mail.js";
import {
  processCareerMailMessage,
  upsertApplicationFromCareerMessage,
} from "../src/services/job-hunter-applications.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../src/services/job-hunter-settings.service.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

async function unlockCareerWorkspace(userId: string, tenantId: string, manual = true) {
  await testPrisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      enabled: true,
    },
    update: {
      tierBDisclosureAcceptedAt: new Date(),
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      enabled: true,
    },
  });
}

describe("Job Hunter Phase 3 — application history", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("career mail classification", () => {
    it("detects outbound applications in Sent mail", () => {
      const parsed = classifyCareerMail({
        direction: "outbound",
        subject: "Application for Software Engineer at Acme Corp",
        fromEmail: "user@gmail.com",
        toEmails: ["careers@acme.com"],
        snippet: "Please find my resume attached.",
      });
      expect(parsed?.status).toBe("applied");
      expect(parsed?.company).toMatch(/Acme/i);
    });

    it("detects inbound interview and rejection messages", () => {
      expect(
        classifyCareerMail({
          direction: "inbound",
          subject: "Interview invitation — Product Manager",
          fromEmail: "talent@greenhouse.io",
          snippet: "We would like to schedule a phone screen",
        })?.status,
      ).toBe("interview");

      expect(
        classifyCareerMail({
          direction: "inbound",
          subject: "Update on your application",
          fromEmail: "jobs@indeed.com",
          snippet: "Unfortunately we will not be moving forward",
        })?.status,
      ).toBe("rejected");
    });
  });

  it("fixture emails create application rows", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);

    await processCareerMailMessage({
      userId: user.id,
      imapFolder: "Sent",
      message: {
        uid: 101,
        subject: "Application for Backend Engineer at Northwind",
        fromEmail: user.email,
        toEmails: ["careers@northwind.com"],
        date: new Date("2025-06-01T12:00:00Z").toISOString(),
        messageId: "<sent-101@pmail.test>",
        snippet: "I am applying for the Backend Engineer role.",
        direction: "outbound",
      },
    });

    await processCareerMailMessage({
      userId: user.id,
      imapFolder: "INBOX",
      message: {
        uid: 202,
        subject: "Thank you for applying to Backend Engineer",
        fromEmail: "careers@northwind.com",
        toEmails: [user.email],
        date: new Date("2025-06-02T09:00:00Z").toISOString(),
        messageId: "<inbox-202@pmail.test>",
        snippet: "We received your application and will review it shortly.",
        direction: "inbound",
      },
    });

    const rows = await testPrisma.jobApplication.findMany({ where: { userId: user.id } });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((row) => row.status === "applied" || row.status === "acknowledged")).toBe(true);

    const settings = await testPrisma.userJobHunterSettings.findUnique({ where: { userId: user.id } });
    expect(settings?.careerScore ?? 0).toBeGreaterThan(0);

    void tenant;
  });

  it("GET /api/job-hunter/applications requires auth", async () => {
    const res = await request(app).get("/api/job-hunter/applications");
    expect(res.status).toBe(401);
  });

  it("GET /api/job-hunter/applications returns 403 without addon or career unlock", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/job-hunter/applications");
    expect(res.status).toBe(403);
  });

  it("GET /api/job-hunter/applications grants read access via career trial without marketplace addon", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await unlockCareerWorkspace(user.id, tenant.id);
    const res = await agent.get("/api/job-hunter/applications");
    expect(res.status).toBe(200);
  });

  it("GET /api/job-hunter/applications returns 403 when career nav locked", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await testPrisma.userJobHunterSettings.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tierBDisclosureAcceptedAt: new Date(),
        careerScore: 10,
        manualJobHuntingOverride: false,
      },
    });

    const res = await agent.get("/api/job-hunter/applications");
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe("career_nav_locked");
  });

  it("GET /api/job-hunter/applications lists rows when unlocked", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    await upsertApplicationFromCareerMessage({
      userId: user.id,
      imapFolder: "Sent",
      messageUid: 55,
      messageMessageId: "<fixture@pmail.test>",
      appliedAt: new Date("2025-06-03T10:00:00Z"),
      parsed: {
        status: "applied",
        company: "Fixture Corp",
        roleTitle: "QA Analyst",
        threadHint: "application|fixture corp",
      },
    });

    const res = await agent.get("/api/job-hunter/applications");
    expect(res.status).toBe(200);
    expect(res.body.applications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          company: "Fixture Corp",
          roleTitle: "QA Analyst",
          status: "applied",
          hasMailLink: true,
        }),
      ]),
    );
  });

  it("POST /api/job-hunter/applications creates manual application", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const res = await agent.post("/api/job-hunter/applications").send({
      company: "Manual Co",
      roleTitle: "Designer",
      status: "applied",
    });
    expect(res.status).toBe(201);
    expect(res.body.application.company).toBe("Manual Co");
    expect(res.body.application.source).toBe("manual");
    expect(res.body.application.hasMailLink).toBe(false);
  });

  it("PATCH /api/job-hunter/applications/:id updates status", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, JOB_HUNTER_ADDON_SLUG);
    await unlockCareerWorkspace(user.id, tenant.id);

    const created = await testPrisma.jobApplication.create({
      data: {
        userId: user.id,
        company: "Patch Co",
        roleTitle: "Engineer",
        appliedAt: new Date(),
        status: "applied",
        source: "manual",
      },
    });

    const res = await agent.patch(`/api/job-hunter/applications/${created.id}`).send({
      status: "interview",
    });
    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe("interview");
  });
});
