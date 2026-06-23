import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import {
  CvScannerAccessError,
  CvScannerValidationError,
  JobHunterLlmUnavailableError,
  listScannerRegions,
  rateCvDocument,
} from "../services/job-hunter-scanner.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../services/job-hunter-settings.service.js";
import { registerJobHunterApplicationRoutes } from "./job-hunter-applications.routes.js";
import { registerJobHunterCvRoutes } from "./job-hunter-cv.routes.js";
import { registerJobHunterDocumentRoutes } from "./job-hunter-documents.routes.js";
import { registerJobHunterPhase6Routes } from "./job-hunter-phase-6.routes.js";
import { registerJobHunterApplyAssistRoutes } from "./job-hunter-apply-assist.routes.js";

export const jobHunterRouter = Router();

jobHunterRouter.use(requireAuth);

registerJobHunterApplicationRoutes(jobHunterRouter);
registerJobHunterCvRoutes(jobHunterRouter);
registerJobHunterDocumentRoutes(jobHunterRouter);
registerJobHunterPhase6Routes(jobHunterRouter);
registerJobHunterApplyAssistRoutes(jobHunterRouter);

const rateCvSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  dataBase64: z.string().min(1),
  region: z.string().min(1).max(8),
  targetRole: z.string().max(200).optional().nullable(),
  fromToastOptIn: z.boolean().optional(),
});

jobHunterRouter.get("/scanner/regions", (_req, res) => {
  res.json({ regions: listScannerRegions() });
});

jobHunterRouter.post("/scanner/rate", requireAddon(JOB_HUNTER_ADDON_SLUG), requireJobHunterWriteAccess(), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = rateCvSchema.parse(req.body);
    const rating = await rateCvDocument({
      tenantId: auth.user.tenant.id,
      userId: auth.user.id,
      fileName: body.fileName,
      mimeType: body.mimeType,
      dataBase64: body.dataBase64,
      region: body.region,
      targetRole: body.targetRole,
      fromToastOptIn: body.fromToastOptIn,
    });
    res.json({ rating });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.flatten() });
      return;
    }
    if (err instanceof CvScannerValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof CvScannerAccessError) {
      res.status(403).json({ error: err.message, reason: err.reason });
      return;
    }
    if (err instanceof JobHunterLlmUnavailableError) {
      res.status(503).json({ error: err.message });
      return;
    }
    next(err);
  }
});
