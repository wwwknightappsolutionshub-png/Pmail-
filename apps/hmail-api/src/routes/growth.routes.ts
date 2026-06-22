import { Router, type Request } from "express";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { requirePanel } from "../middleware/requirePanel.js";
import { GROWTH_AGENT_REGISTRY } from "../growth/agent-registry.js";
import {
  growthWizardStep1Schema,
  growthWizardStep2Schema,
  growthWizardStep3Schema,
  growthWizardStep4Schema,
  growthWizardStep5Schema,
  growthWizardStep6Schema,
  formatZodValidationMessage,
} from "../growth/wizard-schema.js";
import { saveGrowthAsset, resolveGrowthAssetFile } from "../services/growth-asset.service.js";
import {
  getGrowthAgentCatalog,
  listGrowthAgentRuns,
  listGrowthMemories,
} from "../services/growth-agent-runner.service.js";
import { listGrowthEvents } from "../services/growth-event-bus.service.js";
import {
  getGrowthContentAsset,
  getGrowthContentBundleSummary,
  listGrowthContentAssets,
} from "../services/growth-content-bundle.service.js";
import {
  publishGrowthAssetToPanel,
  publishGrowthBundleToPanel,
} from "../services/growth-panel-publish.service.js";
import { ensureGrowthCaptureFoundation } from "../services/growth-capture-foundation.service.js";
import { ensureGrowthChatbotFoundation } from "../services/growth-chatbot-foundation.service.js";
import { ensureGrowthAnalyticsFoundation } from "../services/growth-analytics-foundation.service.js";
import { getGrowthAnalyticsDashboard } from "../services/growth-analytics.service.js";
import { ensureGrowthAutomationsFoundation } from "../services/growth-automations-foundation.service.js";
import { ensureGrowthPackagingFoundation } from "../services/growth-packaging-foundation.service.js";
import { ensureGrowthOptimizationFoundation } from "../services/growth-optimization-foundation.service.js";
import { ensureGrowthChannelsFoundation } from "../services/growth-channels-foundation.service.js";
import {
  listGrowthChannelAssets,
  listGrowthChannelDeliveries,
  processDueGrowthChannelDeliveries,
  scheduleGrowthSocialPost,
  sendGrowthEmailBroadcast,
  sendGrowthSocialPostNow,
} from "../services/growth-channel.service.js";
import { isGrowthLlmConfigured } from "../services/growth-llm-agent.service.js";
import { getGrowthContentLlmStatus } from "../services/growth-content-llm.service.js";
import {
  connectGrowthChannelIntegration,
  disconnectGrowthChannelIntegration,
  GROWTH_CHANNEL_PROVIDERS,
  listGrowthChannelIntegrations,
} from "../services/growth-channel-integration.service.js";
import {
  getGrowthAdsSeoSummary,
  linkGrowthAdAccount,
  refreshGrowthAdPacing,
  refreshGrowthSeoRanks,
  syncGrowthAdCampaign,
  updateGrowthAdCampaignBudget,
} from "../services/growth-ads-seo.service.js";
import { getLatestWeeklyBrief, emailWeeklyBriefIfDue } from "../services/growth-optimization-llm.service.js";
import {
  assertGrowthAnalyticsAccess,
  GrowthPlanError,
  createGrowthPlanCheckout,
  getGrowthPlanSnapshot,
  listGrowthPlanOptions,
} from "../services/growth-plan.service.js";
import {
  GrowthSettingsError,
  assertGrowthOwner,
  getGrowthSettings,
  inviteGrowthTeamMember,
  listGrowthTeamMembers,
  removeGrowthTeamMember,
  resolveGrowthTeamRole,
  updateGrowthSettings,
} from "../services/growth-settings.service.js";
import {
  dismissGrowthOptimizationInsight,
  getGrowthOptimizationSummary,
  refreshGrowthOptimizationInsights,
} from "../services/growth-optimization.service.js";
import {
  createGrowthAutomation,
  listGrowthAutomationRuns,
  listGrowthAutomations,
  updateGrowthAutomation,
} from "../services/growth-automation.service.js";
import { listGrowthForms } from "../services/growth-form.service.js";
import {
  getGrowthChatSession,
  getGrowthChatSessionForLead,
  listGrowthChatSessions,
} from "../services/growth-chat-engine.service.js";
import { listGrowthChatbotConfigs } from "../services/growth-chatbot-config.service.js";
import {
  createGrowthLead,
  getGrowthLead,
  getGrowthLeadStats,
  listGrowthLeadActivities,
  listGrowthLeads,
  updateGrowthLead,
  updateGrowthLeadStage,
} from "../services/growth-leads.service.js";
import { getGrowthPipelineBoard, listGrowthPipelineStages } from "../services/growth-pipeline.service.js";
import { getGrowthJob, listGrowthJobs } from "../services/growth-job-queue.service.js";
import {
  ensureContentBundleQueued,
  enqueueContentBundleRegeneration,
  enqueueWizardAnalysisPipeline,
} from "../services/growth-orchestrator.service.js";
import { listGrowthPromptTemplates } from "../services/growth-prompt-registry.service.js";
import {
  getOrCreateGrowthWorkspace,
  markWizardCompleted,
} from "../services/growth-workspace.service.js";
import { getWizardStepMeta, saveGrowthWizardStep } from "../services/growth-wizard.service.js";

