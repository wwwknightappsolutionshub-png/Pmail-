import type { NextFunction, Request, Response } from "express";
import {
  hasJobHunterWriteAccess,
  JOB_HUNTER_TRIAL_EXPIRED_REASON,
  JOB_HUNTER_UPGRADE_URL,
} from "../services/job-hunter-entitlement.service.js";

export function requireJobHunterWriteAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.auth?.user.tenant.id;
    const userId = req.auth?.user.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allowed = await hasJobHunterWriteAccess(tenantId, userId);
    if (!allowed) {
      res.status(403).json({
        error: "Job Hunter trial expired. Subscribe to continue using write features.",
        reason: JOB_HUNTER_TRIAL_EXPIRED_REASON,
        upgradeUrl: JOB_HUNTER_UPGRADE_URL,
      });
      return;
    }

    next();
  };
}
