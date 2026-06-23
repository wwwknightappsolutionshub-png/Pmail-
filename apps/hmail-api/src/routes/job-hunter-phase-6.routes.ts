import { Router } from "express";
import { z } from "zod";
import { requireCareerUnlocked } from "../middleware/requireCareerUnlocked.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import {
  generateInterviewPrep,
  InterviewPrepValidationError,
  JobHunterLlmUnavailableError,
} from "../services/job-hunter-interview-prep.service.js";
import {
  createJobSiteLink,
  deleteJobSiteLink,
  listJobSiteLinks,
  updateJobSiteLink,
} from "../services/job-hunter-job-sites.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../services/job-hunter-settings.service.js";

const createJobSiteSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().min(8).max(2048),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const updateJobSiteSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  url: z.string().min(8).max(2048).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

const interviewPrepSchema = z.object({
  jobDescription: z.string().max(20000).optional(),
  applicationId: z.string().uuid().optional(),
  targetRole: z.string().max(200).optional(),
  region: z.string().min(1).max(8).optional(),
});

export function registerJobHunterPhase6Routes(router: Router) {
  router.get(
    "/job-sites",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const links = await listJobSiteLinks(req.auth!.user.id);
        res.json({ links });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/job-sites",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = createJobSiteSchema.parse(req.body);
        const link = await createJobSiteLink(req.auth!.user.id, body);
        res.status(201).json({ link });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof Error && (err.message.includes("URL") || err.message.includes("Label"))) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.patch(
    "/job-sites/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = updateJobSiteSchema.parse(req.body);
        const link = await updateJobSiteLink(req.auth!.user.id, String(req.params.id), body);
        if (!link) {
          res.status(404).json({ error: "Job site link not found" });
          return;
        }
        res.json({ link });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof Error && err.message.includes("URL")) {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.delete(
    "/job-sites/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const deleted = await deleteJobSiteLink(req.auth!.user.id, String(req.params.id));
        if (!deleted) {
          res.status(404).json({ error: "Job site link not found" });
          return;
        }
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/interview-prep",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = interviewPrepSchema.parse(req.body);
        const prep = await generateInterviewPrep({
          userId: req.auth!.user.id,
          jobDescription: body.jobDescription,
          applicationId: body.applicationId,
          targetRole: body.targetRole,
          region: body.region,
        });
        res.json({ prep });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof InterviewPrepValidationError) {
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
}
