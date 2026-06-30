import { Router } from "express";
import { z } from "zod";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import {
  createPlatformArticle,
  deletePlatformArticle,
  getPlatformArticleById,
  listAllPlatformArticles,
  updatePlatformArticle,
} from "../services/platform-marketing-article.service.js";
import {
  completePlatformSeoTask,
  deletePlatformSeoKeyword,
  getPlatformSeoOverview,
  listPlatformSeoKeywords,
  runPlatformSeoScan,
  syncPlatformSeoFromGsc,
  updatePlatformSeoSettings,
  upsertPlatformSeoKeyword,
} from "../services/platform-seo.service.js";

export const adminSeoRouter = Router();

adminSeoRouter.use(requireSuperAdmin);

const settingsSchema = z.object({
  siteUrl: z.string().url().optional(),
  gscPropertyUrl: z.string().nullable().optional(),
  gscRefreshToken: z.string().nullable().optional(),
  ga4MeasurementId: z.string().nullable().optional(),
  bingSiteVerification: z.string().nullable().optional(),
  defaultLocale: z.string().optional(),
  alternateLocales: z.array(z.string()).optional(),
});

const articleSchema = z.object({
  slug: z.string().optional(),
  title: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  bodyHtml: z.string().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImageUrl: z.string().nullable().optional(),
  locale: z.string().optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const keywordSchema = z.object({
  keyword: z.string().min(1),
  targetPath: z.string().nullable().optional(),
});

adminSeoRouter.get("/overview", async (_req, res, next) => {
  try {
    res.json({ overview: await getPlatformSeoOverview() });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.get("/settings", async (_req, res, next) => {
  try {
    const overview = await getPlatformSeoOverview();
    res.json({ settings: overview.settings });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.patch("/settings", async (req, res, next) => {
  try {
    const body = settingsSchema.parse(req.body);
    const settings = await updatePlatformSeoSettings(body);
    await auditAdminMutation(req, "platform_seo.settings_updated", "platform_seo_settings", "default");
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.post("/scan", async (req, res, next) => {
  try {
    const period = req.body?.period === "monthly" ? "monthly" : "weekly";
    const result = await runPlatformSeoScan(period);
    await auditAdminMutation(req, "platform_seo.scan", "platform_seo_snapshot", result.snapshot.id, {
      period,
      healthScore: result.snapshot.healthScore,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.post("/sync/gsc", async (req, res, next) => {
  try {
    const result = await syncPlatformSeoFromGsc();
    await auditAdminMutation(req, "platform_seo.gsc_sync", "platform_seo_settings", "default", {
      connected: result.connected,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.get("/tasks", async (_req, res, next) => {
  try {
    const overview = await getPlatformSeoOverview();
    res.json({ tasks: overview.tasks });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.patch("/tasks/:id", async (req, res, next) => {
  try {
    const status = req.body?.status === "skipped" ? "skipped" : "done";
    const task = await completePlatformSeoTask(String(req.params.id), status);
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.get("/keywords", async (_req, res, next) => {
  try {
    res.json({ keywords: await listPlatformSeoKeywords() });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.post("/keywords", async (req, res, next) => {
  try {
    const body = keywordSchema.parse(req.body);
    const keyword = await upsertPlatformSeoKeyword(body);
    res.json({ keyword });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.delete("/keywords/:id", async (req, res, next) => {
  try {
    await deletePlatformSeoKeyword(String(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.get("/articles", async (_req, res, next) => {
  try {
    res.json({ articles: await listAllPlatformArticles() });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.post("/articles", async (req, res, next) => {
  try {
    const body = articleSchema.parse(req.body);
    const article = await createPlatformArticle(body);
    await auditAdminMutation(req, "platform_seo.article_created", "platform_marketing_article", article.id);
    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.patch("/articles/:id", async (req, res, next) => {
  try {
    const body = articleSchema.partial().extend({ title: z.string().min(1).optional() }).parse(req.body);
    const article = await updatePlatformArticle(String(req.params.id), body);
    await auditAdminMutation(req, "platform_seo.article_updated", "platform_marketing_article", article.id);
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.get("/articles/:id", async (req, res, next) => {
  try {
    const article = await getPlatformArticleById(String(req.params.id));
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    res.json({ article });
  } catch (err) {
    next(err);
  }
});

adminSeoRouter.delete("/articles/:id", async (req, res, next) => {
  try {
    await deletePlatformArticle(String(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
