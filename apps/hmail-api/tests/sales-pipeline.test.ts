import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedEmailTemplates } from "../src/services/email-template.service.js";
import { seedPublicFormDefinitions } from "../src/services/form-definition.service.js";
import { createAdminAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

const MEMBERSHIP_PAYLOAD = {
  fullName: "Alex Rivera",
  workEmail: "alex.rivera@acme.test",
  phone: "+1 555 0100",
  teamType: "team",
  deployIntent: "Multi-site hosting with PMail+",
  hostingScale: "Growing",
  emailService: "PMail+ / Bespoke",
};

const INQUIRY_PAYLOAD = {
  name: "Sam Lee",
  email: "sam@help.test",
  phone: "+1 555 0200",
  membershipInterest: "yes",
  inquiringAbout: "Enterprise migration timeline",
};

async function seedSalesPipelineFixtures() {
  await seedAddonCatalog();
  await seedPublicFormDefinitions();
  await seedEmailTemplates();
}

describe("sales pipeline & marketing APIs", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedSalesPipelineFixtures();
  });

  it("GET /api/public/forms returns membership and inquiry forms", async () => {
    const res = await request(app).get("/api/public/forms");
    expect(res.status).toBe(200);
    expect(res.body.forms.length).toBeGreaterThanOrEqual(2);
    const keys = res.body.forms.map((f: { formKey: string }) => f.formKey);
    expect(keys).toContain("membership");
    expect(keys).toContain("inquiry");
  });

  it("POST /api/public/membership/register creates demo application (no captcha in test)", async () => {
    const res = await request(app)
      .post("/api/public/membership/register")
      .send({
        payload: MEMBERSHIP_PAYLOAD,
        consentPrivacy: true,
        captchaToken: "",
      });
    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe("demo_sent");

    const row = await testPrisma.membershipApplication.findFirst({
      where: { workEmail: MEMBERSHIP_PAYLOAD.workEmail },
    });
    expect(row?.demoUsername).toBeTruthy();
    expect(row?.demoDomain).toMatch(/\.prohost\.demo$/);

    const account = await testPrisma.hostingAccount.findFirst({
      where: { username: row?.demoUsername ?? "" },
    });
    expect(account?.isSampleDemo).toBe(true);

    const emailLog = await testPrisma.platformEmailLog.findFirst({
      where: { toAddress: MEMBERSHIP_PAYLOAD.workEmail },
    });
    expect(emailLog?.status).toBe("logged_dev");
  });

  it("POST /api/public/membership/register rejects duplicate active email", async () => {
    await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: true });

    const res = await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("POST /api/public/membership/register requires privacy consent", async () => {
    const res = await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: false });
    expect(res.status).toBe(400);
  });

  it("POST /api/public/inquiries creates inquiry and logs auto-reply", async () => {
    const res = await request(app)
      .post("/api/public/inquiries")
      .send({ payload: INQUIRY_PAYLOAD, captchaToken: "" });
    expect(res.status).toBe(201);
    expect(res.body.inquiry.status).toBe("new");

    const row = await testPrisma.inquirySubmission.findFirst({ where: { email: INQUIRY_PAYLOAD.email } });
    expect(row?.inquiringAbout).toBe(INQUIRY_PAYLOAD.inquiringAbout);

    const emailLog = await testPrisma.platformEmailLog.findFirst({
      where: { toAddress: INQUIRY_PAYLOAD.email },
    });
    expect(emailLog).toBeTruthy();
  });

  it("admin sales endpoints require authentication", async () => {
    const res = await request(app).get("/api/admin/sales/membership");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/sales/pipeline/overview includes membership demoSent", async () => {
    await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: true });

    const { agent } = await createAdminAgent(app);
    const res = await agent.get("/api/admin/sales/pipeline/overview");
    expect(res.status).toBe(200);
    expect(res.body.overview.membership.demoSent).toBeGreaterThanOrEqual(1);
    expect(res.body.overview.membership.total).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/admin/poll aggregates sales pipeline pending count", async () => {
    await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: true });
    await request(app).post("/api/public/inquiries").send({ payload: INQUIRY_PAYLOAD });

    const { agent } = await createAdminAgent(app);
    const res = await agent.get("/api/admin/poll");
    expect(res.status).toBe(200);
    expect(res.body.salesPipeline.pendingCount).toBeGreaterThanOrEqual(2);
    expect(res.body.salesPipeline.membership.demoSent).toBeGreaterThanOrEqual(1);
    expect(res.body.salesPipeline.inquiries.open).toBeGreaterThanOrEqual(1);
  });

  it("admin can list, update, and push membership to leads", async () => {
    await request(app)
      .post("/api/public/membership/register")
      .send({ payload: MEMBERSHIP_PAYLOAD, consentPrivacy: true });

    const { agent } = await createAdminAgent(app);
    const listRes = await agent.get("/api/admin/sales/membership");
    expect(listRes.status).toBe(200);
    expect(listRes.body.applications.length).toBe(1);

    const appId = listRes.body.applications[0].id as string;
    const patchRes = await agent.patch(`/api/admin/sales/membership/${appId}`).send({
      notes: "Follow up Monday",
      status: "provisioned",
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.application.notes).toBe("Follow up Monday");

    const pushRes = await agent.post(`/api/admin/sales/membership/${appId}/push-to-leads`);
    expect(pushRes.status).toBe(200);
    expect(pushRes.body.application.status).toBe("pushed_to_leads");
    expect(pushRes.body.leadId).toBeTruthy();
  });

  it("admin can patch public form field definitions", async () => {
    const { agent } = await createAdminAgent(app);
    const formsRes = await agent.get("/api/admin/sales/forms");
    expect(formsRes.status).toBe(200);
    const membershipForm = formsRes.body.forms.find((f: { formKey: string }) => f.formKey === "membership");
    expect(membershipForm).toBeTruthy();

    const fields = [...membershipForm.fields];
    fields[0] = { ...fields[0], label: "Legal Name" };

    const patchRes = await agent.patch(`/api/admin/sales/forms/${membershipForm.id}`).send({
      fields,
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.form.fields[0].label).toBe("Legal Name");
  });

  it("admin email templates CRUD and preview", async () => {
    const { agent } = await createAdminAgent(app);

    const listRes = await agent.get("/api/admin/marketing/email-templates");
    expect(listRes.status).toBe(200);
    expect(listRes.body.templates.length).toBeGreaterThanOrEqual(10);

    const createRes = await agent.post("/api/admin/marketing/email-templates").send({
      slug: "test-welcome",
      name: "Test Welcome",
      category: "transactional",
      subject: "Hello {{name}}",
      htmlBody: "<p>Hello {{name}}</p>",
      textBody: "Hello {{name}}",
      variables: ["name"],
      isActive: true,
    });
    expect(createRes.status).toBe(201);

    const templateId = createRes.body.template.id as string;
    const previewRes = await agent.post(`/api/admin/marketing/email-templates/${templateId}/preview`).send({
      variables: { name: "Tester" },
    });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.preview.html).toContain("Tester");

    const deleteRes = await agent.delete(`/api/admin/marketing/email-templates/${templateId}`);
    expect(deleteRes.status).toBe(204);
  });

  it("admin can create and delete custom form definitions", async () => {
    const { agent } = await createAdminAgent(app);

    const createRes = await agent.post("/api/admin/sales/forms").send({
      formKey: "partner_signup",
      title: "Partner signup",
      description: "Custom partner intake",
      isActive: false,
      fields: [{ key: "company", label: "Company", type: "text", required: true, sortOrder: 10 }],
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.form.formKey).toBe("partner_signup");

    const deleteRes = await agent.delete(`/api/admin/sales/forms/${createRes.body.form.id}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await agent.get("/api/admin/sales/forms");
    expect(listRes.body.forms.some((f: { formKey: string }) => f.formKey === "partner_signup")).toBe(false);
  });

  it("admin cannot delete built-in membership form", async () => {
    const { agent } = await createAdminAgent(app);
    const formsRes = await agent.get("/api/admin/sales/forms");
    const membershipForm = formsRes.body.forms.find((f: { formKey: string }) => f.formKey === "membership");
    const deleteRes = await agent.delete(`/api/admin/sales/forms/${membershipForm.id}`);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error).toMatch(/built-in/i);
  });
});
