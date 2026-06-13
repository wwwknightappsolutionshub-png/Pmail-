import type { NextFunction, Request, Response } from "express";
import { tenantHasAddonAccess } from "../services/addon.service.js";

export function requireAddon(slug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.auth?.user.tenant.id;
    if (!tenantId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allowed = await tenantHasAddonAccess(tenantId, slug);
    if (!allowed) {
      res.status(403).json({ error: "Add-on not active. Start a trial from the Marketplace." });
      return;
    }

    next();
  };
}
