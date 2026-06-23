import type { NextFunction, Request, Response } from "express";
import { isCareerNavUnlocked } from "../lib/job-hunter.js";
import { recordCareerUnlockedIfNeeded } from "../services/job-hunter-entitlement.service.js";
import { getOrCreateJobHunterSettings } from "../services/job-hunter-settings.service.js";

export function requireCareerUnlocked() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.auth?.user.tenant.id;
    const userId = req.auth?.user.id;
    if (!tenantId || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const settings = await getOrCreateJobHunterSettings(tenantId, userId);
    const unlocked = isCareerNavUnlocked({
      careerScore: settings.careerScore,
      manualJobHuntingOverride: settings.manualJobHuntingOverride,
    });

    if (!unlocked) {
      res.status(403).json({
        error: "Career workspace is locked until your career score reaches the threshold or you enable “I'm job hunting.”",
        reason: "career_nav_locked",
      });
      return;
    }

    await recordCareerUnlockedIfNeeded(tenantId, userId);
    next();
  };
}
