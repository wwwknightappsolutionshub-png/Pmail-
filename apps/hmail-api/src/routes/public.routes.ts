import { Router } from "express";
import { listPublishedAddonMarketing } from "../services/addon-marketing.service.js";
import { listPublishedSections } from "../services/cms.service.js";
import { listPublicHostingPlans } from "../services/hosting-plans.service.js";
import { getPublicPanelPreview } from "../services/public-panel.service.js";

export const publicRouter = Router();

publicRouter.get("/site", async (_req, res, next) => {
  try {
    const [sections, hostingPlans, addonMarketing, panelPreview] = await Promise.all([
      listPublishedSections(),
      listPublicHostingPlans(),
      listPublishedAddonMarketing(),
      getPublicPanelPreview(),
    ]);
    res.json({ sections, hostingPlans, addonMarketing, panelPreview });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/panel-preview", async (_req, res, next) => {
  try {
    const panelPreview = await getPublicPanelPreview();
    res.json({ panelPreview });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/sections", async (_req, res, next) => {
  try {
    const sections = await listPublishedSections();
    res.json({ sections });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/hosting-plans", async (_req, res, next) => {
  try {
    const hostingPlans = await listPublicHostingPlans();
    res.json({ hostingPlans });
  } catch (err) {
    next(err);
  }
});

publicRouter.get("/addon-marketing", async (_req, res, next) => {
  try {
    const addonMarketing = await listPublishedAddonMarketing();
    res.json({ addonMarketing });
  } catch (err) {
    next(err);
  }
});
