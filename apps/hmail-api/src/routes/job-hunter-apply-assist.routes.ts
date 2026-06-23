import { Router } from "express";
import { z } from "zod";
import { isPaymentMockMode } from "../config/env.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireCareerUnlocked } from "../middleware/requireCareerUnlocked.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import { resolveRequestMailCredentials } from "../services/mail-account.service.js";
import {
  ApplyAssistDailyCapError,
  ApplyAssistInsufficientCreditsError,
  ApplyAssistValidationError,
  confirmApplyAssistQueueItem,
  createApplyAssistCreditCheckout,
  createApplyAssistQueueItem,
  getApplyAssistWalletState,
  JOB_APPLY_ASSIST_ADDON_SLUG,
  JobHunterLlmUnavailableError,
  listApplyAssistQueue,
  listApplyAssistSetup,
  prefillApplyAssistQueueItem,
} from "../services/job-hunter-apply-assist.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../services/job-hunter-settings.service.js";

const queueSchema = z.object({
  channel: z.enum(["email_apply", "linkedin_assist", "indeed_assist"]),
  targetRole: z.string().min(1).max(200),
  region: z.string().min(1).max(8),
  jobUrl: z.string().url().max(2048).optional().nullable(),
  careersEmail: z.string().email().max(320).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  userDocumentId: z.string().uuid().optional().nullable(),
});

const purchaseSchema = z.object({
  provider: z.enum(["stripe", "paystack", "mock"]).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const confirmSchema = z.object({
  userSubmitted: z.boolean().optional(),
  subjectOverride: z.string().max(500).optional(),
  bodyTextOverride: z.string().max(20000).optional(),
  bodyHtmlOverride: z.string().max(50000).optional(),
});

export function registerJobHunterApplyAssistRoutes(router: Router) {
  router.get(
    "/apply-assist/setup",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const setup = await listApplyAssistSetup(req.auth!.user.id);
        res.json({ setup });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/apply-assist/wallet",
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    async (req, res, next) => {
      try {
        const auth = req.auth!;
        const wallet = await getApplyAssistWalletState(auth.user.tenant.id, auth.user.id);
        res.json({ wallet });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/apply-assist/purchase",
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    async (req, res, next) => {
      try {
        const body = purchaseSchema.parse(req.body ?? {});
        const auth = req.auth!;
        const provider = body.provider ?? (isPaymentMockMode() ? "mock" : undefined);
        if (!provider) {
          res.status(400).json({ error: "Payment provider is required. Configure STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY." });
          return;
        }

        const result = await createApplyAssistCreditCheckout({
          provider,
          tenantId: auth.user.tenant.id,
          tenantSlug: auth.user.tenant.slug,
          userId: auth.user.id,
          customerEmail: auth.user.email,
          successUrl: body.successUrl,
          cancelUrl: body.cancelUrl,
        });
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof ApplyAssistValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.get(
    "/apply-assist/queue",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const items = await listApplyAssistQueue(req.auth!.user.id);
        res.json({ items });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/apply-assist/queue",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = queueSchema.parse(req.body);
        const auth = req.auth!;
        const item = await createApplyAssistQueueItem({
          tenantId: auth.user.tenant.id,
          userId: auth.user.id,
          channel: body.channel,
          targetRole: body.targetRole,
          region: body.region,
          jobUrl: body.jobUrl,
          careersEmail: body.careersEmail,
          company: body.company,
          userDocumentId: body.userDocumentId,
        });
        res.status(201).json({ item });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof ApplyAssistValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/apply-assist/queue/:id/prefill",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const item = await prefillApplyAssistQueueItem(req.auth!.user.id, String(req.params.id));
        if (!item) {
          res.status(404).json({ error: "Queue item not found" });
          return;
        }
        res.json({ item });
      } catch (err) {
        if (err instanceof ApplyAssistValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err instanceof JobHunterLlmUnavailableError) {
          res.status(503).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/apply-assist/queue/:id/confirm",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireAddon(JOB_APPLY_ASSIST_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = confirmSchema.parse(req.body ?? {});
        const auth = req.auth!;
        const apiPublicBase = `${req.protocol}://${req.get("host")}`;
        const credentials = await resolveRequestMailCredentials(req);
        const result = await confirmApplyAssistQueueItem({
          tenantId: auth.user.tenant.id,
          userId: auth.user.id,
          queueId: String(req.params.id),
          apiPublicBase,
          credentials,
          userSubmitted: body.userSubmitted,
          subjectOverride: body.subjectOverride,
          bodyTextOverride: body.bodyTextOverride,
          bodyHtmlOverride: body.bodyHtmlOverride,
        });
        if (!result) {
          res.status(404).json({ error: "Queue item not found" });
          return;
        }
        res.json(result);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof ApplyAssistValidationError) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err instanceof ApplyAssistDailyCapError) {
          res.status(429).json({ error: err.message, reason: "apply_assist_daily_cap" });
          return;
        }
        if (err instanceof ApplyAssistInsufficientCreditsError) {
          res.status(402).json({ error: err.message, reason: "apply_assist_insufficient_credits" });
          return;
        }
        next(err);
      }
    },
  );
}
