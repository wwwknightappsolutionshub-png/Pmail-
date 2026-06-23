import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { assertHealthcareAccess } from "../services/healthcare-access.service.js";

export function requireHealthcareAddon(addonSlug: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.user.id;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { healthcareAccessRole: true },
      });
      assertHealthcareAccess(user?.healthcareAccessRole, addonSlug);
      next();
    } catch (err) {
      if (err instanceof Error) {
        res.status(403).json({ error: err.message });
        return;
      }
      next(err);
    }
  };
}
