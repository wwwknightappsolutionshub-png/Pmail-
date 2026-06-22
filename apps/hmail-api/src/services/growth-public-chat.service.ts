import {
  getGrowthChatbotByTenantSlug,
} from "./growth-chatbot-config.service.js";
import {
  getGrowthChatSession,
  startGrowthChatSession,
  submitGrowthChatReply,
} from "./growth-chat-engine.service.js";

export async function getPublicGrowthChatbot(tenantSlug: string) {
  const resolved = await getGrowthChatbotByTenantSlug(tenantSlug);
  if (!resolved) return null;

  return {
    tenantSlug: resolved.tenant.slug,
    bot: {
      botKey: resolved.config.botKey,
      title: resolved.config.title,
      welcomeMessage: resolved.config.welcomeMessage,
      stepCount: resolved.config.steps.length,
    },
    startUrl: `/api/public/growth/${resolved.tenant.slug}/chat/sessions`,
    replyUrlTemplate: `/api/public/growth/${resolved.tenant.slug}/chat/sessions/{sessionId}/messages`,
  };
}

export async function startPublicGrowthChat(
  tenantSlug: string,
  input: { sourcePage?: string; attribution?: Record<string, unknown> },
) {
  const resolved = await getGrowthChatbotByTenantSlug(tenantSlug);
  if (!resolved) throw new Error("Growth chatbot is not available for this tenant");

  return startGrowthChatSession({
    tenantId: resolved.tenant.id,
    workspaceId: resolved.workspaceId,
    sourcePage: input.sourcePage,
    attribution: input.attribution,
  });
}

export async function submitPublicGrowthChatReply(
  tenantSlug: string,
  sessionId: string,
  message: string,
) {
  const resolved = await getGrowthChatbotByTenantSlug(tenantSlug);
  if (!resolved) throw new Error("Growth chatbot is not available for this tenant");

  return submitGrowthChatReply({
    tenantId: resolved.tenant.id,
    workspaceId: resolved.workspaceId,
    sessionId,
    message,
  });
}

export async function getPublicGrowthChatSession(tenantSlug: string, sessionId: string) {
  const resolved = await getGrowthChatbotByTenantSlug(tenantSlug);
  if (!resolved) return null;
  return getGrowthChatSession(resolved.tenant.id, resolved.workspaceId, sessionId);
}
