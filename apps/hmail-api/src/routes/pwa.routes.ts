import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "../services/pwa-push.service.js";

export const pwaRouter = Router();

pwaRouter.use(requireAuth);

function ctx(req: Parameters<typeof requireAuth>[0]) {
  return { userId: req.auth!.user.id };
}

pwaRouter.get("/vapid-public-key", (_req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    res.status(503).json({ error: "Push notifications are not configured" });
    return;
  }
  res.json({ publicKey });
});

pwaRouter.post("/push-subscriptions", async (req, res, next) => {
  try {
    const { userId } = ctx(req);
    const endpoint = String(req.body?.endpoint ?? "");
    const keys = req.body?.keys as { p256dh?: string; auth?: string } | undefined;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid push subscription payload" });
      return;
    }
    await savePushSubscription(userId, {
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

pwaRouter.delete("/push-subscriptions", async (req, res, next) => {
  try {
    const { userId } = ctx(req);
    const endpoint = String(req.body?.endpoint ?? "");
    if (!endpoint) {
      res.status(400).json({ error: "endpoint is required" });
      return;
    }
    await removePushSubscription(userId, endpoint);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

pwaRouter.post("/mail-sync/trigger", async (req, res, next) => {
  try {
    const { syncMailForPwaUsers } = await import("../services/pwa-mail-sync.service.js");
    const notified = await syncMailForPwaUsers();
    res.json({ notified });
  } catch (err) {
    next(err);
  }
});
