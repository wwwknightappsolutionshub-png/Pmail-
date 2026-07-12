import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

vi.mock("../src/services/imap.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/imap.service.js")>();
  return {
    ...actual,
    verifyImapLogin: vi.fn(async () => undefined),
    listFolders: vi.fn(async () => [
      { path: "INBOX", name: "INBOX", specialUse: "\\Inbox", delimiter: "/", flags: [] },
      { path: "Sent", name: "Sent", specialUse: "\\Sent", delimiter: "/", flags: [] },
    ]),
    listMessages: vi.fn(async (_credentials, folder: string) => {
      if (folder === "INBOX") {
        return {
          messages: [{ from: "friend@example.com", to: "sender@acme.test", subject: "Hi", date: new Date().toISOString() }],
          total: 1,
          page: 1,
          pageSize: 120,
        };
      }
      return { messages: [], total: 0, page: 1, pageSize: 60 };
    }),
  };
});

vi.mock("../src/services/smtp.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/smtp.service.js")>();
  return {
    ...actual,
    verifySmtpLogin: vi.fn(async () => undefined),
    sendMail: vi.fn(async () => ({ messageId: "<referral-test@mock>" })),
  };
});

describe("Referral invite pipeline", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    const { seedEmailTemplates } = await import("../src/services/email-template.service.js");
    await seedEmailTemplates();
  });

  it("POST /api/referrals/invite sends invitations, logs leads, and grants platform reward", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);

    // Simulate an expired welcome trial — the common Refer & Extend case.
    await testPrisma.user.update({
      where: { id: user.id },
      data: {
        panelWorkspaceTrialStartedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        panelWorkspaceDay5EmailSent: true,
        panelWorkspaceDay7ReminderSent: true,
      },
    });

    const res = await agent.post("/api/referrals/invite");
    expect(res.status).toBe(200);
    expect(res.body.sentCount).toBeGreaterThan(0);
    expect(res.body.reward.granted).toBe(true);
    expect(res.body.rewardToast).toContain("Platform tools");

    const leads = await testPrisma.pmailReferralLead.findMany({ where: { referredByUserId: user.id } });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0]?.emailStatus).toBe("delivered");

    const trial = await testPrisma.tenantAddonTrial.findFirst({
      where: { tenantId: tenant.id, trialSource: "referral_reward", status: "active" },
    });
    expect(trial).toBeTruthy();

    const refreshed = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.panelWorkspaceTrialStartedAt).toBeTruthy();
    const startedMs = refreshed.panelWorkspaceTrialStartedAt!.getTime();
    expect(startedMs).toBeGreaterThan(Date.now() - 60_000);
    expect(refreshed.panelWorkspaceDay5EmailSent).toBe(false);
    expect(refreshed.panelWorkspaceDay7ReminderSent).toBe(false);
  });

  it("reactivates Panel workspace tools after an expired welcome trial on refer", async () => {
    const { grantReferralPlatformReward } = await import("../src/services/referral-lead.service.js");
    const { hasActivePanelWorkspaceWelcomeTrial } = await import("../src/services/panel-workspace-trial.service.js");
    const { getActiveAddonSlugs } = await import("../src/services/addon.service.js");
    const { PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS } = await import("../src/data/addon-catalog.js");

    const { tenant, user } = await createAuthenticatedAgent(app);
    await testPrisma.user.update({
      where: { id: user.id },
      data: { panelWorkspaceTrialStartedAt: new Date("2020-01-01T12:00:00Z") },
    });
    expect(await hasActivePanelWorkspaceWelcomeTrial(user.id)).toBe(false);

    const reward = await grantReferralPlatformReward(tenant.id, user.id);
    expect(reward.granted).toBe(true);
    expect(await hasActivePanelWorkspaceWelcomeTrial(user.id)).toBe(true);

    const slugs = await getActiveAddonSlugs(tenant.id, user.id);
    for (const slug of PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS) {
      expect(slugs).toContain(slug);
    }
  });

  it("extends expired Panel trial when Refer a friend is clicked even without new contacts", async () => {
    const { listMessages } = await import("../src/services/imap.service.js");
    vi.mocked(listMessages).mockImplementation(async () => ({
      messages: [],
      total: 0,
      page: 1,
      pageSize: 120,
    }));

    const { agent, user } = await createAuthenticatedAgent(app);
    await testPrisma.user.update({
      where: { id: user.id },
      data: {
        panelWorkspaceTrialStartedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await agent.post("/api/referrals/invite");
    expect(res.status).toBe(200);
    expect(res.body.reward.granted).toBe(true);
    expect(res.body.rewardToast).toContain("Platform tools");

    const refreshed = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.panelWorkspaceTrialStartedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("grants Panel workspace trial again when contacts were already invited", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);

    await testPrisma.user.update({
      where: { id: user.id },
      data: {
        panelWorkspaceTrialStartedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
    });

    await testPrisma.pmailReferralLead.create({
      data: {
        tenantId: user.tenantId,
        recipientEmail: "friend@example.com",
        referredByUserId: user.id,
        referredByEmail: user.email,
        referredByName: user.displayName,
        emailStatus: "delivered",
        sentAt: new Date(),
      },
    });

    const res = await agent.post("/api/referrals/invite");
    expect(res.status).toBe(200);
    expect(res.body.reward.granted).toBe(true);
    expect(res.body.rewardToast).toContain("Platform tools");

    const refreshed = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(refreshed.panelWorkspaceTrialStartedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("attributes referral signup when invitee logs in with referrerEmail", async () => {
    const { tenant, user } = await createAuthenticatedAgent(app);

    await testPrisma.pmailReferralLead.create({
      data: {
        tenantId: tenant.id,
        recipientEmail: "invitee@example.com",
        referredByUserId: user.id,
        referredByEmail: user.email,
        referredByName: user.displayName,
        emailStatus: "delivered",
        sentAt: new Date(),
      },
    });

    const invitee = await testPrisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "invitee@example.com",
        displayName: "Invitee User",
        mailConfig: {
          create: {
            providerPreset: "gmail",
            imapHost: "imap.gmail.com",
            imapPort: 993,
            imapSecure: true,
            smtpHost: "smtp.gmail.com",
            smtpPort: 465,
            smtpSecure: true,
          },
        },
      },
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      tenantSlug: tenant.slug,
      email: invitee.email,
      password: "any-mail-password",
      referrerEmail: user.email,
    });
    expect(loginRes.status).toBe(200);

    const lead = await testPrisma.pmailReferralLead.findFirst({
      where: { recipientEmail: "invitee@example.com" },
    });
    expect(lead?.convertedAt).toBeTruthy();
    expect(lead?.convertedUserId).toBe(invitee.id);
    expect(lead?.marketingLeadId).toBeTruthy();
  });

  it("POST /api/public/webhooks/mail-bounce marks referral lead as bounced", async () => {
    const { tenant, user } = await createAuthenticatedAgent(app);

    await testPrisma.pmailReferralLead.create({
      data: {
        tenantId: tenant.id,
        recipientEmail: "bounce@example.com",
        referredByUserId: user.id,
        referredByEmail: user.email,
        referredByName: user.displayName,
        emailStatus: "delivered",
        smtpMessageId: "<bounce-msg@mock>",
        sentAt: new Date(),
      },
    });

    const res = await request(app).post("/api/public/webhooks/mail-bounce").send({
      event: "bounce",
      recipientEmail: "bounce@example.com",
      messageId: "<bounce-msg@mock>",
    });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(true);

    const lead = await testPrisma.pmailReferralLead.findFirst({ where: { recipientEmail: "bounce@example.com" } });
    expect(lead?.emailStatus).toBe("bounced");
    expect(lead?.bouncedAt).toBeTruthy();
  });

  it("day-6 referral upsell uses admin-editable template when seeded", async () => {
    const { renderEmailTemplate } = await import("../src/services/email-template.service.js");
    const rendered = await renderEmailTemplate("platform-tools-referral-upsell", {
      fullName: "Jordan",
      ctaUrl: "http://localhost:5173/addons",
      productName: "PMail+",
    });
    expect(rendered.subject).toContain("Platform tools");
    expect(rendered.html).toContain("Unlock Platform tools");
  });
});
