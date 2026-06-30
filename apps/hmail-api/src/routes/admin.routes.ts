import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import {
  AdminAuthError,
  changeAdminPassword,
  getAdminContext,
  loginAdmin,
  logoutAdminSession,
  sanitizeAdmin,
} from "../services/admin-auth.service.js";
import {
  createSection,
  deleteSection,
  listAllSections,
  reorderSections,
  updateSection,
} from "../services/cms.service.js";
import {
  createHostingPlan,
  deleteHostingPlan,
  listAllHostingPlans,
  updateHostingPlan,
} from "../services/hosting-plans.service.js";
import {
  createAddonRecord,
  createAddonMarketing,
  deleteAddonMarketing,
  listAllAddonMarketing,
  listAllAddonsForAdmin,
  softDeleteAddonRecord,
  syncAddonCatalogAdmin,
  updateAddonMarketing,
  updateAddonRecord,
} from "../services/addon-marketing.service.js";
import {
  createTestimonial,
  deleteTestimonial,
  listAllTestimonialsAdmin,
  approveTestimonial,
  rejectTestimonial,
  updateTestimonial,
} from "../services/testimonial.service.js";
import {
  createHostingAccount,
  deleteHostingAccount,
  listHostingAccounts,
  updateHostingAccount,
} from "../services/hosting-accounts.service.js";
import {
  createTenant,
  deleteTenant,
  listTenants,
  updateTenant,
} from "../services/tenants-admin.service.js";
import { getEnv } from "../config/env.js";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import { adminOpsRouter } from "./admin-ops.routes.js";
import { adminSalesRouter } from "./admin-sales.routes.js";
import { adminMarketingRouter } from "./admin-marketing.routes.js";
import { adminSeoRouter } from "./admin-seo.routes.js";
import { listMarketingLeads, updateMarketingLead, getMarketingLeadStats } from "../services/marketing-leads.service.js";
import { getPmailReferralLeadStats, listPmailReferralLeads } from "../services/referral-lead.service.js";
import {
  getPmailProspectStats,
  listPmailProspects,
  updatePmailProspect,
  type PmailProspectStatus,
} from "../services/pmail-prospect.service.js";
import { provisionTenantFromLead, ProvisioningError } from "../services/provisioning.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const sectionSchema = z.object({
  sectionKey: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  bulletPoints: z.array(z.string()).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaUrl: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

const hostingPlanSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().nullable().optional(),
  priceCents: z.number().int().min(0),
  billingPeriod: z.enum(["monthly", "yearly"]).optional(),
  diskGb: z.number().int().min(1).optional(),
  bandwidthGb: z.number().int().min(1).optional(),
  websites: z.number().int().min(1).optional(),
  emailAccounts: z.number().int().min(0).optional(),
  databases: z.number().int().min(0).optional(),
  features: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const addonMarketingSchema = z.object({
  addonId: z.string().uuid().optional(),
  addonSlug: z.string().min(1).optional(),
  marketingTitle: z.string().nullable().optional(),
  marketingSubtitle: z.string().nullable().optional(),
  longDescription: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
  displayPriceCents: z.number().int().min(0).optional(),
  trialDays: z.number().int().min(0).optional(),
  ctaLabel: z.string().optional(),
  landingFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

const addonAdminSchema = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  group: z.string().min(1).optional(),
  vertical: z.enum(["legal", "real-estate", "accounting", "recruitment", "b2b-services", "healthcare", "platform"]).optional(),
  addonKind: z.enum(["vertical", "platform", "system"]).optional(),
  description: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  tenantPriceCents: z.number().int().min(0).optional(),
  minTenantSeats: z.number().int().min(1).optional(),
  releasePhase: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  comingSoon: z.boolean().optional(),
  priceCents: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
});

const addonAdminCreateSchema = addonAdminSchema.extend({
  slug: z.string().min(1),
  name: z.string().min(1),
  group: z.string().min(1),
  vertical: z.enum(["legal", "real-estate", "accounting", "recruitment", "b2b-services", "healthcare", "platform"]),
  description: z.string().min(1),
  features: z.array(z.string()).default([]),
});

const tenantSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

const hostingAccountSchema = z.object({
  tenantId: z.string().uuid(),
  planId: z.string().uuid().nullable().optional(),
  username: z.string().min(1),
  domain: z.string().min(1),
  homePath: z.string().optional(),
  password: z.string().min(6).optional(),
  diskQuotaMb: z.number().int().min(1).optional(),
  diskUsedMb: z.number().int().min(0).optional(),
  bandwidthMb: z.number().int().min(1).optional(),
  bandwidthUsedMb: z.number().int().min(0).optional(),
  emailAccounts: z.number().int().min(0).optional(),
  databases: z.number().int().min(0).optional(),
  isSuspended: z.boolean().optional(),
});

