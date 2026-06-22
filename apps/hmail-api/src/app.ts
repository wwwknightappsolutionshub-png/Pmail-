import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { getEnv } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { mailRouter } from "./routes/mail.routes.js";
import { addonRouter } from "./routes/addon.routes.js";
import { featuresRouter } from "./routes/features.routes.js";
import { growthRouter } from "./routes/growth.routes.js";
import { publicRouter } from "./routes/public.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { panelRouter } from "./routes/panel.routes.js";
import { paymentRouter, paystackWebhookHandler, stripeWebhookHandler } from "./routes/payment.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { platformRouter } from "./routes/platform.routes.js";
import { referralRouter } from "./routes/referral.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { getLiveness, getReadiness } from "./services/health.service.js";

function parseCorsOrigins(origin: string): string | string[] {
  const list = origin
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length <= 1 ? (list[0] ?? "http://localhost:5173") : list;
}

export function createApp() {
  const env = getEnv();
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: parseCorsOrigins(env.CORS_ORIGIN),
      credentials: true,
    }),
  );

  app.post(
    "/api/payments/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler,
  );
  app.post(
    "/api/payments/webhooks/paystack",
    express.raw({ type: "application/json" }),
    paystackWebhookHandler,
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(requestLogger);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again later." },
  });

  const publicWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Try again later." },
  });

  const trackingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/health", async (_req, res) => {
    res.json(await getLiveness());
  });

  app.get("/health/ready", async (_req, res) => {
    const readiness = await getReadiness();
    res.status(readiness.status === "ready" ? 200 : 503).json(readiness);
  });

  app.use("/api/auth/login", loginLimiter);
  app.use("/api/admin/auth/login", loginLimiter);
  app.use("/api/panel/auth/login", loginLimiter);
  app.use("/api/public/leads", publicWriteLimiter);
  app.use("/api/public/growth", publicWriteLimiter);
  app.use("/api/public/onboarding", publicWriteLimiter);
  app.use("/api/public/bespoke-demo", publicWriteLimiter);
  app.use("/api/public/track", trackingLimiter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/panel", panelRouter);
  app.use("/api/growth", growthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/mail", mailRouter);
  app.use("/api/referrals", referralRouter);
  app.use("/api/contacts", contactRouter);
  app.use("/api/addons", addonRouter);
  app.use("/api/platform", platformRouter);
  app.use("/api/features", featuresRouter);

  app.use(errorHandler);

  return app;
}
