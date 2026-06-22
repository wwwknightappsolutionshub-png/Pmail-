import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import {
  formatChatTranscript,
  validateChatbotAnswer,
  type GrowthChatbotStep,
} from "../growth/chatbot-steps.js";
import { createGrowthLead } from "./growth-leads.service.js";
import { recordGrowthAnalyticsEvent } from "./growth-analytics.service.js";
import { queueGrowthAutomations, dispatchGrowthAutomations } from "./growth-automation-engine.service.js";
import { getGrowthChatbotConfigForWorkspace } from "./growth-chatbot-config.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

type SessionRow = {
  id: string;
  tenantId: string;
  workspaceId: string;
  status: string;
  leadId: string | null;
  sourcePage: string | null;
  attributionJson: string;
  collectedDataJson: string;
  currentStepIndex: number;
};

function parseCollected(raw: string): Record<string, string> {
  return JSON.parse(raw) as Record<string, string>;
}

function formatMessage(row: {
  id: string;
  role: string;
  content: string;
  stepKey: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    role: row.role as "bot" | "user",
    content: row.content,
    stepKey: row.stepKey,
    createdAt: row.createdAt.toISOString(),
  };
}

async function appendBotMessages(
  session: SessionRow,
  steps: GrowthChatbotStep[],
  fromIndex: number,
): Promise<{ index: number; messages: ReturnType<typeof formatMessage>[] }> {
  const created: ReturnType<typeof formatMessage>[] = [];
  let index = fromIndex;

  while (index < steps.length && steps[index].kind === "say") {
    const step = steps[index];
    const row = await prisma.growthChatMessage.create({
      data: {
        id: randomUUID(),
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        sessionId: session.id,
        role: "bot",
        content: step.message,
        stepKey: step.id,
      },
    });
    created.push(formatMessage(row));
    index += 1;
  }

  await prisma.growthChatSession.update({
    where: { id: session.id },
    data: { currentStepIndex: index },
  });

  return { index, messages: created };
}

function buildReplySpec(step: GrowthChatbotStep | undefined) {
  if (!step || step.kind !== "ask") {
    return { expectsInput: false as const };
  }
  return {
    expectsInput: true as const,
    stepId: step.id,
    field: step.field,
    inputType: step.inputType ?? "text",
    choices: step.choices,
    placeholder: step.placeholder,
    message: step.message,
  };
}

function utmFromAttribution(attribution?: Record<string, unknown>) {
  const rawSource = attribution?.utm_source ?? attribution?.utmSource;
  const rawMedium = attribution?.utm_medium ?? attribution?.utmMedium;
  const rawCampaign = attribution?.utm_campaign ?? attribution?.utmCampaign;
  const rawReferrer = attribution?.referrer;
  return {
    utmSource: typeof rawSource === "string" ? rawSource : undefined,
    utmMedium: typeof rawMedium === "string" ? rawMedium : undefined,
    utmCampaign: typeof rawCampaign === "string" ? rawCampaign : undefined,
    referrer: typeof rawReferrer === "string" ? rawReferrer : undefined,
  };
}

async function recordChatAnalyticsEvent(
  session: SessionRow,
  eventType: "chat_open" | "chat_complete",
  metadata?: Record<string, unknown>,
) {
  const attribution = JSON.parse(session.attributionJson) as Record<string, unknown>;
  const utm = utmFromAttribution(attribution);
  await recordGrowthAnalyticsEvent({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    eventType,
    sourcePage: session.sourcePage ?? undefined,
    ...utm,
    metadata,
  });
}

async function completeChatSession(session: SessionRow, steps: GrowthChatbotStep[]) {
  const messages = await prisma.growthChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });
  const collected = parseCollected(session.collectedDataJson);
  const transcript = formatChatTranscript(messages.map((m) => ({ role: m.role, content: m.content })));

  const need = collected.need ?? "";
  const timeline = collected.timeline ?? "";
  const message = [`Need: ${need}`, timeline ? `Timeline: ${timeline}` : "", "", "— Chat transcript —", transcript]
    .filter(Boolean)
    .join("\n");

  const lead = await createGrowthLead({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    fullName: collected.fullName ?? "Website visitor",
    email: collected.email ?? "unknown@visitor.local",
    phone: collected.phone,
    message,
    source: "chatbot",
    sourcePage: session.sourcePage ?? undefined,
    formData: {
      ...collected,
      chatTranscript: JSON.stringify(messages.map((m) => ({ role: m.role, content: m.content }))),
      chatSessionId: session.id,
    },
    attribution: JSON.parse(session.attributionJson) as Record<string, unknown>,
  });

  await prisma.growthChatSession.update({
    where: { id: session.id },
    data: { status: "completed", leadId: lead.id, currentStepIndex: steps.length },
  });

  await prisma.growthLeadActivity.create({
    data: {
      id: randomUUID(),
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      leadId: lead.id,
      activityType: "chatbot_completed",
      summary: "Qualification chatbot completed",
      metadataJson: JSON.stringify({ sessionId: session.id, timeline }),
    },
  });

  await logGrowthAudit({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    action: "chatbot.session_completed",
    entityType: "growth_chat_session",
    entityId: session.id,
    metadata: { leadId: lead.id },
  });

  await emitGrowthEvent({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    eventType: "chatbot.session_completed",
    payload: { sessionId: session.id, leadId: lead.id },
  });

  await recordChatAnalyticsEvent(session, "chat_complete", { leadId: lead.id, sessionId: session.id });

  await dispatchGrowthAutomations({
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    triggerType: "chat_completed",
    leadId: lead.id,
    context: { source: "chatbot" },
  }).catch(() => undefined);

  return lead;
}

