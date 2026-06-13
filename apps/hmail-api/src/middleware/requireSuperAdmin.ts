import type { NextFunction, Request, Response } from "express";

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.admin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  if (req.admin.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}
