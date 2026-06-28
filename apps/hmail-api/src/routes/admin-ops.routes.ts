import { Router } from "express";
import { z } from "zod";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { getAdminDashboard } from "../services/admin-dashboard.service.js";
import { getAdminTrends, getBillingRevenueDashboard } from "../services/admin-analytics.service.js";
import { getAdminPollSnapshot } from "../services/admin-poll.service.js";
import {
  getMailUserPresenceStats,
  listActiveMailUserSessions,
  listGlobalMailUsers,
  listMailUserSessions,
  listOnlineMailUsers,
} from "../services/user-presence.service.js";
import { listRecentAuditLogs } from "../services/admin-audit.service.js";
import { getAdminSystemStatus } from "../services/ops-status.service.js";
import {
  createPlatformAdmin,
  deletePlatformAdmin,
  listPlatformAdmins,
  PlatformAdminError,
  updatePlatformAdmin,
} from "../services/platform-admins.service.js";
import {
  createVpsInstance,
  deleteVpsInstance,
  getVpsInstance,
  listVpsInstances,
  updateVpsInstance,
} from "../services/vps.service.js";
import {
  createTenantMailUser,
  deleteTenantMailUser,
  getTenantOperations,
  grantTenantAddonTrial,
  revokeTenantAddonTrial,
  TenantOpsError,
  updateTenantBranding,
  updateTenantMailConfig,
  updateTenantMailUser,
} from "../services/tenant-ops.service.js";
import {
  adminSetTenantGrowthPlanTier,
  grantTenantAddonSubscription,
  GrowthAdminOpsError,
  revokeTenantAddonSubscription,
} from "../services/growth-admin-ops.service.js";
import {
  getPmailPlatformConfig,
  updatePmailPlatformConfig,
} from "../services/pmail-platform-config.service.js";
import {
  broadcastMailPush,
  getMailPushAudienceStats,
  getVapidPublicKey,
} from "../services/pwa-push.service.js";

const brandingSchema = z.object({
  productName: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  loginTagline: z.string().optional(),
});

const mailConfigSchema = z.object({
  imapHost: z.string().optional(),
  imapPort: z.number().int().optional(),
  imapSecure: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpSecure: z.boolean().optional(),
});

const mailUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
});

const mailUserUpdateSchema = z.object({
  displayName: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const trialGrantSchema = z.object({
  addonSlug: z.string().min(1),
  trialDays: z.number().int().min(1).max(90).optional(),
});

const subscriptionGrantSchema = z.object({
  addonSlug: z.string().min(1),
  periodDays: z.number().int().min(1).max(365).optional(),
});

const growthPlanTierSchema = z.object({
  planSlug: z.enum(["starter", "pro", "agency"]),
  planTierOverride: z.boolean().optional(),
});

const pmailPlatformConfigSchema = z.object({
  mailPushEnabled: z.boolean().optional(),
  mailPushDefaultForUsers: z.boolean().optional(),
  pwaPushAutoSubscribe: z.boolean().optional(),
});

const pmailPushBroadcastSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(240),
  url: z.string().max(500).optional(),
  tenantId: z.string().uuid().optional(),
});

const vpsSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  label: z.string().min(1),
  hostname: z.string().min(1),
  ipAddress: z.string().nullable().optional(),
  region: z.string().optional(),
  planSlug: z.string().optional(),
  cpuCores: z.number().int().min(1).optional(),
  ramMb: z.number().int().min(512).optional(),
  diskGb: z.number().int().min(10).optional(),
  status: z.enum(["provisioning", "running", "stopped", "suspended"]).optional(),
  isActive: z.boolean().optional(),
});

const platformAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(["super_admin", "admin"]).optional(),
});

const platformAdminUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const adminOpsRouter = Router();

