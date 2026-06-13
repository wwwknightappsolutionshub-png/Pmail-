import { Router } from "express";
import { z } from "zod";
import {
  AuthError,
  loginUser,
  logoutSession,
  resolveTenantBySlug,
  sanitizeUser,
  getAuthContext,
} from "../services/auth.service.js";
import { getEnv } from "../config/env.js";

const loginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.get("/tenant/:slug", async (req, res, next) => {
  try {
    const tenant = await resolveTenantBySlug(req.params.slug);
    res.json({
      slug: tenant.slug,
      name: tenant.name,
      branding: tenant.branding,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(404).json({ error: err.message });
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
