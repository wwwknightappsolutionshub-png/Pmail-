import type { NextFunction, Request, Response } from "express";
import { getAuthContext, getSessionTokenFromRequest } from "../services/auth.service.js";
import { touchSessionPresence } from "../services/user-presence.service.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const context = await getAuthContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.auth = context;

  const token = getSessionTokenFromRequest(req);
  if (token) {
    void touchSessionPresence(token).catch(() => {
      // Presence updates must not block authenticated requests.
    });
  }

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
