import { GROWTH_AGENT_REGISTRY } from "../growth/agent-registry.js";
import { prisma } from "../lib/prisma.js";

const DEFAULT_PROMPTS: Record<string, string> = {
  market_research: `You are the Market Research Agent for {{businessName}} in {{industry}}.
Analyze industry trends, TAM, local market dynamics, opportunities, threats, and growth areas.
Return structured JSON with marketOpportunities, threats, growthAreas.`,
  competitor_intelligence: `You are the Competitor Intelligence Agent.
Analyze competitors: {{competitorNames}} and URLs {{competitorUrls}}.
Return competitorReport, positioningGaps, opportunityScore.`,
  customer_psychology: `You are the Customer Psychology Agent.
Ideal customer: {{idealCustomer}}. Problems: {{customerProblems}}.
Return buyerPersonas and messagingFramework.`,
  offer_engineering: `You are the Offer Engineering Agent.
Main offer: {{mainOffer}}. Improve guarantees, bonuses, perceived value.
Return offerStack.`,
  positioning: `You are the Positioning Agent for {{businessName}}.
Differentiators: {{whyDifferent}}. Return uvp, differentiators, brandNarrative.`,
};

export async function seedGrowthPromptTemplates(): Promise<void> {
  for (const agent of GROWTH_AGENT_REGISTRY) {
    const templateText = DEFAULT_PROMPTS[agent.key] ?? `Agent ${agent.key} prompt template.`;
    await prisma.growthPromptTemplate.upsert({
      where: {
        agentKey_version: { agentKey: agent.key, version: "1.0.0" },
      },
      create: {
        agentKey: agent.key,
        version: "1.0.0",
        templateText,
        isActive: true,
      },
      update: {
        templateText,
        isActive: true,
      },
    });
  }
}

export async function getActivePromptForAgent(agentKey: string) {
  const row = await prisma.growthPromptTemplate.findFirst({
    where: { agentKey, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return row;
}

export async function listGrowthPromptTemplates() {
  const rows = await prisma.growthPromptTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ agentKey: "asc" }, { version: "desc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    agentKey: row.agentKey,
    version: row.version,
    templateText: row.templateText,
    isActive: row.isActive,
  }));
}

export function renderPromptTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}
