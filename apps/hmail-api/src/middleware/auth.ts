import type { NextFunction, Request, Response } from "express";
import { getAuthContext } from "../services/auth.service.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const context = await getAuthContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.auth = context;
  next();
}

declare global {
  namespace Express {
    interface Request {
      auth?: Awaited<ReturnType<typeof getAuthContext>>;
    }
  }
}

export {};
