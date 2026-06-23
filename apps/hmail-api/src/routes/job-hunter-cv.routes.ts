import { Router } from "express";
import { z } from "zod";
import { listCvTemplateHub } from "../data/job-hunter-cv-templates.js";
import { requireCareerUnlocked } from "../middleware/requireCareerUnlocked.js";
import { requireAddon } from "../middleware/requireAddon.js";
import { requireJobHunterWriteAccess } from "../middleware/requireJobHunterWriteAccess.js";
import {
  createCvDocument,
  exportCvDocumentPdf,
  getCvDocument,
  listCvDocuments,
  updateCvDocument,
} from "../services/job-hunter-cv.service.js";
import { JOB_HUNTER_ADDON_SLUG } from "../services/job-hunter-settings.service.js";

const cvExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  bullets: z.array(z.string()),
});

const cvContentSchema = z.object({
  fullName: z.string(),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    linkedIn: z.string().optional(),
  }),
  summary: z.string(),
  experience: z.array(cvExperienceSchema),
  education: z.array(
    z.object({
      degree: z.string(),
      school: z.string(),
      year: z.string(),
      details: z.string().optional(),
    }),
  ),
  skills: z.array(z.string()),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      year: z.string(),
    }),
  ),
});

const createCvSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  region: z.string().min(1).max(8).optional(),
  role: z.string().max(120).optional(),
  industry: z.string().max(120).optional(),
  templateId: z.string().max(120).optional(),
  content: cvContentSchema.optional(),
});

const updateCvSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  region: z.string().min(1).max(8).optional(),
  role: z.string().max(120).optional(),
  industry: z.string().max(120).optional(),
  content: cvContentSchema.optional(),
});

export function registerJobHunterCvRoutes(router: Router) {
  router.get(
    "/cv/templates",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    (req, res) => {
      const region = typeof req.query.region === "string" ? req.query.region : undefined;
      const role = typeof req.query.role === "string" ? req.query.role : undefined;
      const industry = typeof req.query.industry === "string" ? req.query.industry : undefined;
      const experienceLevel = typeof req.query.experienceLevel === "string" ? req.query.experienceLevel : undefined;
      const sortBy =
        req.query.sortBy === "country" || req.query.sortBy === "experience" || req.query.sortBy === "profession"
          ? req.query.sortBy
          : undefined;
      res.json(listCvTemplateHub({ region, role, industry, experienceLevel, sortBy }));
    },
  );

  router.get(
    "/cv/documents",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const documents = await listCvDocuments(req.auth!.user.id);
        res.json({ documents });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/cv/documents",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = createCvSchema.parse(req.body);
        const document = await createCvDocument(req.auth!.user.id, body);
        res.status(201).json({ document });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        if (err instanceof Error && err.message === "Template not found") {
          res.status(400).json({ error: err.message });
          return;
        }
        next(err);
      }
    },
  );

  router.get(
    "/cv/documents/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    async (req, res, next) => {
      try {
        const document = await getCvDocument(req.auth!.user.id, String(req.params.id));
        if (!document) {
          res.status(404).json({ error: "CV document not found" });
          return;
        }
        res.json({ document });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    "/cv/documents/:id",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const body = updateCvSchema.parse(req.body);
        const document = await updateCvDocument(req.auth!.user.id, String(req.params.id), body);
        if (!document) {
          res.status(404).json({ error: "CV document not found" });
          return;
        }
        res.json({ document });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.flatten() });
          return;
        }
        next(err);
      }
    },
  );

  router.post(
    "/cv/documents/:id/export-pdf",
    requireAddon(JOB_HUNTER_ADDON_SLUG),
    requireCareerUnlocked(),
    requireJobHunterWriteAccess(),
    async (req, res, next) => {
      try {
        const auth = req.auth!;
        const exported = await exportCvDocumentPdf(auth.user.id, auth.user.tenant.id, String(req.params.id));
        if (!exported) {
          res.status(404).json({ error: "CV document not found" });
          return;
        }
        res.setHeader("Content-Type", exported.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
        res.send(exported.buffer);
      } catch (err) {
        next(err);
      }
    },
  );
}