adminOpsRouter.get("/mail-users/presence", async (_req, res, next) => {
  try {
    const stats = await getMailUserPresenceStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/mail-users/online", async (_req, res, next) => {
  try {
    const payload = await listOnlineMailUsers();
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/mail-users/sessions", async (req, res, next) => {
  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const payload = await listActiveMailUserSessions({ userId, limit });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/mail-users/:id/sessions", async (req, res, next) => {
  try {
    const payload = await listMailUserSessions(paramId(req.params.id));
    if (!payload) {
      res.status(404).json({ error: "Mail user not found" });
      return;
    }
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/mail-users", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : undefined;
    const onlineOnly = req.query.onlineOnly === "true" || req.query.onlineOnly === "1";
    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const payload = await listGlobalMailUsers({ q, tenantId, onlineOnly, page, limit });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const dashboard = await getAdminDashboard();
    res.json({ dashboard });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/audit-log", async (req, res, next) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const logs = await listRecentAuditLogs(limit);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/tenants/:id/ops", async (req, res, next) => {
  try {
    const ops = await getTenantOperations(paramId(req.params.id));
    if (!ops) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json({ ops });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.patch("/tenants/:id/branding", async (req, res, next) => {
  try {
    const body = brandingSchema.parse(req.body);
    const branding = await updateTenantBranding(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.branding.update", "tenant", paramId(req.params.id));
    res.json({ branding });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.patch("/tenants/:id/mail", async (req, res, next) => {
  try {
    const body = mailConfigSchema.parse(req.body);
    const mail = await updateTenantMailConfig(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.mail.update", "tenant", paramId(req.params.id));
    res.json({ mail });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.post("/tenants/:id/mail-users", async (req, res, next) => {
  try {
    const body = mailUserSchema.parse(req.body);
    const user = await createTenantMailUser(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.mail_user.create", "user", user.id, { email: user.email });
    res.status(201).json({ user });
  } catch (err) {
    if (err instanceof TenantOpsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.patch("/tenants/:id/mail-users/:userId", async (req, res, next) => {
  try {
    const body = mailUserUpdateSchema.parse(req.body);
    const user = await updateTenantMailUser(paramId(req.params.id), paramId(req.params.userId), body);
    await auditAdminMutation(req, "tenant.mail_user.update", "user", user.id);
    res.json({ user });
  } catch (err) {
    if (err instanceof TenantOpsError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.delete("/tenants/:id/mail-users/:userId", async (req, res, next) => {
  try {
    await deleteTenantMailUser(paramId(req.params.id), paramId(req.params.userId));
    await auditAdminMutation(req, "tenant.mail_user.delete", "user", paramId(req.params.userId));
    res.status(204).send();
  } catch (err) {
    if (err instanceof TenantOpsError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.post("/tenants/:id/addon-trials", async (req, res, next) => {
  try {
    const body = trialGrantSchema.parse(req.body);
    const trial = await grantTenantAddonTrial(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.addon_trial.grant", "trial", trial.id, {
      addonSlug: trial.addonSlug,
    });
    res.status(201).json({ trial });
  } catch (err) {
    if (err instanceof TenantOpsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.delete("/tenants/:id/addon-trials/:trialId", async (req, res, next) => {
  try {
    await revokeTenantAddonTrial(paramId(req.params.id), paramId(req.params.trialId));
    await auditAdminMutation(req, "tenant.addon_trial.revoke", "trial", paramId(req.params.trialId));
    res.status(204).send();
  } catch (err) {
    if (err instanceof TenantOpsError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.post("/tenants/:id/addon-subscriptions", async (req, res, next) => {
  try {
    const body = subscriptionGrantSchema.parse(req.body);
    const subscription = await grantTenantAddonSubscription(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.addon_subscription.grant", "subscription", subscription.id, {
      addonSlug: subscription.addonSlug,
    });
    res.status(201).json({ subscription });
  } catch (err) {
    if (err instanceof GrowthAdminOpsError || err instanceof TenantOpsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.delete("/tenants/:id/addon-subscriptions/:subscriptionId", async (req, res, next) => {
  try {
    await revokeTenantAddonSubscription(paramId(req.params.id), paramId(req.params.subscriptionId));
    await auditAdminMutation(req, "tenant.addon_subscription.revoke", "subscription", paramId(req.params.subscriptionId));
    res.status(204).send();
  } catch (err) {
    if (err instanceof GrowthAdminOpsError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.patch("/tenants/:id/growth-plan", async (req, res, next) => {
  try {
    const body = growthPlanTierSchema.parse(req.body);
    const growth = await adminSetTenantGrowthPlanTier(paramId(req.params.id), body);
    await auditAdminMutation(req, "tenant.growth_plan.set", "growth_workspace_settings", growth.workspaceId, {
      planSlug: growth.planSlug,
      planTierOverride: growth.planTierOverride,
    });
    res.json({ growth });
  } catch (err) {
    if (err instanceof GrowthAdminOpsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.get("/vps", async (_req, res, next) => {
  try {
    const vpsInstances = await listVpsInstances();
    res.json({ vpsInstances });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/vps/:id", async (req, res, next) => {
  try {
    const vps = await getVpsInstance(paramId(req.params.id));
    if (!vps) {
      res.status(404).json({ error: "VPS not found" });
      return;
    }
    res.json({ vps });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.post("/vps", async (req, res, next) => {
  try {
    const body = vpsSchema.parse(req.body);
    const vps = await createVpsInstance(body);
    await auditAdminMutation(req, "vps.create", "vps", vps.id, { hostname: vps.hostname });
    res.status(201).json({ vps });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.patch("/vps/:id", async (req, res, next) => {
  try {
    const body = vpsSchema.partial().parse(req.body);
    const vps = await updateVpsInstance(paramId(req.params.id), body);
    await auditAdminMutation(req, "vps.update", "vps", vps.id);
    res.json({ vps });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.delete("/vps/:id", async (req, res, next) => {
  try {
    await deleteVpsInstance(paramId(req.params.id));
    await auditAdminMutation(req, "vps.delete", "vps", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/platform-admins", requireSuperAdmin, async (_req, res, next) => {
  try {
    const platformAdmins = await listPlatformAdmins();
    res.json({ platformAdmins });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.post("/platform-admins", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = platformAdminSchema.parse(req.body);
    const admin = await createPlatformAdmin(body);
    await auditAdminMutation(req, "platform_admin.create", "platform_admin", admin.id, {
      email: admin.email,
    });
    res.status(201).json({ admin });
  } catch (err) {
    if (err instanceof PlatformAdminError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.patch("/platform-admins/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = platformAdminUpdateSchema.parse(req.body);
    const admin = await updatePlatformAdmin(paramId(req.params.id), body);
    await auditAdminMutation(req, "platform_admin.update", "platform_admin", admin.id);
    res.json({ admin });
  } catch (err) {
    if (err instanceof PlatformAdminError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.delete("/platform-admins/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    await deletePlatformAdmin(paramId(req.params.id), req.admin!.id);
    await auditAdminMutation(req, "platform_admin.delete", "platform_admin", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof PlatformAdminError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.get("/pmail-platform-config", requireSuperAdmin, async (_req, res, next) => {
  try {
    const config = await getPmailPlatformConfig();
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.patch("/pmail-platform-config", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = pmailPlatformConfigSchema.parse(req.body);
    const config = await updatePmailPlatformConfig(body);
    await auditAdminMutation(req, "pmail_platform_config.update", "pmail_platform_config", "default", body);
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/pmail-push/stats", requireSuperAdmin, async (_req, res, next) => {
  try {
    const stats = await getMailPushAudienceStats();
    res.json({
      ...stats,
      vapidConfigured: Boolean(getVapidPublicKey()),
    });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.post("/pmail-push/broadcast", requireSuperAdmin, async (req, res, next) => {
  try {
    const body = pmailPushBroadcastSchema.parse(req.body);
    const result = await broadcastMailPush(body);
    await auditAdminMutation(req, "pmail_push.broadcast", "pmail_push", "broadcast", {
      title: body.title,
      targetedUsers: result.targetedUsers,
      delivered: result.delivered,
      tenantId: body.tenantId ?? null,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminOpsRouter.get("/system-status", async (_req, res, next) => {
  try {
    const status = await getAdminSystemStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/poll", async (_req, res, next) => {
  try {
    const snapshot = await getAdminPollSnapshot();
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/analytics/trends", async (req, res, next) => {
  try {
    const days = typeof req.query.days === "string" ? Math.min(90, Math.max(7, Number(req.query.days))) : 30;
    const trends = await getAdminTrends(days);
    res.json({ trends });
  } catch (err) {
    next(err);
  }
});

adminOpsRouter.get("/billing/revenue", async (_req, res, next) => {
  try {
    const revenue = await getBillingRevenueDashboard();
    res.json({ revenue });
  } catch (err) {
    next(err);
  }
});
