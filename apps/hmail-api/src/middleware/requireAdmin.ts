import type { NextFunction, Request, Response } from "express";
import { getAdminContext } from "../services/admin-auth.service.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const admin = await getAdminContext(req);
    if (!admin) {
      res.status(401).json({ error: "Admin authentication required" });
      return;
    }
    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}
