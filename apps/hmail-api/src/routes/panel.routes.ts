import { Router } from "express";
import { z } from "zod";
import { getEnv } from "../config/env.js";
import { requirePanel } from "../middleware/requirePanel.js";
import {
  getPanelContext,
  getPanelDashboard,
  loginPanelUser,
  logoutPanelSession,
  PanelAuthError,
  sanitizeHostingAccount,
} from "../services/panel-auth.service.js";

const loginSchema = z.object({
  username: z.string().min(1),
  domain: z.string().min(1),
  password: z.string().min(1),
});

export const panelRouter = Router();

panelRouter.post("/auth/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const { token, account } = await loginPanelUser({
      username: body.username,
      domain: body.domain,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });

    const env = getEnv();
    res.cookie("hostnet_panel_session", token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.json({ token, account: sanitizeHostingAccount(account) });
  } catch (err) {
    if (err instanceof PanelAuthError) {
      res.status(401).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.post("/auth/logout", async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const token = bearer || (req.cookies?.hostnet_panel_session as string | undefined);
    if (token) await logoutPanelSession(token);
    res.clearCookie("hostnet_panel_session");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

panelRouter.get("/auth/me", async (req, res, next) => {
  try {
    const account = await getPanelContext(req);
    if (!account) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ account: sanitizeHostingAccount(account) });
  } catch (err) {
    next(err);
  }
});

panelRouter.use(requirePanel);

panelRouter.get("/dashboard", async (req, res, next) => {
  try {
    const dashboard = await getPanelDashboard(req.panelAccount!);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

panelRouter.get("/files", async (req, res) => {
  const account = req.panelAccount!;
  res.json({
    path: account.homePath,
    entries: [
      { name: "public_html", type: "dir", size: null },
      { name: "mail", type: "dir", size: null },
      { name: "logs", type: "dir", size: null },
      { name: "backups", type: "dir", size: null },
      { name: ".htaccess", type: "file", size: 412 },
    ],
  });
});

panelRouter.get("/databases", async (req, res) => {
  const account = req.panelAccount!;
  res.json({
    databases: Array.from({ length: account.databases }, (_, i) => ({
      id: `db_${i + 1}`,
      name: `${account.username}_db${i + 1}`,
      sizeMb: 12 + i * 4,
    })),
  });
});

panelRouter.get("/domains", async (req, res) => {
  const account = req.panelAccount!;
  res.json({
    domains: [
      {
        domain: account.domain,
        documentRoot: `${account.homePath}/public_html`,
        ssl: true,
        primary: true,
      },
    ],
  });
});

panelRouter.get("/email", async (req, res) => {
  const account = req.panelAccount!;
  res.json({
    accounts: [
      {
        address: `${account.username}@${account.domain}`,
        quotaMb: 1024,
        usedMb: 240,
      },
      {
        address: `support@${account.domain}`,
        quotaMb: 512,
        usedMb: 88,
      },
    ],
    hmailUrl: `/login/${account.tenant.slug}`,
  });
});
