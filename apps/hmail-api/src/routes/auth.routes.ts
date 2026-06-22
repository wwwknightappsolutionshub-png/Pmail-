import { Router } from "express";
import { z } from "zod";
import {
  AuthError,
  getAuthContext,
  listTenantWorkspaceUsers,
  loginUser,
  loginTesterUser,
  logoutSession,
  resolveTenantBySlug,
  sanitizeUser,
  updateUserThemeVersion,
} from "../services/auth.service.js";
import { isPmailTesterBypassEnabled } from "../services/pmail-tester.service.js";
import { getTenantMailOnboardingStatus } from "../services/mail-onboarding.service.js";
import {
  getLoginPreflight,
  serializeUserMailConfig,
  updateUserMailConfigAuthenticated,
} from "../services/user-mail-config.service.js";
import { isMailProviderPresetKey, resolveMailConfigFromPreset } from "../data/mail-providers.js";
import { getEnv } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { isBusinessVertical, selectBusinessVertical } from "../services/business-vertical.service.js";
import { attributeReferralSignup } from "../services/referral-lead.service.js";

const loginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  providerPreset: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  referrerEmail: z.string().email().optional(),
});

const userMailConfigBodySchema = z.object({
  providerPreset: z.string().min(1),
  imapHost: z.string().optional(),
  imapPort: z.coerce.number().int().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  testPassword: z.string().min(1).optional(),
});

const businessVerticalSchema = z.object({
  businessVertical: z.string().min(1),
});

const themeSchema = z.object({
  uiThemeVersion: z.enum(["dark", "light"]),
});

export const authRouter = Router();

authRouter.get("/tenant/:slug", async (req, res, next) => {
  try {
    const status = await getTenantMailOnboardingStatus(req.params.slug);
    const tenant = await resolveTenantBySlug(req.params.slug);
    res.json({
      slug: status.tenantSlug,
      name: status.tenantName,
      branding: tenant.branding,
      mailOnboardingComplete: status.mailOnboardingComplete,
      mail: status.mail,
    });
  } catch (err) {
    if (err instanceof AuthError || err instanceof Error) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.get("/login-preflight", async (req, res, next) => {
  try {
    const tenantSlug = z.string().min(1).parse(req.query.tenantSlug);
    const email = z.string().email().parse(req.query.email);
    const result = await getLoginPreflight(tenantSlug, email);
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const testerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/tester/login", async (req, res, next) => {
  try {
    if (!isPmailTesterBypassEnabled()) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = testerLoginSchema.parse(req.body);
    const { token, user } = await loginTesterUser({
      email: body.email,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    const env = getEnv();
    res.cookie("hmail_session", token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { token, user } = await loginUser({
      tenantSlug: body.tenantSlug,
      email: body.email,
      password: body.password,
      providerPreset: body.providerPreset,
      imapHost: body.imapHost,
      imapPort: body.imapPort,
      imapSecure: body.imapSecure,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpSecure: body.smtpSecure,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    const env = getEnv();
    res.cookie("hmail_session", token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    if (body.referrerEmail) {
      await attributeReferralSignup({
        userId: user.id,
        userEmail: user.email,
        tenantId: user.tenant.id,
        referrerEmail: body.referrerEmail,
        displayName: user.displayName,
      });
    }

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const context = await getAuthContext(req);
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || (req.cookies?.hmail_session as string | undefined);
    if (token) await logoutSession(token);

    res.clearCookie("hmail_session");
    res.json({ ok: true, user: context ? sanitizeUser(context.user) : null });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const context = await getAuthContext(req);
    if (!context) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json({ user: sanitizeUser(context.user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/organization-users", requireAuth, async (req, res, next) => {
  try {
    const users = await listTenantWorkspaceUsers(req.auth!.user.tenant.id);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

authRouter.patch("/me/theme", requireAuth, async (req, res, next) => {
  try {
    const body = themeSchema.parse(req.body);
    const user = await updateUserThemeVersion(req.auth!.user.id, body.uiThemeVersion);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/business-vertical", requireAuth, async (req, res, next) => {
  try {
    const body = businessVerticalSchema.parse(req.body);
    if (!isBusinessVertical(body.businessVertical)) {
      res.status(400).json({ error: "Invalid business vertical" });
      return;
    }

    const user = await selectBusinessVertical(
      req.auth!.user.id,
      req.auth!.user.tenant.id,
      body.businessVertical,
    );

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.get("/mail-config", requireAuth, async (req, res, next) => {
  try {
    const mail = req.auth!.user.mailConfig;
    res.json({
      mail: mail ? serializeUserMailConfig(mail) : null,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.patch("/mail-config", requireAuth, async (req, res, next) => {
  try {
    const body = userMailConfigBodySchema.parse(req.body);
    if (!isMailProviderPresetKey(body.providerPreset)) {
      res.status(400).json({ error: "Invalid provider preset" });
      return;
    }

    const config = resolveMailConfigFromPreset(body.providerPreset, {
      imapHost: body.imapHost,
      imapPort: body.imapPort,
      imapSecure: body.imapSecure,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpSecure: body.smtpSecure,
    });

    const mail = await updateUserMailConfigAuthenticated(
      req.auth!.user.id,
      config,
      body.testPassword
        ? { email: req.auth!.user.email, password: body.testPassword }
        : undefined,
    );

    res.json({
      mail: serializeUserMailConfig(mail),
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

authRouter.post("/mail-config/test", requireAuth, async (req, res, next) => {
  try {
    const body = userMailConfigBodySchema.extend({
      testPassword: z.string().min(1),
    }).parse(req.body);

    if (!isMailProviderPresetKey(body.providerPreset)) {
      res.status(400).json({ error: "Invalid provider preset" });
      return;
    }

    const config = resolveMailConfigFromPreset(body.providerPreset, {
      imapHost: body.imapHost,
      imapPort: body.imapPort,
      imapSecure: body.imapSecure,
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpSecure: body.smtpSecure,
    });

    await updateUserMailConfigAuthenticated(req.auth!.user.id, config, {
      email: req.auth!.user.email,
      password: body.testPassword,
    });

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
