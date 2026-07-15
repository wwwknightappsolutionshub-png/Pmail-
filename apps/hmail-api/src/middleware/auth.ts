import type { NextFunction, Request, Response } from "express";
import { getEnv } from "../config/env.js";
import { MAIL_SESSION_TTL_MS } from "../lib/mail-session-ttl.js";
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

    // Sliding refresh for browser sessions only (skip Bearer-only API clients and supertest).
    if (req.cookies?.hmail_session) {
      const env = getEnv();
      res.cookie("hmail_session", token, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        maxAge: MAIL_SESSION_TTL_MS,
      });
    }
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