const hostingAccountCreateSchema = hostingAccountSchema.extend({
  password: z.string().min(6),
});

export const adminRouter = Router();

adminRouter.post("/auth/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { token, admin } = await loginAdmin({
      email: body.email,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    const env = getEnv();
    res.cookie("hostnet_admin_session", token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ token, admin: sanitizeAdmin(admin) });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminRouter.post("/auth/logout", async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || (req.cookies?.hostnet_admin_session as string | undefined);
    if (token) await logoutAdminSession(token);
    res.clearCookie("hostnet_admin_session");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/auth/me", async (req, res, next) => {
  try {
    const admin = await getAdminContext(req);
    if (!admin) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ admin: sanitizeAdmin(admin) });
  } catch (err) {
    next(err);
  }
});

adminRouter.use(requireAdmin);

adminRouter.post("/auth/change-password", async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    await changeAdminPassword({
      adminId: req.admin!.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    await auditAdminMutation(req, "admin.change_password", "platform_admin", req.admin!.id);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminRouter.get("/sections", async (_req, res, next) => {
  try {
    const sections = await listAllSections();
    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/sections", async (req, res, next) => {
  try {
    const body = sectionSchema.parse(req.body);
    const section = await createSection(body);
    res.status(201).json({ section });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/sections/:id", async (req, res, next) => {
  try {
    const body = sectionSchema.partial().parse(req.body);
    const section = await updateSection(req.params.id, body);
    res.json({ section });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/sections/:id", async (req, res, next) => {
  try {
    await deleteSection(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const sectionReorderSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })).min(1),
});

adminRouter.post("/sections/reorder", async (req, res, next) => {
  try {
    const body = sectionReorderSchema.parse(req.body);
    const sections = await reorderSections(body.order);
    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/hosting-plans", async (_req, res, next) => {
  try {
    const hostingPlans = await listAllHostingPlans();
    res.json({ hostingPlans });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/hosting-plans", async (req, res, next) => {
  try {
    const body = hostingPlanSchema.parse(req.body);
    const plan = await createHostingPlan(body);
    res.status(201).json({ plan });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/hosting-plans/:id", async (req, res, next) => {
  try {
    const body = hostingPlanSchema.partial().parse(req.body);
    const plan = await updateHostingPlan(req.params.id, body);
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/hosting-plans/:id", async (req, res, next) => {
  try {
    await deleteHostingPlan(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/addon-marketing", async (_req, res, next) => {
  try {
    const addonMarketing = await listAllAddonMarketing();
    res.json({ addonMarketing });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/addons", async (_req, res, next) => {
  try {
    const addons = await listAllAddonsForAdmin();
    res.json({ addons });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/addons", async (req, res, next) => {
  try {
    const body = addonAdminCreateSchema.parse(req.body);
    const addon = await createAddonRecord(body);
    await auditAdminMutation(req, "addon.create", "addon", addon.id, { slug: addon.slug });
    res.status(201).json({ addon });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/addons/sync-catalog", async (_req, res, next) => {
  try {
    const counts = await syncAddonCatalogAdmin();
    const addons = await listAllAddonsForAdmin();
    res.json({ ...counts, addons });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/addons/:id", async (req, res, next) => {
  try {
    const body = addonAdminSchema.parse(req.body);
    const addon = await updateAddonRecord(req.params.id, body);
    await auditAdminMutation(req, "addon.update", "addon", req.params.id);
    res.json({ addon });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/addons/:id", async (req, res, next) => {
  try {
    await softDeleteAddonRecord(req.params.id);
    await auditAdminMutation(req, "addon.soft_delete", "addon", req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/addon-marketing", async (req, res, next) => {
  try {
    const body = addonMarketingSchema.parse(req.body);
    const item = await createAddonMarketing(body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/addon-marketing/:id", async (req, res, next) => {
  try {
    const body = addonMarketingSchema.partial().parse(req.body);
    const item = await updateAddonMarketing(req.params.id, body);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/addon-marketing/:id", async (req, res, next) => {
  try {
    await deleteAddonMarketing(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const testimonialSchema = z.object({
  authorName: z.string().min(1).max(120),
  authorRole: z.string().max(120).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  body: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  sortOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

adminRouter.get("/testimonials", async (_req, res, next) => {
  try {
    const testimonials = await listAllTestimonialsAdmin();
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/testimonials", async (req, res, next) => {
  try {
    const body = testimonialSchema.parse(req.body);
    const testimonial = await createTestimonial(body);
    res.status(201).json({ testimonial });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/testimonials/:id", async (req, res, next) => {
  try {
    const body = testimonialSchema.partial().parse(req.body);
    const testimonial = await updateTestimonial(req.params.id, body);
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/testimonials/:id/approve", async (req, res, next) => {
  try {
    const testimonial = await approveTestimonial(req.params.id);
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/testimonials/:id/reject", async (req, res, next) => {
  try {
    const testimonial = await rejectTestimonial(req.params.id);
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/testimonials/:id", async (req, res, next) => {
  try {
    await deleteTestimonial(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/tenants", async (_req, res, next) => {
  try {
    const tenants = await listTenants();
    res.json({ tenants });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/tenants", async (req, res, next) => {
  try {
    const body = tenantSchema.parse(req.body);
    const tenant = await createTenant(body);
    res.status(201).json({ tenant });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/tenants/:id", async (req, res, next) => {
  try {
    const body = tenantSchema.partial().parse(req.body);
    const tenant = await updateTenant(req.params.id, body);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/tenants/:id", async (req, res, next) => {
  try {
    await deleteTenant(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/hosting-accounts", async (_req, res, next) => {
  try {
    const hostingAccounts = await listHostingAccounts();
    res.json({ hostingAccounts });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/hosting-accounts", async (req, res, next) => {
  try {
    const body = hostingAccountCreateSchema.parse(req.body);
    const account = await createHostingAccount(body);
    res.status(201).json({ account });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/hosting-accounts/:id", async (req, res, next) => {
  try {
    const body = hostingAccountSchema.partial().parse(req.body);
    const account = await updateHostingAccount(req.params.id, body);
    res.json({ account });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/hosting-accounts/:id", async (req, res, next) => {
  try {
    await deleteHostingAccount(req.params.id);
    await auditAdminMutation(req, "hosting_account.delete", "hosting_account", req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/leads/stats", async (_req, res, next) => {
  try {
    const stats = await getMarketingLeadStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/leads", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const leads = await listMarketingLeads({
      status: status as import("../services/marketing-leads.service.js").LeadStatus | undefined,
      q,
      limit,
    });
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "closed"]).optional(),
  notes: z.string().nullable().optional(),
});

adminRouter.patch("/leads/:id", async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = leadUpdateSchema.parse(req.body);
    const lead = await updateMarketingLead(id, body);
    await auditAdminMutation(req, "lead.update", "marketing_lead", id);
    res.json({ lead });
  } catch (err) {
    if (err instanceof Error && err.message === "Invalid lead status") {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminRouter.post("/leads/:id/convert", async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await provisionTenantFromLead(id);
    await auditAdminMutation(req, "lead.convert", "marketing_lead", id);
    res.json(result);
  } catch (err) {
    if (err instanceof ProvisioningError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminRouter.get("/referral-leads/stats", requireSuperAdmin, async (_req, res, next) => {
  try {
    const stats = await getPmailReferralLeadStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/referral-leads", requireSuperAdmin, async (req, res, next) => {
  try {
    const emailStatus = typeof req.query.emailStatus === "string" ? req.query.emailStatus : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const leads = await listPmailReferralLeads({ emailStatus, q });
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

const prospectUpdateSchema = z.object({
  status: z.enum(["interested", "contacted", "invited", "converted", "closed"]).optional(),
  notes: z.string().nullable().optional(),
});

adminRouter.get("/pmail-prospects/stats", requireSuperAdmin, async (_req, res, next) => {
  try {
    const stats = await getPmailProspectStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/pmail-prospects", requireSuperAdmin, async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? (req.query.status as PmailProspectStatus) : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const prospects = await listPmailProspects({ status, q });
    res.json({ prospects });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/pmail-prospects/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = prospectUpdateSchema.parse(req.body);
    const prospect = await updatePmailProspect(id, body);
    await auditAdminMutation(req, "pmail_prospect.update", "pmail_prospect", id);
    res.json({ prospect });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof Error && err.message === "Invalid prospect status") {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminRouter.use(adminOpsRouter);
adminRouter.use("/sales", adminSalesRouter);
adminRouter.use("/marketing", adminMarketingRouter);
adminRouter.use("/seo", adminSeoRouter);