export async function startGrowthChatSession(input: {
  tenantId: string;
  workspaceId: string;
  sourcePage?: string;
  attribution?: Record<string, unknown>;
}) {
  const config = await getGrowthChatbotConfigForWorkspace(input.workspaceId);
  if (!config) throw new Error("Chatbot is not available");

  const session = await prisma.growthChatSession.create({
    data: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      sourcePage: input.sourcePage?.trim() || null,
      attributionJson: JSON.stringify(input.attribution ?? {}),
    },
  });

  await recordChatAnalyticsEvent(
    {
      ...session,
      collectedDataJson: session.collectedDataJson,
      currentStepIndex: session.currentStepIndex,
    },
    "chat_open",
    { sessionId: session.id },
  );

  const { index, messages } = await appendBotMessages(session, config.steps, 0);
  const nextStep = config.steps[index];

  if (index >= config.steps.length) {
    const lead = await completeChatSession(session, config.steps);
    return {
      sessionId: session.id,
      status: "completed" as const,
      messages,
      leadId: lead.id,
      expectsInput: false,
    };
  }

  if (nextStep?.kind === "ask") {
    const promptRow = await prisma.growthChatMessage.create({
      data: {
        id: randomUUID(),
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        sessionId: session.id,
        role: "bot",
        content: nextStep.message,
        stepKey: nextStep.id,
      },
    });
    messages.push(formatMessage(promptRow));
  }

  return {
    sessionId: session.id,
    status: "active" as const,
    messages,
    ...buildReplySpec(nextStep),
  };
}

export async function submitGrowthChatReply(input: {
  tenantId: string;
  workspaceId: string;
  sessionId: string;
  message: string;
}) {
  const session = await prisma.growthChatSession.findFirst({
    where: {
      id: input.sessionId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
    },
  });
  if (!session) throw new Error("Chat session not found");
  if (session.status !== "active") throw new Error("Chat session is already finished");

  const config = await getGrowthChatbotConfigForWorkspace(input.workspaceId);
  if (!config) throw new Error("Chatbot is not available");

  const steps = config.steps;
  const current = steps[session.currentStepIndex];
  if (!current || current.kind !== "ask") {
    throw new Error("Not expecting a reply at this step");
  }

  const answer = validateChatbotAnswer(current, input.message);
  const collected = parseCollected(session.collectedDataJson);
  if (current.field) {
    collected[current.field] = answer;
  }

  await prisma.growthChatMessage.create({
    data: {
      id: randomUUID(),
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      sessionId: session.id,
      role: "user",
      content: answer,
      stepKey: current.id,
    },
  });

  const nextIndex = session.currentStepIndex + 1;
  await prisma.growthChatSession.update({
    where: { id: session.id },
    data: {
      collectedDataJson: JSON.stringify(collected),
      currentStepIndex: nextIndex,
    },
  });

  const updatedSession: SessionRow = {
    ...session,
    collectedDataJson: JSON.stringify(collected),
    currentStepIndex: nextIndex,
  };

  const { index, messages: botMessages } = await appendBotMessages(updatedSession, steps, nextIndex);

  if (index >= steps.length) {
    const lead = await completeChatSession(
      { ...updatedSession, currentStepIndex: index },
      steps,
    );
    return {
      sessionId: session.id,
      status: "completed" as const,
      messages: botMessages,
      leadId: lead.id,
      expectsInput: false,
    };
  }

  const nextStep = steps[index];
  if (nextStep.kind === "ask") {
    const promptRow = await prisma.growthChatMessage.create({
      data: {
        id: randomUUID(),
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        sessionId: session.id,
        role: "bot",
        content: nextStep.message,
        stepKey: nextStep.id,
      },
    });
    botMessages.push(formatMessage(promptRow));
  }

  return {
    sessionId: session.id,
    status: "active" as const,
    messages: botMessages,
    ...buildReplySpec(nextStep),
  };
}

export async function getGrowthChatSession(tenantId: string, workspaceId: string, sessionId: string) {
  const session = await prisma.growthChatSession.findFirst({
    where: { id: sessionId, tenantId, workspaceId },
  });
  if (!session) return null;

  const messages = await prisma.growthChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return {
    id: session.id,
    status: session.status,
    leadId: session.leadId,
    sourcePage: session.sourcePage,
    collectedData: parseCollected(session.collectedDataJson),
    currentStepIndex: session.currentStepIndex,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: messages.map(formatMessage),
  };
}

export async function listGrowthChatSessions(tenantId: string, workspaceId: string, limit = 20) {
  const rows = await prisma.growthChatSession.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    leadId: row.leadId,
    sourcePage: row.sourcePage,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getGrowthChatSessionForLead(tenantId: string, workspaceId: string, leadId: string) {
  const session = await prisma.growthChatSession.findFirst({
    where: { tenantId, workspaceId, leadId },
    orderBy: { createdAt: "desc" },
  });
  if (!session) return null;
  return getGrowthChatSession(tenantId, workspaceId, session.id);
}
