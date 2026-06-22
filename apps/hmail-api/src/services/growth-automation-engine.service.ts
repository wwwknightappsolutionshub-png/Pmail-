import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type {
  GrowthAutomationActionConfig,
  GrowthAutomationTrigger,
  GrowthAutomationTriggerFilter,
} from "../growth/automation-types.js";
import { notifyNewGrowthLead } from "./growth-lead-notify.service.js";
import { sendNurtureEmailToLead } from "./growth-nurture-email.service.js";

export type GrowthAutomationDispatchContext = {
  source?: string;
  fromStage?: string;
  toStage?: string;
  skipAutomations?: boolean;
};

function matchesTriggerFilter(
  triggerType: GrowthAutomationTrigger,
  filter: GrowthAutomationTriggerFilter,
  context: GrowthAutomationDispatchContext,
): boolean {
  if (triggerType === "lead_created") {
    if (filter.excludeSources?.length && context.source) {
      if (filter.excludeSources.includes(context.source)) return false;
    }
    if (filter.sources?.length && context.source) {
      if (!filter.sources.includes(context.source)) return false;
    }
    return true;
  }

  if (triggerType === "stage_changed") {
    if (filter.toStage && context.toStage !== filter.toStage) return false;
    if (filter.fromStage && context.fromStage !== filter.fromStage) return false;
    return true;
  }

  return true;
}

async function executeAutomationAction(input: {
  tenantId: string;
  workspaceId: string;
  leadId: string;
  actionType: string;
  actionConfig: GrowthAutomationActionConfig;
}) {
  const lead = await prisma.growthLead.findFirst({
    where: { id: input.leadId, tenantId: input.tenantId, workspaceId: input.workspaceId },
  });
  if (!lead) throw new Error("Lead not found");

  const formattedLead = {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    message: lead.message,
    source: lead.source,
    sourcePage: lead.sourcePage,
    score: lead.score,
    stageSlug: lead.stageSlug,
  };

  if (input.actionType === "send_nurture_email") {
    return sendNurtureEmailToLead({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      lead: formattedLead,
      emailStep: input.actionConfig.emailStep ?? 1,
    });
  }

  if (input.actionType === "notify_owner") {
    await notifyNewGrowthLead({
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      lead: formattedLead,
    });
    return { sent: true, channel: "owner_notify" };
  }

  if (input.actionType === "move_stage") {
    const stageSlug = input.actionConfig.stageSlug?.trim();
    if (!stageSlug) throw new Error("move_stage missing stageSlug");
    if (lead.stageSlug === stageSlug) {
      return { skipped: true, reason: "Lead already in target stage" };
    }
    const { updateGrowthLeadStage } = await import("./growth-leads.service.js");
    await updateGrowthLeadStage(input.tenantId, input.workspaceId, input.leadId, stageSlug, {
      skipAutomations: true,
    });
    return { moved: true, stageSlug };
  }

  throw new Error(`Unknown action type: ${input.actionType}`);
}

async function recordAutomationRun(input: {
  tenantId: string;
  workspaceId: string;
  automationId: string;
  leadId: string;
  triggerEvent: string;
  status: string;
  result?: Record<string, unknown>;
  errorMessage?: string;
}) {
  try {
    await prisma.growthAutomationRun.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        automationId: input.automationId,
        leadId: input.leadId,
        status: input.status,
        triggerEvent: input.triggerEvent,
        resultJson: JSON.stringify(input.result ?? {}),
        errorMessage: input.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.warn(
      "[growth-automation-run]",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function dispatchGrowthAutomations(input: {
  tenantId: string;
  workspaceId: string;
  triggerType: GrowthAutomationTrigger;
  leadId: string;
  context?: GrowthAutomationDispatchContext;
}) {
  if (input.context?.skipAutomations) return;

  const automations = await prisma.growthAutomation.findMany({
    where: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      triggerType: input.triggerType,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  for (const automation of automations) {
    const filter = JSON.parse(automation.triggerFilterJson) as GrowthAutomationTriggerFilter;
    const actionConfig = JSON.parse(automation.actionConfigJson) as GrowthAutomationActionConfig;

    if (!matchesTriggerFilter(input.triggerType, filter, input.context ?? {})) {
      await recordAutomationRun({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        automationId: automation.id,
        leadId: input.leadId,
        triggerEvent: input.triggerType,
        status: "skipped",
        result: { reason: "Trigger filter did not match" },
      });
      continue;
    }

    try {
      const result = await executeAutomationAction({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        leadId: input.leadId,
        actionType: automation.actionType,
        actionConfig,
      });

      const status =
        result && typeof result === "object" && "skipped" in result && result.skipped
          ? "skipped"
          : result && typeof result === "object" && "sent" in result && result.sent === false
            ? "skipped"
            : "success";

      await recordAutomationRun({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        automationId: automation.id,
        leadId: input.leadId,
        triggerEvent: input.triggerType,
        status,
        result: result as Record<string, unknown>,
      });

      if (status === "success" && automation.actionType === "send_nurture_email") {
        const { recordLeadActivity } = await import("./growth-leads.service.js");
        await recordLeadActivity({
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          leadId: input.leadId,
          activityType: "automation_email",
          summary: `Automation sent nurture email (${automation.name})`,
          metadata: result as Record<string, unknown>,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Automation failed";
      await recordAutomationRun({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        automationId: automation.id,
        leadId: input.leadId,
        triggerEvent: input.triggerType,
        status: "failed",
        errorMessage: message,
      });
    }
  }
}

/** Fire-and-forget so lead/chat flows never fail on automation errors. */
export function queueGrowthAutomations(input: Parameters<typeof dispatchGrowthAutomations>[0]): void {
  void dispatchGrowthAutomations(input).catch((err) => {
    console.warn("[growth-automation]", err instanceof Error ? err.message : err);
  });
}
