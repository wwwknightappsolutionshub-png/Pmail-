import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getPublicApiBaseUrl } from "../lib/public-url.js";
import { resolveAuthMailConfig } from "../services/auth.service.js";
import { buildReferralCompose } from "../services/referral.service.js";
import {
  REFERRAL_REWARD_TOAST,
  attributeReferralSignup,
  runAutomaticReferralInvite,
  sendReferralInvitations,
} from "../services/referral-lead.service.js";

export const referralRouter = Router();

referralRouter.use(requireAuth);

function resolveMailCredentials(req: Request) {
  const auth = req.auth!;
  const mailConfig = resolveAuthMailConfig(auth.user);
  if (!mailConfig) {
    throw new Error("Mail provider configuration missing");
  }
  return {
    email: auth.user.email,
    password: auth.mailPassword,
    mailConfig,
  };
}

function resolveOptionalMailCredentials(req: Request) {
  const auth = req.auth!;
  const mailConfig = resolveAuthMailConfig(auth.user);
  if (!mailConfig) return null;
  return {
    email: auth.user.email,
    password: auth.mailPassword,
    mailConfig,
  };
}

const sendSchema = z.object({
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  bcc: z.string().min(3),
});

referralRouter.get("/compose", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const compose = await buildReferralCompose({
      userId: auth.user.id,
      email: auth.user.email,
      displayName: auth.user.displayName,
      credentials: resolveOptionalMailCredentials(req),
    });
    res.json({ compose });
  } catch (err) {
    next(err);
  }
});

referralRouter.post("/send", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = sendSchema.parse(req.body);
    if (!body.text?.trim() && !body.html?.trim()) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }

    const result = await sendReferralInvitations({
      userId: auth.user.id,
      tenantId: auth.user.tenant.id,
      email: auth.user.email,
      displayName: auth.user.displayName,
      credentials: resolveMailCredentials(req),
      subject: body.subject,
      text: body.text,
      html: body.html,
      bcc: body.bcc,
      apiPublicBase: getPublicApiBaseUrl(req),
    });

    res.json({
      ok: true,
      sentCount: result.sentCount,
      bouncedCount: result.bouncedCount,
      leads: result.leads,
      reward: result.reward,
      rewardToast:
        result.reward.granted
          ? REFERRAL_REWARD_TOAST
          : null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request" });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

referralRouter.post("/invite", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const result = await runAutomaticReferralInvite({
      userId: auth.user.id,
      tenantId: auth.user.tenant.id,
      email: auth.user.email,
      displayName: auth.user.displayName,
      credentials: resolveMailCredentials(req),
      apiPublicBase: getPublicApiBaseUrl(req),
    });

    res.json({
      ok: true,
      sentCount: result.sentCount,
      bouncedCount: result.bouncedCount,
      inboxCount: result.inboxCount,
      sentMailboxCount: result.sentMailboxCount,
      reward: result.reward,
      rewardToast: result.rewardToast,
      message: result.message,
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

const attributeSchema = z.object({
  referrerEmail: z.string().email().optional(),
});

referralRouter.post("/attribute", async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = attributeSchema.parse(req.body ?? {});
    const result = await attributeReferralSignup({
      userId: auth.user.id,
      userEmail: auth.user.email,
      tenantId: auth.user.tenant.id,
      referrerEmail: body.referrerEmail,
      displayName: auth.user.displayName,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request" });
      return;
    }
    next(err);
  }
});