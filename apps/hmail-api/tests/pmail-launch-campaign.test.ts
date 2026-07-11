import { beforeEach, describe, expect, it } from "vitest";
import {
  PMAIL_LAUNCH_SHARE_URL,
  PMAIL_LOGIN_URL,
  PMAIL_UI_DEMO_URL,
} from "../src/data/email-cta-urls.js";
import { renderEmailTemplate, seedEmailTemplates } from "../src/services/email-template.service.js";
import { resetTestDatabase, seedTestTenant } from "./helpers.js";

describe("pmail-launch-campaign-1", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestTenant();
    await seedEmailTemplates();
  });

  it("renders the waitlist/prospect launch email with 12 feature cards and login CTAs", async () => {
    const rendered = await renderEmailTemplate("pmail-launch-campaign-1", {
      fullName: "Jordan",
      productName: "PMail+",
      ctaUrl: PMAIL_LOGIN_URL,
      demoCtaUrl: PMAIL_LOGIN_URL,
      shareUrl: PMAIL_LAUNCH_SHARE_URL,
      uiDemoUrl: PMAIL_UI_DEMO_URL,
    });

    expect(rendered.subject).toBe("Business email shouldn’t stop at the inbox | Meet PMail+");
    expect(rendered.html).toContain("Business email shouldn’t stop at the inbox");
    expect(rendered.html).toContain("Problems PMail+ is here to solve");
    expect(rendered.html).toContain('href="https://mail.prohost.cloud/login"');
    expect(rendered.html).toContain("Start with PMail+");
    expect(rendered.html).toContain("sample demo workspace");
    expect(rendered.html).toContain("Register on the");
    expect(rendered.html).toContain(PMAIL_LAUNCH_SHARE_URL);
    expect(rendered.html).toContain(PMAIL_UI_DEMO_URL);
    expect(rendered.html).toContain("PMail+");
    expect(rendered.html).toContain("Mail workspace");

    const featureTitles = [
      "Modern business inbox",
      "Open Tracking",
      "File Vault",
      "Auto Reply",
      "Calendar &amp; scheduled send",
      "WhatsApp handoff",
      "Mail 2 PDF",
      "Inbox cleanup &amp; categorization",
      "E-Sign from Email",
      "Email SLA Tracker",
      "Industry workspaces",
      "Upgrade on your terms",
    ];
    for (const title of featureTitles) {
      expect(rendered.html).toContain(title);
    }

    expect(rendered.text).toContain("Start with PMail+ (login & signup): https://mail.prohost.cloud/login");
    expect(rendered.text).toContain(
      "Try a sample demo workspace — register on the login form: https://mail.prohost.cloud/login",
    );
    expect(rendered.text).toContain(`Share this launch page (WhatsApp / social): ${PMAIL_LAUNCH_SHARE_URL}`);
    expect(rendered.text).toContain(`Preview the UI (no mailbox until you register): ${PMAIL_UI_DEMO_URL}`);
    expect(rendered.text).toContain("Scattered tools for mail, files, calendars, and follow-ups");
    expect(rendered.text).not.toContain("your trial");
    expect(rendered.text).not.toContain("Refer a friend");
  });

  it("keeps CTA constants pointed at production login and share landing", () => {
    expect(PMAIL_LOGIN_URL).toBe("https://mail.prohost.cloud/login");
    expect(PMAIL_LAUNCH_SHARE_URL).toBe("https://prohost.cloud/pmail-launch");
    expect(PMAIL_UI_DEMO_URL).toBe("https://prohost.cloud/use-case/demo/legal");
  });
});
