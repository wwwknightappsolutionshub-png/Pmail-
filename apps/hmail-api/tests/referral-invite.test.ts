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