export const growthRouter = Router();

const stepSchemas = {
  1: growthWizardStep1Schema,
  2: growthWizardStep2Schema,
  3: growthWizardStep3Schema,
  4: growthWizardStep4Schema,
  5: growthWizardStep5Schema,
  6: growthWizardStep6Schema,
} as const;

growthRouter.get("/assets/:tenantId/:fileName", async (req, res, next) => {
  try {
    const filePath = resolveGrowthAssetFile(String(req.params.tenantId), String(req.params.fileName));
    if (!filePath) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    const data = await readFile(filePath);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(data);
  } catch (err) {
    next(err);
  }
});

growthRouter.use(requirePanel);

function tenantContext(req: Request) {
  const account = req.panelAccount!;
  return {
    tenantId: account.tenant.id,
    hostingAccountId: account.id,
    accountEmail: `${account.username}@${account.domain}`.toLowerCase(),
  };
}

function handleGrowthPlanError(err: unknown, res: import("express").Response, next: import("express").NextFunction) {
  if (err instanceof GrowthPlanError) {
    const status = err.code === "no_access" ? 402 : 403;
    res.status(status).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof GrowthSettingsError) {
    const status = err.code === "forbidden" ? 403 : err.code === "not_found" ? 404 : 400;
    res.status(status).json({ error: err.message, code: err.code });
    return;
  }
  next(err);
}

growthRouter.get("/workspace", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    res.json({ workspace });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/wizard/meta", async (_req, res) => {
  res.json(getWizardStepMeta());
});

growthRouter.put("/wizard/step/:step", async (req, res, next) => {
  try {
    const step = Number(req.params.step);
    const schema = stepSchemas[step as keyof typeof stepSchemas];
    if (!schema) {
      res.status(400).json({ error: "Invalid wizard step" });
      return;
    }
    const data = schema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await saveGrowthWizardStep({
      tenantId: ctx.tenantId,
      hostingAccountId: ctx.hostingAccountId,
      step,
      data,
    });
    res.json({ workspace });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err), details: err.flatten() });
      return;
    }
    next(err);
  }
});

growthRouter.post("/wizard/complete", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const existing = await getOrCreateGrowthWorkspace(ctx);
    const workspace = await markWizardCompleted(existing.id, ctx.tenantId);
    const job = await enqueueWizardAnalysisPipeline({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ workspace, job });
  } catch (err) {
    next(err);
  }
});

const uploadSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  dataBase64: z.string().min(1),
});

growthRouter.post("/assets/upload", async (req, res, next) => {
  try {
    const body = uploadSchema.parse(req.body);
    const ctx = tenantContext(req);
    const asset = await saveGrowthAsset({
      tenantId: ctx.tenantId,
      ...body,
    });
    res.status(201).json({ asset });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err), details: err.flatten() });
      return;
    }
    next(err);
  }
});

growthRouter.get("/agents", async (_req, res) => {
  res.json({ agents: await getGrowthAgentCatalog(), registry: GROWTH_AGENT_REGISTRY });
});

