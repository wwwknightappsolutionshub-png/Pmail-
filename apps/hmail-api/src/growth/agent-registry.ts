/** Registered Growth AI agents — orchestration skeleton (Phase A). */

export const GROWTH_AGENT_KEYS = [
  "market_research",
  "competitor_intelligence",
  "customer_psychology",
  "offer_engineering",
  "positioning",
] as const;

export type GrowthAgentKey = (typeof GROWTH_AGENT_KEYS)[number];

export type GrowthAgentDefinition = {
  key: GrowthAgentKey;
  label: string;
  description: string;
  outputMemoryKey: string;
  order: number;
};

export const GROWTH_AGENT_REGISTRY: GrowthAgentDefinition[] = [
  {
    key: "market_research",
    label: "Market Research Agent",
    description: "Industry analysis, TAM estimation, local market and trend analysis.",
    outputMemoryKey: "agent.market_research",
    order: 1,
  },
  {
    key: "competitor_intelligence",
    label: "Competitor Intelligence Agent",
    description: "Competitor messaging, pricing, offers, positioning gaps.",
    outputMemoryKey: "agent.competitor_intelligence",
    order: 2,
  },
  {
    key: "customer_psychology",
    label: "Customer Psychology Agent",
    description: "Personas, pain points, desires, fears, objections, messaging framework.",
    outputMemoryKey: "agent.customer_psychology",
    order: 3,
  },
  {
    key: "offer_engineering",
    label: "Offer Engineering Agent",
    description: "Offer stack, guarantees, bonuses, perceived value.",
    outputMemoryKey: "agent.offer_engineering",
    order: 4,
  },
  {
    key: "positioning",
    label: "Positioning Agent",
    description: "UVP, differentiators, brand narrative.",
    outputMemoryKey: "agent.positioning",
    order: 5,
  },
];

export function getGrowthAgentDefinition(key: string): GrowthAgentDefinition | undefined {
  return GROWTH_AGENT_REGISTRY.find((agent) => agent.key === key);
}

export function isGrowthAgentKey(key: string): key is GrowthAgentKey {
  return (GROWTH_AGENT_KEYS as readonly string[]).includes(key);
}

/** Empty output schemas agents populate in Phase B; Phase A validates structure only. */
export function skeletonAgentOutput(agentKey: GrowthAgentKey): Record<string, unknown> {
  switch (agentKey) {
    case "market_research":
      return { marketOpportunities: [], threats: [], growthAreas: [] };
    case "competitor_intelligence":
      return { competitorReport: [], positioningGaps: [], opportunityScore: null };
    case "customer_psychology":
      return { buyerPersonas: [], messagingFramework: { headlines: [], proofPoints: [] } };
    case "offer_engineering":
      return { offerStack: { mainOffer: null, bonuses: [], guarantees: [] } };
    case "positioning":
      return { uvp: null, differentiators: [], brandNarrative: null };
    default:
      return {};
  }
}
