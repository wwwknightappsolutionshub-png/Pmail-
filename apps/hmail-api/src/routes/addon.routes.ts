import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listAddonsForTenant,
  getActiveAddonSlugs,
  startAddonTrial,
} from "../services/addon.service.js";

export const addonRouter = Router();

addonRouter.use(requireAuth);

addonRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const addons = await listAddonsForTenant(tenantId);
    res.json({ addons });
  } catch (err) {
    next(err);
  }
});

addonRouter.get("/entitlements", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const slugs = await getActiveAddonSlugs(tenantId);
    res.json({ slugs });
  } catch (err) {
    next(err);
  }
});

addonRouter.post("/:slug/trial", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const userEmail = req.auth!.user.email;
    const slug = String(req.params.slug);
    const addon = await startAddonTrial(tenantId, slug, userEmail);
    res.status(201).json({ addon });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
