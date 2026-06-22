import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type {
  GrowthAutomationAction,
  GrowthAutomationActionConfig,
  GrowthAutomationTrigger,
  GrowthAutomationTriggerFilter,
} from "../growth/automation-types.js";
import {
  describeAutomationAction,
  describeAutomationTrigger,
  isGrowthAutomationAction,
  isGrowthAutomationTrigger,
} from "../growth/automation-types.js";
import { assertGrowthAutomationCapacity } from "./growth-plan.service.js";

type AutomationRow = {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  triggerType: string;
  triggerFilterJson: string;
  actionType: string;
  actionConfigJson: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function parseFilter(raw: string): GrowthAutomationTriggerFilter {
  return JSON.parse(raw) as GrowthAutomationTriggerFilter;
}

function parseActionConfig(raw: string): GrowthAutomationActionConfig {
  return JSON.parse(raw) as GrowthAutomationActionConfig;
}

export function formatGrowthAutomation(row: AutomationRow) {
  const triggerFilter = parseFilter(row.triggerFilterJson);
  const actionConfig = parseActionConfig(row.actionConfigJson);
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    name: row.name,
    triggerType: row.triggerType as GrowthAutomationTrigger,
    triggerFilter,
    actionType: row.actionType as GrowthAutomationAction,
    actionConfig,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    triggerLabel: describeAutomationTrigger(row.triggerType as GrowthAutomationTrigger, triggerFilter),
    actionLabel: describeAutomationAction(row.actionType as GrowthAutomationAction, actionConfig),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGrowthAutomations(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthAutomation.findMany({
    where: { tenantId, workspaceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(formatGrowthAutomation);
}

export async function listGrowthAutomationRuns(tenantId: string, workspaceId: string, limit = 40) {
  const rows = await prisma.growthAutomationRun.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { automation: { select: { name: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    automationId: row.automationId,
    automationName: row.automation.name,
    leadId: row.leadId,
    status: row.status,
    triggerEvent: row.triggerEvent,
    result: JSON.parse(row.resultJson) as Record<string, unknown>,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createGrowthAutomation(
  tenantId: string,
  workspaceId: string,
  input: {
    name: string;
    triggerType: string;
    actionType: string;
  triggerFilter?: GrowthAutomationTriggerFilter | Record<string, unknown>;
  actionConfig?: GrowthAutomationActionConfig | Record<string, unknown>;
    isActive?: boolean;
  },
) {
  if (!isGrowthAutomationTrigger(input.triggerType)) {
    throw new Error(`Invalid trigger type: ${input.triggerType}`);
  }
  if (!isGrowthAutomationAction(input.actionType)) {
    throw new Error(`Invalid action type: ${input.actionType}`);
  }
  if (input.actionType === "move_stage") {
    const stageSlug = typeof input.actionConfig?.stageSlug === "string" ? input.actionConfig.stageSlug.trim() : "";
    if (!stageSlug) throw new Error("move_stage action requires actionConfig.stageSlug");
  }

  await assertGrowthAutomationCapacity(tenantId, workspaceId);

  const count = await prisma.growthAutomation.count({ where: { workspaceId } });
  const row = await prisma.growthAutomation.create({
    data: {
      id: randomUUID(),
      tenantId,
      workspaceId,
      name: input.name.trim(),
      triggerType: input.triggerType,
      triggerFilterJson: JSON.stringify(input.triggerFilter ?? {}),
      actionType: input.actionType,
      actionConfigJson: JSON.stringify(input.actionConfig ?? {}),
      isActive: input.isActive ?? true,
      sortOrder: count,
    },
  });

  return formatGrowthAutomation(row);
}

export async function updateGrowthAutomation(
  tenantId: string,
  workspaceId: string,
  automationId: string,
  input: { name?: string; isActive?: boolean },
) {
  const existing = await prisma.growthAutomation.findFirst({
    where: { id: automationId, tenantId, workspaceId },
  });
  if (!existing) throw new Error("Automation not found");

  const row = await prisma.growthAutomation.update({
    where: { id: automationId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });

  return formatGrowthAutomation(row);
}

const DEFAULT_AUTOMATIONS: Array<{
  name: string;
  triggerType: GrowthAutomationTrigger;
  triggerFilter: GrowthAutomationTriggerFilter;
  actionType: GrowthAutomationAction;
  actionConfig: GrowthAutomationActionConfig;
  sortOrder: number;
}> = [
  {
    name: "Welcome nurture email",
    triggerType: "lead_created",
    triggerFilter: { excludeSources: ["manual"] },
    actionType: "send_nurture_email",
    actionConfig: { emailStep: 1 },
    sortOrder: 0,
  },
  {
    name: "Qualify chatbot leads",
    triggerType: "chat_completed",
    triggerFilter: {},
    actionType: "move_stage",
    actionConfig: { stageSlug: "qualified" },
    sortOrder: 1,
  },
  {
    name: "Qualified follow-up email",
    triggerType: "stage_changed",
    triggerFilter: { toStage: "qualified" },
    actionType: "send_nurture_email",
    actionConfig: { emailStep: 2 },
    sortOrder: 2,
  },
];

export async function ensureDefaultGrowthAutomations(tenantId: string, workspaceId: string) {
  const existing = await prisma.growthAutomation.count({ where: { workspaceId } });
  if (existing > 0) {
    return listGrowthAutomations(tenantId, workspaceId);
  }

  for (const def of DEFAULT_AUTOMATIONS) {
    await prisma.growthAutomation.create({
      data: {
        id: randomUUID(),
        tenantId,
        workspaceId,
        name: def.name,
        triggerType: def.triggerType,
        triggerFilterJson: JSON.stringify(def.triggerFilter),
        actionType: def.actionType,
        actionConfigJson: JSON.stringify(def.actionConfig),
        isActive: true,
        sortOrder: def.sortOrder,
      },
    });
  }

  return listGrowthAutomations(tenantId, workspaceId);
}