growthRouter.get("/prompts", async (_req, res, next) => {
  try {
    res.json({ prompts: await listGrowthPromptTemplates() });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/jobs", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const jobs = await listGrowthJobs(ctx.tenantId, workspace.id);
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/jobs/:id", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const job = await getGrowthJob(ctx.tenantId, String(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/agent-runs", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const runs = await listGrowthAgentRuns(ctx.tenantId, workspace.id);
    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/memories", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const memories = await listGrowthMemories(ctx.tenantId, workspace.id);
    res.json({ memories });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/events", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const events = await listGrowthEvents(ctx.tenantId, workspace.id);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/content/bundle", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureContentBundleQueued({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      workspaceStatus: workspace.status,
      wizardCompleted: workspace.wizard.completed,
    });
    const summary = await getGrowthContentBundleSummary(ctx.tenantId, workspace.id);
    const fresh = await getOrCreateGrowthWorkspace(ctx);
    res.json({ summary, workspaceStatus: fresh.status });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/content/assets", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const assetType = typeof req.query.type === "string" ? req.query.type : undefined;
    const assets = await listGrowthContentAssets(ctx.tenantId, workspace.id, assetType);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/content/assets/:id", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const asset = await getGrowthContentAsset(ctx.tenantId, workspace.id, String(req.params.id));
    if (!asset) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.json({ asset });
  } catch (err) {
    next(err);
  }
});

growthRouter.post("/content/regenerate", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const job = await enqueueContentBundleRegeneration({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      wizardCompleted: workspace.wizard.completed,
    });
    res.json({ job, message: "Content bundle regeneration queued" });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Complete the onboarding")) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.includes("already in progress")) {
      res.status(409).json({ error: err.message });
      return;
    }
    next(err);
  }
});

growthRouter.post("/content/publish", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const result = await publishGrowthBundleToPanel({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    res.json(result);
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/content/assets/:id/publish", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const result = await publishGrowthAssetToPanel({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
      assetId: String(req.params.id),
    });
    res.json({ published: result });
  } catch (err) {
    if (err instanceof Error && (err.message.includes("cannot be published") || err.message.includes("not found"))) {
      res.status(400).json({ error: err.message });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.get("/pipeline/stages", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const stages = await listGrowthPipelineStages(ctx.tenantId, workspace.id);
    res.json({ stages });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/pipeline/board", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    if (workspace.wizard.completed) {
      await ensureGrowthCaptureFoundation({
        tenantId: ctx.tenantId,
        workspaceId: workspace.id,
      });
      await ensureGrowthChatbotFoundation({
        tenantId: ctx.tenantId,
        workspaceId: workspace.id,
      });
      await ensureGrowthAnalyticsFoundation({
        tenantId: ctx.tenantId,
        workspaceId: workspace.id,
      });
      await ensureGrowthAutomationsFoundation({
        tenantId: ctx.tenantId,
        workspaceId: workspace.id,
      });
    }
    const board = await getGrowthPipelineBoard(ctx.tenantId, workspace.id);
    res.json(board);
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/leads/stats", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const stats = await getGrowthLeadStats(ctx.tenantId, workspace.id);
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/leads", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const stageSlug = typeof req.query.stage === "string" ? req.query.stage : undefined;
    const leads = await listGrowthLeads(ctx.tenantId, workspace.id, stageSlug);
    res.json({ leads });
  } catch (err) {
    next(err);
  }
});

const createLeadSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(80).optional(),
  company: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  stageSlug: z.string().min(1).max(80).optional(),
});

growthRouter.post("/leads", async (req, res, next) => {
  try {
    const body = createLeadSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const lead = await createGrowthLead({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      company: body.company,
      message: body.message,
      source: "manual",
      stageSlug: body.stageSlug,
    });
    res.status(201).json({ lead });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("Invalid pipeline stage")) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

growthRouter.get("/leads/:id", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const lead = await getGrowthLead(ctx.tenantId, workspace.id, String(req.params.id));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const activities = await listGrowthLeadActivities(ctx.tenantId, workspace.id, lead.id);
    const chatSession = await getGrowthChatSessionForLead(ctx.tenantId, workspace.id, lead.id);
    res.json({ lead, activities, chatSession });
  } catch (err) {
    next(err);
  }
});

const leadStageSchema = z.object({
  stageSlug: z.string().min(1).max(80),
});

const updateLeadSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(80).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  message: z.string().max(5000).nullable().optional(),
});

