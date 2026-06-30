import { Router } from "express";
import { z } from "zod";
import { auditAdminMutation } from "../lib/admin-audit-helper.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  previewEmailTemplate,
  sendTestEmailTemplate,
  updateEmailTemplate,
} from "../services/email-template.service.js";
import {
  deleteMarketingSession,
  getMarketingConfig,
  getMarketingPlaybooks,
  getMarketingSession,
  listMarketingSessions,
  runMarketingAssistant,
  updateMarketingConfig,
} from "../services/marketing-ai.service.js";
import { getSalesPipelineOverview } from "../services/sales-pipeline.service.js";
import { saveMarketingAsset } from "../services/marketing-asset.service.js";
import {
  listAddonEducationCampaignSteps,
  reorderAddonEducationCampaignSteps,
  setTenantAddonEducationSuppressed,
  setUserAddonEducationSuppressed,
  updateAddonEducationCampaignStep,
} from "../services/addon-education-drip.service.js";

const templateSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subject: z.string().min(1),
  htmlBody: z.string().min(1),
  textBody: z.string().nullable().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const marketingConfigSchema = z.object({
  aiProvider: z.enum(["openai", "anthropic", "google", "custom"]).optional(),
  aiModel: z.string().nullable().optional(),
  aiApiKey: z.string().nullable().optional(),
  aiBaseUrl: z.string().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const adminMarketingRouter = Router();

adminMarketingRouter.post("/upload-asset", async (req, res, next) => {
  try {
    const body = z
      .object({
        fileName: z.string().min(1).max(200),
        mimeType: z.string().min(1),
        dataBase64: z.string().min(1),
      })
      .parse(req.body);
    const asset = await saveMarketingAsset(body);
    await auditAdminMutation(req, "marketing.asset.upload", "marketing_asset", asset.fileName);
    res.status(201).json({ asset });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.get("/email-templates", async (_req, res, next) => {
  try {
    const templates = await listEmailTemplates();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.get("/email-templates/:id", async (req, res, next) => {
  try {
    const template = await getEmailTemplate(paramId(req.params.id));
    if (!template) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.post("/email-templates", async (req, res, next) => {
  try {
    const body = templateSchema.parse(req.body);
    const template = await createEmailTemplate(body);
    await auditAdminMutation(req, "email_template.create", "email_template", template.id);
    res.status(201).json({ template });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.patch("/email-templates/:id", async (req, res, next) => {
  try {
    const body = templateSchema.partial().parse(req.body);
    const template = await updateEmailTemplate(paramId(req.params.id), body);
    await auditAdminMutation(req, "email_template.update", "email_template", paramId(req.params.id));
    res.json({ template });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.delete("/email-templates/:id", async (req, res, next) => {
  try {
    await deleteEmailTemplate(paramId(req.params.id));
    await auditAdminMutation(req, "email_template.delete", "email_template", paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.post("/email-templates/:id/preview", async (req, res, next) => {
  try {
    const variables = (req.body?.variables ?? {}) as Record<string, string>;
    const preview = await previewEmailTemplate(paramId(req.params.id), variables);
    res.json({ preview });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.post("/email-templates/:id/send-test", async (req, res, next) => {
  try {
    const to = String(req.body?.to ?? "");
    if (!to.includes("@")) {
      res.status(400).json({ error: "Valid test recipient required" });
      return;
    }
    const variables = (req.body?.variables ?? {}) as Record<string, string>;
    await sendTestEmailTemplate(paramId(req.params.id), to, variables);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.get("/config", async (_req, res, next) => {
  try {
    const config = await getMarketingConfig();
    res.json({ config });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.patch("/config", async (req, res, next) => {
  try {
    const body = marketingConfigSchema.parse(req.body);
    const config = await updateMarketingConfig(body);
    await auditAdminMutation(req, "marketing.config.update", "marketing_config", "default");
    res.json({ config });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.get("/playbooks", async (_req, res, next) => {
  try {
    const playbooks = await getMarketingPlaybooks();
    res.json({ playbooks });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [overview, playbooks] = await Promise.all([getSalesPipelineOverview(), getMarketingPlaybooks()]);
    res.json({ overview, playbooks });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.get("/sessions", async (req, res, next) => {
  try {
    const sessions = await listMarketingSessions(req.admin!.id);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.get("/sessions/:id", async (req, res, next) => {
  try {
    const session = await getMarketingSession(paramId(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.post("/assistant", async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt ?? "").trim();
    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }
    const result = await runMarketingAssistant({
      adminId: req.admin!.id,
      sessionId: req.body?.sessionId ? String(req.body.sessionId) : undefined,
      prompt,
      context: req.body?.context as Record<string, unknown> | undefined,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.delete("/sessions/:id", async (req, res, next) => {
  try {
    await deleteMarketingSession(paramId(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const campaignStepPatchSchema = z.object({
  templateSlug: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  intervalHours: z.number().int().min(1).optional(),
  resendIntervalHours: z.number().int().min(1).optional(),
  maxResends: z.number().int().min(0).optional(),
});

adminMarketingRouter.get("/addon-education/steps", async (req, res, next) => {
  try {
    const campaignType = typeof req.query.campaignType === "string" ? req.query.campaignType : undefined;
    const steps = await listAddonEducationCampaignSteps(campaignType);
    res.json({ steps });
  } catch (err) {
    next(err);
  }
});

adminMarketingRouter.patch("/addon-education/steps/:id", async (req, res, next) => {
  try {
    const body = campaignStepPatchSchema.parse(req.body);
    const step = await updateAddonEducationCampaignStep(paramId(req.params.id), body);
    await auditAdminMutation(req, "addon_education.step.update", "addon_education_step", paramId(req.params.id));
    res.json({ step });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.post("/addon-education/steps/reorder", async (req, res, next) => {
  try {
    const body = z
      .object({
        campaignType: z.string().min(1),
        orderedIds: z.array(z.string().min(1)).min(1),
      })
      .parse(req.body);
    await reorderAddonEducationCampaignSteps(body.campaignType, body.orderedIds);
    await auditAdminMutation(req, "addon_education.steps.reorder", "addon_education_campaign", body.campaignType);
    const steps = await listAddonEducationCampaignSteps(body.campaignType);
    res.json({ steps });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.patch("/addon-education/tenants/:tenantId/suppress", requireSuperAdmin, async (req, res, next) => {
  try {
    const suppressed = Boolean(req.body?.suppressed);
    await setTenantAddonEducationSuppressed(paramId(req.params.tenantId), suppressed);
    await auditAdminMutation(
      req,
      suppressed ? "addon_education.tenant.suppress" : "addon_education.tenant.unsuppress",
      "tenant",
      paramId(req.params.tenantId),
    );
    res.json({ ok: true, suppressed });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

adminMarketingRouter.patch("/addon-education/users/:userId/suppress", requireSuperAdmin, async (req, res, next) => {
  try {
    const suppressed = Boolean(req.body?.suppressed);
    await setUserAddonEducationSuppressed(paramId(req.params.userId), suppressed);
    await auditAdminMutation(
      req,
      suppressed ? "addon_education.user.suppress" : "addon_education.user.unsuppress",
      "user",
      paramId(req.params.userId),
    );
    res.json({ ok: true, suppressed });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
