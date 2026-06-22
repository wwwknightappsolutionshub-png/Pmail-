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
import {
  createPanelDatabase,
  createPanelDomain,
  createPanelFile,
  createPanelMailbox,
  deletePanelDatabase,
  deletePanelFile,
  deletePanelMailbox,
  ensurePanelDefaults,
  listPanelDatabases,
  listPanelDomains,
  listPanelFiles,
  listPanelMailboxes,
} from "../services/panel-resources.service.js";

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

panelRouter.get("/files", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    await ensurePanelDefaults(account);
    const parentPath = String(req.query.path ?? "/");
    const entries = await listPanelFiles(account.id, parentPath);
    res.json({ path: parentPath, entries });
  } catch (err) {
    next(err);
  }
});

panelRouter.post("/files", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    const entry = await createPanelFile(account.id, {
      parentPath: String(req.body?.parentPath ?? "/"),
      name: String(req.body?.name ?? ""),
      type: req.body?.type === "dir" ? "dir" : "file",
      content: req.body?.content ? String(req.body.content) : undefined,
    });
    res.status(201).json({ entry });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.delete("/files/:id", async (req, res, next) => {
  try {
    await deletePanelFile(req.panelAccount!.id, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.get("/databases", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    await ensurePanelDefaults(account);
    const databases = await listPanelDatabases(account.id);
    res.json({ databases });
  } catch (err) {
    next(err);
  }
});

panelRouter.post("/databases", async (req, res, next) => {
  try {
    const row = await createPanelDatabase(req.panelAccount!.id, String(req.body?.name ?? ""));
    res.status(201).json({ database: row });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.delete("/databases/:id", async (req, res, next) => {
  try {
    await deletePanelDatabase(req.panelAccount!.id, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.get("/domains", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    await ensurePanelDefaults(account);
    const domains = await listPanelDomains(account.id);
    res.json({ domains });
  } catch (err) {
    next(err);
  }
});

panelRouter.post("/domains", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    const row = await createPanelDomain(account.id, account, String(req.body?.domain ?? ""));
    res.status(201).json({ domain: row });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.get("/email", async (req, res, next) => {
  try {
    const account = req.panelAccount!;
    await ensurePanelDefaults(account);
    const accounts = await listPanelMailboxes(account.id);
    res.json({
      accounts,
      hmailUrl: `/login/${account.tenant.slug}`,
    });
  } catch (err) {
    next(err);
  }
});

panelRouter.post("/email", async (req, res, next) => {
  try {
    const row = await createPanelMailbox(
      req.panelAccount!.id,
      String(req.body?.address ?? ""),
      Number(req.body?.quotaMb ?? 512),
    );
    res.status(201).json({ mailbox: row });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

panelRouter.delete("/email/:id", async (req, res, next) => {
  try {
    await deletePanelMailbox(req.panelAccount!.id, String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
