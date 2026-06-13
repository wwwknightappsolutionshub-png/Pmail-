import { Router } from "express";
import { z } from "zod";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { getAdminDashboard } from "../services/admin-dashboard.service.js";
import { listRecentAuditLogs } from "../services/admin-audit.service.js";
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
