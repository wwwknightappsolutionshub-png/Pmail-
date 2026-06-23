import { Router } from "express";
import { z } from "zod";
import { JOB_APPLICATION_STATUSES, isJobApplicationStatus } from "../lib/job-hunter-career-mail.js";
import { requireCareerUnlocked } from "../middleware/requireCareerUnlocked.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import {
  createManualJobApplication,
  getJobApplication,
  listJobApplications,
  syncJobApplicationsForUser,
  updateJobApplication,
} from "../services/job-hunter-applications.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../services/job-hunter-settings.service.js";

const createApplicationSchema = z.object({
  company: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  appliedAt: z.string().datetime().optional(),
  status: z.enum(JOB_APPLICATION_STATUSES).optional(),
});

const updateApplicationSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  roleTitle: z.string().min(1).max(200).optional(),
  appliedAt: z.string().datetime().optional(),
  status: z.enum(JOB_APPLICATION_STATUSES).optional(),
});

export function registerJobHunterApplicationRoutes(router: Router) {
  router.get(
    "/applications",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        if (status && !isJobApplicationStatus(status)) {
          res.status(400).json({ error: "Invalid status filter" });
          return;
        }
        const applications = await listJobApplications(req.auth!.user.id, { status });
        res.json({ applications });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/applications/sync",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const auth = req.auth!;
        const result = await syncJobApplicationsForUser(auth.user.tenant.id, auth.user.id);
        res.json({ result });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/applications",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = createApplicationSchema.parse(req.body);
        const application = await createManualJobApplication(req.auth!.user.id, body);
        res.status(201).json({ application });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        next(err);
      }
    },
  );

  router.get(
    "/applications/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const application = await getJobApplication(req.auth!.user.id, String(req.params.id));
        if (!application) {
          res.status(404).json({ error: "Application not found" });
          return;
        }
        res.json({ application });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    "/applications/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = updateApplicationSchema.parse(req.body);
        const application = await updateJobApplication(req.auth!.user.id, String(req.params.id), body);
        if (!application) {
          res.status(404).json({ error: "Application not found" });
          return;
        }
        res.json({ application });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        next(err);
      }
    },
  );
}
