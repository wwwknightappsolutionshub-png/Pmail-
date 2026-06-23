import { Router } from "express";
import { z } from "zod";
import { isCareerNavUnlocked } from "../lib/job-hunter.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import { publishJobHunterDocument } from "../services/job-hunter-documents.service.js";
import {
  getOrCreateJobHunterSettings,
  JOB_HUNTER_ADDON_SLUG,
} from "../services/job-hunter-settings.service.js";

const publishSchema = z.object({
  cvDocumentId: z.string().uuid().optional(),
  fileName: z.string().min(1).max(255).optional(),
  mimeType: z.string().min(1).max(120).optional(),
  dataBase64: z.string().min(1).optional(),
  source: z.enum(["job_hunter_cv", "job_hunter_scanner"]).optional(),
  isPinned: z.boolean().optional(),
});

export function registerJobHunterDocumentRoutes(router: Router) {
  router.post("/documents/publish", requireAddon(JOB_HUNTER_ADDON_SLUG), requireJobHunterWriteAccess(), async (req, res, next) => {
    try {
      const body = publishSchema.parse(req.body);
      const auth = req.auth!;

      if (body.cvDocumentId) {
        const settings = await getOrCreateJobHunterSettings(auth.user.tenant.id, auth.user.id);
        const unlocked = isCareerNavUnlocked({
          careerScore: settings.careerScore,
          manualJobHuntingOverride: settings.manualJobHuntingOverride,
        });
        if (!unlocked) {
          res.status(403).json({
            error:
              "Career workspace is locked until your career score reaches the threshold or you enable “I'm job hunting.”",
            reason: "career_nav_locked",
          });
          return;
        }
      }

      const document = await publishJobHunterDocument({
        userId: auth.user.id,
        tenantId: auth.user.tenant.id,
        cvDocumentId: body.cvDocumentId,
        fileName: body.fileName,
        mimeType: body.mimeType,
        dataBase64: body.dataBase64,
        source: body.source ?? (body.cvDocumentId ? "job_hunter_cv" : "job_hunter_scanner"),
        isPinned: body.isPinned,
      });
      res.status(201).json({ document });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.flatten() });
        return;
      }
      if (err instanceof Error) {
        if (err.message === "CV document not found") {
          res.status(404).json({ error: err.message });
          return;
        }
        if (
          err.message.includes("required when cvDocumentId") ||
          err.message.includes("Unsupported file type") ||
          err.message.includes("Empty file")
        ) {
          res.status(400).json({ error: err.message });
          return;
        }
      }
      next(err);
    }
  });
}
