import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createAuthenticatedAgent, resetTestDatabase, testPrisma } from "./helpers.js";

vi.mock("../src/services/platform-email.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/platform-email.service.js")>();
  return {
    ...actual,
    sendTemplatedPlatformEmail: vi.fn(async () => undefined),
    sendPlatformEmail: vi.fn(async () => undefined),
  };
});

describe("Gmail App Password guide", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
    const { seedEmailTemplates } = await import("../src/services/email-template.service.js");
    await seedEmailTemplates();
    vi.clearAllMocks();
  });

  it("sends the branded guide once for a Gmail address on login", async () => {
    const { sendTemplatedPlatformEmail } = await import("../src/services/platform-email.service.js");
    const { tenant } = await createAuthenticatedAgent(app);

    const first = await request(app).post("/api/auth/gmail-app-password-guide").send({
      tenantSlug: tenant.slug,
      email: "newvisitor@gmail.com",
      loginResumePath: `/login/${tenant.slug}`,
    });
    expect(first.status).toBe(200);
    expect(first.body.sent).toBe(true);
    expect(sendTemplatedPlatformEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendTemplatedPlatformEmail).mock.calls[0]?.[0]).toMatchObject({
      to: "newvisitor@gmail.com",
      templateSlug: "pmail-gmail-app-password-guide",
    });

    await testPrisma.platformEmailLog.create({
      data: {
        toAddress: "newvisitor@gmail.com",
        subject: "How To Activate APP Password",
        templateSlug: "pmail-gmail-app-password-guide",
        status: "sent",
      },
    });

    const second = await request(app).post("/api/auth/gmail-app-password-guide").send({
      tenantSlug: tenant.slug,
      email: "newvisitor@gmail.com",
      loginResumePath: `/login/${tenant.slug}`,
    });
    expect(second.status).toBe(200);
    expect(second.body.sent).toBe(false);
    expect(second.body.reason).toBe("already_sent");
    expect(sendTemplatedPlatformEmail).toHaveBeenCalledTimes(1);
  });

  it("renders the seeded How To Activate APP Password template", async () => {
    const { renderEmailTemplate } = await import("../src/services/email-template.service.js");
    const rendered = await renderEmailTemplate("pmail-gmail-app-password-guide", {
      productName: "PMail+",
      imapSettingsUrl: "https://mail.google.com/mail/u/0/#settings/fwdandpop",
      twoStepUrl: "https://myaccount.google.com/signinoptions/two-step-verification",
      appPasswordUrl: "https://myaccount.google.com/apppasswords",
      loginUrl: "https://mail.prohost.cloud/login/demo",
    });
    expect(rendered.subject).toBe("How To Activate APP Password");
    expect(rendered.html).toContain("Activate IMAP");
    expect(rendered.html).toContain("https://mail.prohost.cloud/login/demo");
    expect(rendered.html).toContain("Login Now");
  });
});
