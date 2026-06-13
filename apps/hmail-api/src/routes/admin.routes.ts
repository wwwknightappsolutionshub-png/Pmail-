import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  AdminAuthError,
  getAdminContext,
  loginAdmin,
  logoutAdminSession,
  sanitizeAdmin,
} from "../services/admin-auth.service.js";
import {
  createSection,
  deleteSection,
  listAllSections,
  updateSection,
} from "../services/cms.service.js";
import {
  createHostingPlan,
  deleteHostingPlan,
  listAllHostingPlans,
  updateHostingPlan,
} from "../services/hosting-plans.service.js";
import {
  createAddonMarketing,
  deleteAddonMarketing,
  listAllAddonMarketing,
  updateAddonMarketing,
} from "../services/addon-marketing.service.js";
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

adminRouter.use(adminOpsRouter);
