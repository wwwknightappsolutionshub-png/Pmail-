import { prisma } from "../lib/prisma.js";
import {
  getGrowthAgentDefinition,
  GROWTH_AGENT_REGISTRY,
  type GrowthAgentKey,
} from "../growth/agent-registry.js";
import { loadGrowthWizardProfile } from "../growth/wizard-profile.js";
import type { WebsiteSnapshot } from "../growth/website-snapshot.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { getActivePromptForAgent, renderPromptTemplate } from "./growth-prompt-registry.service.js";
import { resolveGrowthAgentOutput } from "./growth-llm-agent.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";

export async function listGrowthAgentRuns(tenantId: string, workspaceId: string, limit = 20) {
  const rows = await prisma.growthAgentRun.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(formatAgentRun);
}

export async function getGrowthAgentCatalog() {
  return GROWTH_AGENT_REGISTRY.map((agent) => ({
    key: agent.key,
    label: agent.label,
    description: agent.description,
    order: agent.order,
  }));
}

async function loadWizardVariables(workspaceId: string): Promise<Record<string, string>> {
  const profile = await prisma.growthBusinessProfile.findUnique({ where: { workspaceId } });
  if (!profile) return {};

  const vars: Record<string, string> = {};
  const steps = [
    profile.step1Json,
    profile.step2Json,
    profile.step3Json,
    profile.step4Json,
    profile.step5Json,
    profile.step6Json,
  ];

  for (const raw of steps) {
    if (!raw) continue;
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(data)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        vars[key] = value.join(", ");
      } else if (typeof value === "object") {
        vars[key] = JSON.stringify(value);
      } else {
        vars[key] = String(value);
      }
    }
  }

  return vars;
}

async function upsertAgentMemory(input: {
  tenantId: string;
  workspaceId: string;
  memoryKey: string;
  content: Record<string, unknown>;
}) {
  await prisma.growthAgentMemory.upsert({
    where: {
      workspaceId_memoryKey: {
        workspaceId: input.workspaceId,
        memoryKey: input.memoryKey,
      },
    },
    create: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      memoryKey: input.memoryKey,
      contentJson: JSON.stringify(input.content),
    },
    update: {
      contentJson: JSON.stringify(input.content),
    },
  });
}

export async function runGrowthAgent(input: {
  tenantId: string;
  workspaceId: string;
  agentKey: GrowthAgentKey;
  jobId?: string;
  websiteSnapshot?: WebsiteSnapshot | null;
}) {
  const definition = getGrowthAgentDefinition(input.agentKey);
  if (!definition) throw new Error(`Unknown agent: ${input.agentKey}`);

  const prompt = await getActivePromptForAgent(input.agentKey);
  const variables = await loadWizardVariables(input.workspaceId);
  const renderedPrompt = prompt
    ? renderPromptTemplate(prompt.templateText, variables)
    : `Run ${input.agentKey}`;

  const run = await prisma.growthAgentRun.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      jobId: input.jobId,
      agentKey: input.agentKey,
      status: "processing",
      inputJson: JSON.stringify({ prompt: renderedPrompt, variables }),
      promptVersion: prompt?.version ?? "1.0.0",
      startedAt: new Date(),
    },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "agent.started",
    payload: { agentKey: input.agentKey, runId: run.id },
  });

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const { output } = await resolveGrowthAgentOutput({
    agentKey: input.agentKey,
    profile,
    websiteSnapshot: input.websiteSnapshot ?? null,
    renderedPrompt,
    wizardContextJson: JSON.stringify(variables),
  });

  const runOutput = {
    ...output,
    promptVersion: prompt?.version ?? "1.0.0",
  };

  await prisma.growthAgentRun.update({
    where: { id: run.id },
    data: {
      status: "completed",
      outputJson: JSON.stringify(runOutput),
      completedAt: new Date(),
    },
  });

  await upsertAgentMemory({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    memoryKey: definition.outputMemoryKey,
    content: runOutput,
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "agent.completed",
    entityType: "growth_agent_run",
    entityId: run.id,
    metadata: { agentKey: input.agentKey },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "agent.completed",
    payload: { agentKey: input.agentKey, runId: run.id },
  });

  return formatAgentRun(
    await prisma.growthAgentRun.findUniqueOrThrow({ where: { id: run.id } }),
  );
}

function formatAgentRun(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  jobId: string | null;
  agentKey: string;
  status: string;
  inputJson: string;
  outputJson: string | null;
  promptVersion: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    jobId: row.jobId,
    agentKey: row.agentKey,
    status: row.status,
    input: JSON.parse(row.inputJson) as Record<string, unknown>,
    output: row.outputJson ? (JSON.parse(row.outputJson) as Record<string, unknown>) : null,
    promptVersion: row.promptVersion,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGrowthMemories(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthAgentMemory.findMany({
    where: { tenantId, workspaceId },
    orderBy: { memoryKey: "asc" },
  });
  return rows.map((row) => ({
    memoryKey: row.memoryKey,
    content: JSON.parse(row.contentJson) as Record<string, unknown>,
    updatedAt: row.updatedAt.toISOString(),
  }));
}
