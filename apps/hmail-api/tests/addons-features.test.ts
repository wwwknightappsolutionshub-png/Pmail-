import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { ADDON_CATALOG, ACCOUNTING_PHASE_1_SLUGS, B2B_PHASE_1_SLUGS, HEALTHCARE_PHASE_1_SLUGS, MARKETPLACE_PLATFORM_BUNDLE_SLUGS, REAL_ESTATE_PHASE_1_SLUGS, RECRUITMENT_PHASE_1_SLUGS } from "../src/data/addon-catalog.js";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("addons and features e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET /api/addons requires auth", async () => {
    const res = await request(app).get("/api/addons");
    expect(res.status).toBe(401);
  });

  it("lists addons with release phases and coming soon flags", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/addons");
    expect(res.status).toBe(200);
    expect(res.body.addons).toHaveLength(ADDON_CATALOG.length);

    const ai = res.body.addons.find((a: { slug: string }) => a.slug === "ai-ircc-summarizer");
    expect(ai.comingSoon).toBe(true);
    expect(ai.releasePhase).toBe(3);

    const desk = res.body.addons.find((a: { slug: string }) => a.slug === "immigration-desk");
    expect(desk.releasePhase).toBe(1);
    expect(desk.comingSoon).toBe(false);

    for (const slug of REAL_ESTATE_PHASE_1_SLUGS) {
      const re = res.body.addons.find((a: { slug: string }) => a.slug === slug);
      expect(re).toBeTruthy();
      expect(re.releasePhase).toBe(1);
      expect(re.comingSoon).toBeFalsy();
    }

    for (const slugs of [ACCOUNTING_PHASE_1_SLUGS, RECRUITMENT_PHASE_1_SLUGS, B2B_PHASE_1_SLUGS, HEALTHCARE_PHASE_1_SLUGS]) {
      for (const slug of slugs) {
        const addon = res.body.addons.find((a: { slug: string }) => a.slug === slug);
        expect(addon).toBeTruthy();
        expect(addon.releasePhase).toBe(1);
        expect(addon.comingSoon).toBeFalsy();
      }
    }
  });

  it("rejects trial start for coming soon addons", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/ai-ircc-summarizer/trial");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coming soon/i);
  });

  it("starts free trial and exposes entitlements", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/immigration-desk/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("immigration-desk");

    await grantAddonTrial(tenant.id, "immigration-templates");
    const templates = await agent.get("/api/features/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
  });

  it("selects Standard workspace without marketplace steps", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const select = await agent.post("/api/auth/business-vertical").send({
      businessVertical: "standard",
    });

    expect(select.status).toBe(200);
    expect(select.body.user.businessVertical).toBe("standard");

    const entitled = await agent.get("/api/addons/entitlements");
    expect(entitled.body.slugs).not.toContain("whatsapp-functionality");
    expect(entitled.body.slugs).not.toContain("immigration-desk");
  });

  it("selects a business vertical and unlocks the vertical bundle only after subscription", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const select = await agent.post("/api/auth/business-vertical").send({
      businessVertical: "recruitment",
    });

    expect(select.status).toBe(200);
    expect(select.body.user.businessVertical).toBe("recruitment");

    const ent = await agent.get("/api/addons/entitlements");
    for (const slug of RECRUITMENT_PHASE_1_SLUGS) {
      expect(ent.body.slugs).not.toContain(slug);
    }

    const subscribe = await agent.post("/api/addons/rc-role-pipeline/subscribe").send({ scope: "user" });
    expect(subscribe.status).toBe(201);
    expect(subscribe.body.addon.accessStatus).toBe("active");

    const entitled = await agent.get("/api/addons/entitlements");
    for (const slug of RECRUITMENT_PHASE_1_SLUGS) {
      expect(entitled.body.slugs).toContain(slug);
    }
    expect(entitled.body.slugs).not.toContain("whatsapp-functionality");

    const same = await agent.post("/api/auth/business-vertical").send({
      businessVertical: "recruitment",
    });
    expect(same.status).toBe(200);
    expect(same.body.user.businessVertical).toBe("recruitment");

    const change = await agent.post("/api/auth/business-vertical").send({
      businessVertical: "accounting",
    });
    expect(change.status).toBe(400);
    expect(change.body.error).toMatch(/upgrade is required/i);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.businessVertical).toBe("recruitment");

    const invalid = await agent.post("/api/auth/business-vertical").send({
      businessVertical: "not-a-vertical",
    });
    expect(invalid.status).toBe(400);
  });

  it("lists workspace users from the authenticated organization", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/auth/organization-users");

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      ]),
    );
  });

  it("returns 403 for feature routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/desk/matters");
    expect(res.status).toBe(403);
  });

  it("phase 1: immigration desk + checklists + compliance flow", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");
    await grantAddonTrial(tenant.id, "program-checklists");
    await grantAddonTrial(tenant.id, "compliance-pack");

    const clientRes = await agent.post("/api/features/desk/clients").send({
      firstName: "Jane",
      lastName: "Maple",
      email: "jane@example.com",
    });
    expect(clientRes.status).toBe(201);

    const matterRes = await agent.post("/api/features/desk/matters").send({
      clientId: clientRes.body.client.id,
      title: "Express Entry — Jane Maple",
      uci: "1234-5678",
      program: "express_entry",
    });
    expect(matterRes.status).toBe(201);
    const matterId = matterRes.body.matter.id;

    const checklist = await agent.get(`/api/features/checklists/${matterId}`);
    expect(checklist.status).toBe(200);
    expect(checklist.body.items.length).toBeGreaterThan(0);

    const itemId = checklist.body.items[0].id;
    const toggle = await agent
      .patch(`/api/features/checklists/${matterId}/items/${itemId}`)
      .send({ isComplete: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.item.isComplete).toBe(true);

    const audit = await agent.get("/api/features/compliance/audit");
    expect(audit.status).toBe(200);
    expect(audit.body.logs.some((l: { action: string }) => l.action === "matter.created")).toBe(true);
    expect(audit.body.logs.some((l: { userEmail: string }) => l.userEmail === user.email)).toBe(true);
  });

  it("phase 1: scheduled send validates future date", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "scheduled-send");

    const bad = await agent.post("/api/features/scheduled").send({
      to: "client@example.com",
      subject: "Test",
      scheduledFor: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const good = await agent.post("/api/features/scheduled").send({
      to: "client@example.com",
      subject: "Future message",
      html: "<p>Hi</p>",
      scheduledFor: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(good.status).toBe(201);

    const list = await agent.get("/api/features/scheduled");
    expect(list.body.messages).toHaveLength(1);
  });

  it("phase 2: IRCC classify, link mail, deadlines, portal", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");
    await grantAddonTrial(tenant.id, "ircc-mail-intel");
    await grantAddonTrial(tenant.id, "case-linked-mail");
    await grantAddonTrial(tenant.id, "deadline-guard");
    await grantAddonTrial(tenant.id, "client-portal");

    const clientRes = await agent.post("/api/features/desk/clients").send({
      firstName: "Alex",
      lastName: "Chen",
    });
    const matterRes = await agent.post("/api/features/desk/matters").send({
      clientId: clientRes.body.client.id,
      title: "Study permit",
      program: "study_permit",
    });
    const matterId = matterRes.body.matter.id;

    const classify = await agent.post("/api/features/ircc/classify").send({
      folder: "INBOX",
      messageUid: 42,
      sender: "noreply@cic.gc.ca",
      subject: "Biometrics instruction letter",
    });
    expect(classify.status).toBe(201);
    expect(classify.body.classification.classification).toBe("biometrics");

    const link = await agent.post("/api/features/mail-links").send({
      matterId,
      folder: "INBOX",
      messageUid: 42,
      subject: "Biometrics instruction letter",
    });
    expect(link.status).toBe(201);

    const deadline = await agent.post("/api/features/deadlines").send({
      matterId,
      title: "Biometrics due",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(deadline.status).toBe(201);

    const portal = await agent.post(`/api/features/portal/${matterId}/access`);
    expect(portal.status).toBe(201);
    expect(portal.body.access.portalUrl).toContain("/portal/");

    const doc = await agent.post(`/api/features/portal/${matterId}/documents`).send({
      label: "Passport scan",
    });
    expect(doc.status).toBe(201);
  });

  it("rejects invalid desk client payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "immigration-desk");

    const res = await agent.post("/api/features/desk/clients").send({ firstName: "", lastName: "" });
    expect(res.status).toBe(400);
  });

  it("returns tenant pricing quote with minimum seats", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/addons/rc-role-pipeline/pricing-quote?scope=tenant");
    expect(res.status).toBe(200);
    expect(res.body.quote.scope).toBe("tenant");
    expect(res.body.quote.seats).toBeGreaterThanOrEqual(5);
    expect(res.body.quote.amountCents).toBeGreaterThan(0);
  });

  it("quotes marketplace bundles with tenant platform tools free", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/marketplace/quote").send({
      vertical: "accounting",
      scope: "tenant",
      includePlatformBundle: true,
      includeVerticalBundle: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.quote.amountCents).toBe(2000 * res.body.quote.seats);
    expect(res.body.quote.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bundle: "platform", amountCents: 0, isFree: true }),
        expect.objectContaining({ bundle: "vertical", amountCents: 2000 * res.body.quote.seats }),
      ]),
    );
  });

  it("activates free tenant platform bundle without paid checkout", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/marketplace/checkout").send({
      vertical: "accounting",
      scope: "tenant",
      includePlatformBundle: true,
      includeVerticalBundle: false,
      provider: "mock",
    });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe("activated");

    const entitled = await agent.get("/api/addons/entitlements");
    for (const slug of MARKETPLACE_PLATFORM_BUNDLE_SLUGS) {
      expect(entitled.body.slugs).toContain(slug);
    }
    expect(entitled.body.slugs).not.toContain("whatsapp-functionality");
    expect(entitled.body.slugs).not.toContain("email-sla-tracker-functionality");
  });

  it("marketplace platform bundle quote lists all Phase 1.1–1.6 slugs", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/marketplace/quote").send({
      vertical: "legal",
      scope: "user",
      includePlatformBundle: true,
      includeVerticalBundle: false,
    });
    expect(res.status).toBe(200);
    const platformLine = res.body.quote.lines.find((line: { bundle: string }) => line.bundle === "platform");
    expect(platformLine).toBeTruthy();
    expect(platformLine.addonSlugs).toEqual([...MARKETPLACE_PLATFORM_BUNDLE_SLUGS]);
    expect(platformLine.addonSlugs).not.toContain("email-sla-tracker-functionality");
  });

  it("quotes Job Hunter standalone without platform or vertical bundles", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/marketplace/quote").send({
      vertical: "b2b-services",
      scope: "user",
      includePlatformBundle: false,
      includeVerticalBundle: false,
      includeJobHunterStandalone: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.quote.amountCents).toBe(1000);
    expect(res.body.quote.lines).toEqual([
      expect.objectContaining({
        bundle: "job-hunter",
        anchorSlug: "job-hunter-functionality",
        amountCents: 1000,
      }),
    ]);
  });

  it("renders PMail+ referral invitation template for super admin editing", async () => {
    const { seedEmailTemplates, renderEmailTemplate } = await import("../src/services/email-template.service.js");
    await seedEmailTemplates();
    const rendered = await renderEmailTemplate("pmail-refer-friend", {
      senderName: "Jordan Lee",
      senderEmail: "jordan@example.com",
      referralUrl: "http://localhost:5174/login?ref=jordan%40example.com",
      productName: "PMail+",
      signatureFooter: "Jordan Lee\njordan@example.com",
    });
    expect(rendered.subject).toBe("Explore More Possibilities With Mails On PMail+ | Join Me");
    expect(rendered.html).toContain("PMail+");
    expect(rendered.html).toContain("brand-top");
    expect(rendered.html).toContain("brand-foot");
    expect(rendered.text).toContain("Jordan Lee");
  });

  it("renders Auto Reply upsell template and respects superAdmin edits", async () => {
    const { seedEmailTemplates, renderEmailTemplate, updateEmailTemplate, getEmailTemplateBySlug } = await import(
      "../src/services/email-template.service.js"
    );
    await seedEmailTemplates();
    const template = await getEmailTemplateBySlug("auto-reply-upsell");
    expect(template).not.toBeNull();

    const rendered = await renderEmailTemplate("auto-reply-upsell", {
      fullName: "Jordan",
      daysLeft: "3",
      ctaUrl: "http://localhost:5174/addons?highlight=auto-reply-functionality",
      productName: "PMail+",
    });
    expect(rendered.subject).toBe("Your Auto Reply access ends in 3 days");
    expect(rendered.html).toContain("Auto Reply");
    expect(rendered.html).toContain("Unlock Auto Reply");

    await updateEmailTemplate(template!.id, {
      subject: "Custom upsell — {{daysLeft}} days left for {{productName}} Auto Reply",
    });
    const updated = await renderEmailTemplate("auto-reply-upsell", {
      fullName: "Jordan",
      daysLeft: "3",
      ctaUrl: "http://localhost:5174/addons",
      productName: "PMail+",
    });
    expect(updated.subject).toBe("Custom upsell — 3 days left for PMail+ Auto Reply");
  });

  it("GET /api/referrals/compose requires auth", async () => {
    const res = await request(app).get("/api/referrals/compose");
    expect(res.status).toBe(401);
  });

  it("GET /api/referrals/compose returns invitation draft for authenticated user", async () => {
    const { seedEmailTemplates } = await import("../src/services/email-template.service.js");
    await seedEmailTemplates();
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/referrals/compose");
    expect(res.status).toBe(200);
    expect(res.body.compose.subject).toBe("Explore More Possibilities With Mails On PMail+ | Join Me");
    expect(res.body.compose.body).toContain("PMail+");
    expect(res.body.compose.bodyHtml).toContain("brand-top");
    expect(res.body.compose.bodyHtml).toContain("brand-foot");
    expect(typeof res.body.compose.bcc).toBe("string");
    expect(typeof res.body.compose.recipientCount).toBe("number");
  });

  it("POST /api/referrals/invite requires auth", async () => {
    const res = await request(app).post("/api/referrals/invite");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/referral-leads requires super admin", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const forbidden = await agent.get("/api/admin/referral-leads");
    expect(forbidden.status).toBe(401);
  });

  it("lists PMail+ referral leads for super admin", async () => {
    const { createAdminAgent } = await import("./helpers.js");
    const { tenant, user } = await createAuthenticatedAgent(app);

    await testPrisma.pmailReferralLead.create({
      data: {
        tenantId: tenant.id,
        recipientEmail: "friend@example.com",
        referredByUserId: user.id,
        referredByEmail: user.email,
        referredByName: user.displayName,
        emailStatus: "delivered",
        sentAt: new Date(),
      },
    });

    const { agent: adminAgent } = await createAdminAgent(app);
    const res = await adminAgent.get("/api/admin/referral-leads");
    expect(res.status).toBe(200);
    expect(res.body.leads).toHaveLength(1);
    expect(res.body.leads[0].recipientEmail).toBe("friend@example.com");
    expect(res.body.leads[0].referredByEmail).toBe(user.email);
  });

  it("creates mock checkout session for paid add-on subscription", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/addons/whatsapp-functionality/checkout").send({
      scope: "user",
      provider: "mock",
    });
    expect(res.status).toBe(201);
    expect(res.body.checkout.checkoutUrl).toContain("/checkout/mock");
    expect(res.body.quote.amountCents).toBeGreaterThan(0);
  });

  it("generates mail2pdf when add-on is entitled", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "mail2pdf-functionality");

    const res = await agent.post("/api/platform/mail2pdf").send({
      subject: "Quarterly filing",
      from: "advisor@example.com",
      to: "client@example.com",
      body: "Please review the attached filing summary.",
    });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/pdf/);
    expect(res.body.length).toBeGreaterThan(100);
  });

  it("rejects platform routes without add-on entitlement", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.post("/api/platform/whatsapp/send").send({
      toPhone: "+14165550100",
      body: "Hello",
    });
    expect(res.status).toBe(403);
  });

  it("rejects calendar routes without full-calendar add-on", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/workspace/calendar/settings");
    expect(res.status).toBe(403);
  });

  it("manages calendar CRUD, sync, reminders, and team capacity", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "full-calendar-functionality");

    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 1);
    startAt.setHours(9, 0, 0, 0);
    const endAt = new Date(startAt);
    endAt.setHours(10, 0, 0, 0);

    const create = await agent.post("/api/features/workspace/calendar").send({
      title: "Client intake",
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });
    expect(create.status).toBe(201);
    expect(create.body.event.syncSource).toBe("local");
    const eventId = create.body.event.id as string;

    const list = await agent.get("/api/features/workspace/calendar");
    expect(list.status).toBe(200);
    expect(list.body.events.some((event: { id: string }) => event.id === eventId)).toBe(true);

    const settings = await agent.get("/api/features/workspace/calendar/settings");
    expect(settings.status).toBe(200);
    expect(settings.body.settings.reminderSequences.length).toBeGreaterThan(0);

    const connectGoogle = await agent.post("/api/features/workspace/calendar/providers/google/connect");
    expect(connectGoogle.status).toBe(200);
    expect(connectGoogle.body.settings.googleConnected).toBe(true);

    const sync = await agent.post("/api/features/workspace/calendar/sync");
    expect(sync.status).toBe(200);
    expect(sync.body.settings.lastSyncAt).toBeTruthy();

    const synced = await agent.get("/api/features/workspace/calendar");
    expect(synced.body.events.some((event: { syncSource: string }) => event.syncSource === "google")).toBe(true);

    const capacity = await agent.get("/api/features/workspace/calendar/capacity");
    expect(capacity.status).toBe(200);
    expect(Array.isArray(capacity.body.members)).toBe(true);
    expect(capacity.body.members.length).toBeGreaterThan(0);

    const reminders = await testPrisma.workspaceReminder.findMany({
      where: { tenantId: tenant.id },
    });
    expect(reminders.length).toBeGreaterThan(0);

    const disconnect = await agent.post("/api/features/workspace/calendar/providers/google/disconnect");
    expect(disconnect.status).toBe(200);
    expect(disconnect.body.settings.googleConnected).toBe(false);

    const deleteRes = await agent.delete(`/api/features/workspace/calendar/${eventId}`);
    expect(deleteRes.status).toBe(204);
  });
});