growthRouter.patch("/leads/:id", async (req, res, next) => {
  try {
    const body = updateLeadSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const lead = await updateGrowthLead(
      ctx.tenantId,
      workspace.id,
      String(req.params.id),
      body,
    );
    res.json({ lead });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

growthRouter.patch("/leads/:id/stage", async (req, res, next) => {
  try {
    const body = leadStageSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const lead = await updateGrowthLeadStage(
      ctx.tenantId,
      workspace.id,
      String(req.params.id),
      body.stageSlug,
    );
    res.json({ lead });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

growthRouter.get("/forms", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const forms = await listGrowthForms(ctx.tenantId, workspace.id);
    res.json({ forms });
  } catch (err) {
    next(err);
  }
});

growthRouter.post("/capture/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const result = await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/chatbot", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const configs = await listGrowthChatbotConfigs(ctx.tenantId, workspace.id);
    res.json({ configs });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/chatbot/sessions", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const sessions = await listGrowthChatSessions(ctx.tenantId, workspace.id);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/chatbot/sessions/:id", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const session = await getGrowthChatSession(ctx.tenantId, workspace.id, String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    res.json({ session });
  } catch (err) {
    next(err);
  }
});

growthRouter.post("/chatbot/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthChatbotFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAnalyticsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const result = await ensureGrowthAutomationsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const packaging = await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const optimization = await ensureGrowthOptimizationFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const channels = await ensureGrowthChannelsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ ...result, ...packaging, ...optimization, ...channels });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/analytics/dashboard", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const days = Number(req.query.days ?? 30);
    const dashboard = await getGrowthAnalyticsDashboard(ctx.tenantId, workspace.id, days);
    res.json({ dashboard });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/analytics/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthChatbotFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAnalyticsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const result = await ensureGrowthAutomationsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const packaging = await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const optimization = await ensureGrowthOptimizationFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const channels = await ensureGrowthChannelsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ ...result, ...packaging, ...optimization, ...channels });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/plan", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const plan = await getGrowthPlanSnapshot(ctx.tenantId, workspace.id);
    const role = await resolveGrowthTeamRole({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    res.json({ plan, role });
  } catch (err) {
    next(err);
  }
});

const updateSettingsSchema = z.object({
  notifyEmail: z.string().email().nullable().optional(),
  planSlug: z.enum(["starter", "pro", "agency"]).optional(),
  settings: z.record(z.unknown()).optional(),
});

growthRouter.get("/settings", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    let settings = await getGrowthSettings(ctx.tenantId, workspace.id);
    if (!settings) {
      const packaging = await ensureGrowthPackagingFoundation({
        tenantId: ctx.tenantId,
        workspaceId: workspace.id,
        hostingAccountId: ctx.hostingAccountId,
      });
      settings = packaging.settings;
    }
    const team = await listGrowthTeamMembers(ctx.tenantId, workspace.id);
    const role = await resolveGrowthTeamRole({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    res.json({ settings, team, role });
  } catch (err) {
    next(err);
  }
});

growthRouter.patch("/settings", async (req, res, next) => {
  try {
    const body = updateSettingsSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthOwner({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const settings = await updateGrowthSettings(ctx.tenantId, workspace.id, body);
    res.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

const inviteTeamSchema = z.object({
  email: z.string().email(),
  role: z.enum(["marketer"]).optional(),
});

growthRouter.post("/team", async (req, res, next) => {
  try {
    const body = inviteTeamSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthOwner({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const member = await inviteGrowthTeamMember(ctx.tenantId, workspace.id, body);
    res.status(201).json({ member });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.delete("/team/:memberId", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthOwner({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    await removeGrowthTeamMember(ctx.tenantId, workspace.id, String(req.params.memberId));
    res.status(204).send();
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/packaging/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthChatbotFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAnalyticsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAutomationsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const result = await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const optimization = await ensureGrowthOptimizationFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const channels = await ensureGrowthChannelsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ ...result, ...optimization, ...channels });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/plan/options", async (_req, res) => {
  res.json({ plans: listGrowthPlanOptions() });
});

const planCheckoutSchema = z.object({
  planSlug: z.enum(["starter", "pro", "agency"]),
  provider: z.enum(["stripe", "paystack", "mock"]),
  customerEmail: z.string().email(),
});

growthRouter.post("/plan/checkout", async (req, res, next) => {
  try {
    const body = planCheckoutSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthOwner({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const account = req.panelAccount!;
    const checkout = await createGrowthPlanCheckout({
      tenantSlug: account.tenant.slug,
      planSlug: body.planSlug,
      customerEmail: body.customerEmail,
      provider: body.provider,
    });
    res.status(201).json({ checkout });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.get("/optimization", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const summary = await getGrowthOptimizationSummary(ctx.tenantId, workspace.id);
    res.json(summary);
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/optimization/refresh", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const insights = await refreshGrowthOptimizationInsights(ctx.tenantId, workspace.id);
    const weeklyBrief = await getLatestWeeklyBrief(workspace.id);
    res.json({ insights, weeklyBrief });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.get("/optimization/brief", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthAnalyticsAccess(ctx.tenantId, workspace.id);
    const weeklyBrief = await getLatestWeeklyBrief(workspace.id);
    res.json({ weeklyBrief });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/optimization/brief/email", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await assertGrowthAnalyticsAccess(ctx.tenantId, workspace.id);
    const sent = await emailWeeklyBriefIfDue({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      force: true,
    });
    res.json({ sent });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.patch("/optimization/:id", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const insight = await dismissGrowthOptimizationInsight(
      ctx.tenantId,
      workspace.id,
      String(req.params.id),
    );
    res.json({ insight });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/optimization/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthChatbotFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAnalyticsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAutomationsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const result = await ensureGrowthOptimizationFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const channels = await ensureGrowthChannelsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ ...result, ...channels });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/agents/llm-status", async (_req, res) => {
  res.json({ configured: await isGrowthLlmConfigured() });
});

growthRouter.get("/channels/assets", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const assets = await listGrowthChannelAssets(ctx.tenantId, workspace.id);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/channels/deliveries", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const deliveries = await listGrowthChannelDeliveries(ctx.tenantId, workspace.id);
    res.json({ deliveries });
  } catch (err) {
    next(err);
  }
});

const scheduleSocialSchema = z.object({
  scheduledAt: z.string().datetime(),
});

growthRouter.post("/channels/social/:assetId/schedule", async (req, res, next) => {
  try {
    const body = scheduleSocialSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const delivery = await scheduleGrowthSocialPost({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      assetId: String(req.params.assetId),
      scheduledAt: new Date(body.scheduledAt),
    });
    res.status(201).json({ delivery });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/channels/social/:assetId/send", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const delivery = await sendGrowthSocialPostNow({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      assetId: String(req.params.assetId),
    });
    res.json({ delivery });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

const emailBroadcastSchema = z.object({
  emailStep: z.number().int().min(1).max(10),
  leadIds: z.array(z.string()).optional(),
});

growthRouter.post("/channels/email/broadcast", async (req, res, next) => {
  try {
    const body = emailBroadcastSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const result = await sendGrowthEmailBroadcast({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      emailStep: body.emailStep,
      leadIds: body.leadIds,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("No leads")) {
      res.status(400).json({ error: err.message });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/channels/process-due", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const processed = await processDueGrowthChannelDeliveries(ctx.tenantId, workspace.id);
    res.json({ processed });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/channels/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    await ensureGrowthChatbotFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    await ensureGrowthAnalyticsFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    await ensureGrowthAutomationsFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    await ensureGrowthOptimizationFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    const result = await ensureGrowthChannelsFoundation({ tenantId: ctx.tenantId, workspaceId: workspace.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const channelIntegrationSchema = z.object({
  provider: z.enum(GROWTH_CHANNEL_PROVIDERS),
  credentials: z.record(z.string()),
  accountLabel: z.string().optional(),
});

growthRouter.get("/channels/integrations", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const integrations = await listGrowthChannelIntegrations(ctx.tenantId, workspace.id);
    res.json({ integrations });
  } catch (err) {
    next(err);
  }
});

growthRouter.post("/channels/integrations", async (req, res, next) => {
  try {
    const body = channelIntegrationSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const integration = await connectGrowthChannelIntegration({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      provider: body.provider,
      credentials: body.credentials,
      accountLabel: body.accountLabel,
    });
    res.status(201).json({ integration });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.delete("/channels/integrations/:provider", async (req, res, next) => {
  try {
    const provider = z.enum(GROWTH_CHANNEL_PROVIDERS).parse(req.params.provider);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await disconnectGrowthChannelIntegration(ctx.tenantId, workspace.id, provider);
    res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    next(err);
  }
});

growthRouter.get("/ads-seo", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const summary = await getGrowthAdsSeoSummary(ctx.tenantId, workspace.id);
    res.json(summary);
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

const adBudgetSchema = z.object({
  dailyBudgetCents: z.number().int().min(0),
  status: z.enum(["draft", "active", "paused"]).optional(),
});

growthRouter.patch("/ads-seo/campaigns/:id", async (req, res, next) => {
  try {
    const body = adBudgetSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const campaign = await updateGrowthAdCampaignBudget({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      campaignId: String(req.params.id),
      dailyBudgetCents: body.dailyBudgetCents,
      status: body.status,
    });
    res.json({ campaign });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/ads-seo/campaigns/:id/sync", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const campaign = await syncGrowthAdCampaign({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      campaignId: String(req.params.id),
    });
    res.json({ campaign });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Connect")) {
      res.status(400).json({ error: err.message });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/ads-seo/pacing/refresh", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const campaigns = await refreshGrowthAdPacing(ctx.tenantId, workspace.id);
    res.json({ campaigns });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.post("/ads-seo/ranks/refresh", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const keywords = await refreshGrowthSeoRanks(ctx.tenantId, workspace.id);
    res.json({ keywords });
  } catch (err) {
    handleGrowthPlanError(err, res, next);
  }
});

const adAccountLinkSchema = z.object({
  platform: z.enum(["google_ads", "meta"]),
  credentials: z.record(z.string()),
  accountLabel: z.string().optional(),
});

growthRouter.post("/ads-seo/link-account", async (req, res, next) => {
  try {
    const body = adAccountLinkSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const integration = await linkGrowthAdAccount({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      platform: body.platform,
      credentials: body.credentials,
      accountLabel: body.accountLabel,
    });
    res.status(201).json({ integration });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

growthRouter.get("/content/llm-status", async (_req, res, next) => {
  try {
    const status = await getGrowthContentLlmStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/automations", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const automations = await listGrowthAutomations(ctx.tenantId, workspace.id);
    res.json({ automations });
  } catch (err) {
    next(err);
  }
});

growthRouter.get("/automations/runs", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const runs = await listGrowthAutomationRuns(ctx.tenantId, workspace.id);
    res.json({ runs });
  } catch (err) {
    next(err);
  }
});

const createAutomationSchema = z.object({
  name: z.string().min(1).max(120),
  triggerType: z.string().min(1),
  actionType: z.string().min(1),
  triggerFilter: z.record(z.unknown()).optional(),
  actionConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

growthRouter.post("/automations", async (req, res, next) => {
  try {
    const body = createAutomationSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const automation = await createGrowthAutomation(ctx.tenantId, workspace.id, {
      name: body.name,
      triggerType: body.triggerType,
      actionType: body.actionType,
      triggerFilter: body.triggerFilter,
      actionConfig: body.actionConfig,
      isActive: body.isActive,
    });
    res.status(201).json({ automation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    handleGrowthPlanError(err, res, next);
  }
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
});

growthRouter.patch("/automations/:id", async (req, res, next) => {
  try {
    const body = updateAutomationSchema.parse(req.body);
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    const automation = await updateGrowthAutomation(
      ctx.tenantId,
      workspace.id,
      String(req.params.id),
      body,
    );
    res.json({ automation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: formatZodValidationMessage(err) });
      return;
    }
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

growthRouter.post("/automations/bootstrap", async (req, res, next) => {
  try {
    const ctx = tenantContext(req);
    const workspace = await getOrCreateGrowthWorkspace(ctx);
    await ensureGrowthCaptureFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthChatbotFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    await ensureGrowthAnalyticsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const result = await ensureGrowthAutomationsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const packaging = await ensureGrowthPackagingFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
      hostingAccountId: ctx.hostingAccountId,
    });
    const optimization = await ensureGrowthOptimizationFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    const channels = await ensureGrowthChannelsFoundation({
      tenantId: ctx.tenantId,
      workspaceId: workspace.id,
    });
    res.json({ ...result, ...packaging, ...optimization, ...channels });
  } catch (err) {
    next(err);
  }
});
