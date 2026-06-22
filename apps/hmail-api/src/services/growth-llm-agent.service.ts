import type { GrowthAgentKey } from "../growth/agent-registry.js";
import { generateAgentOutput } from "../growth/agent-output-generator.js";
import type { GrowthWizardProfile } from "../growth/wizard-profile.js";
import type { WebsiteSnapshot } from "../growth/website-snapshot.js";
import { callGrowthLlmJson, isGrowthLlmConfigured } from "./growth-llm-core.service.js";

const AGENT_JSON_HINT: Record<GrowthAgentKey, string> = {
  market_research: `Return JSON with keys: marketOpportunities (string[]), threats (string[]), growthAreas (string[]), summary (string).`,
  competitor_intelligence: `Return JSON with keys: competitorReport (array of {name, url, observedStrength, observedWeakness}), positioningGaps (string[]), opportunityScore (number 0-100).`,
  customer_psychology: `Return JSON with keys: buyerPersonas (array of {name, demographics, painPoints[], desiredOutcomes[], objections[]}), messagingFramework ({tone, headlines[], proofPoints[]}).`,
  offer_engineering: `Return JSON with keys: offerStack ({mainOffer, upsells[], freeConsultation, discounts, guarantees, bonuses[], perceivedValueNotes[]}).`,
  positioning: `Return JSON with keys: uvp (string), differentiators (string[]), brandNarrative (string).`,
};

export { isGrowthLlmConfigured } from "./growth-llm-core.service.js";

export async function resolveGrowthAgentOutput(input: {
  agentKey: GrowthAgentKey;
  profile: GrowthWizardProfile;
  websiteSnapshot?: WebsiteSnapshot | null;
  renderedPrompt: string;
  wizardContextJson?: string;
}): Promise<{ output: Record<string, unknown>; generationMode: "llm" | "template" }> {
  const templateOutput = generateAgentOutput(
    input.agentKey,
    input.profile,
    input.websiteSnapshot ?? null,
  );

  if (!(await isGrowthLlmConfigured())) {
    return { output: { ...templateOutput, generationMode: "template" }, generationMode: "template" };
  }

  const parsed = await callGrowthLlmJson({
    system: `You are a Prohost Growth marketing agent. Respond with valid JSON only.
${AGENT_JSON_HINT[input.agentKey]}
Use the business wizard data provided. Be specific to their industry and service area.`,
    user: `${input.renderedPrompt}

Wizard context:
${input.wizardContextJson ?? "{}"}`,
  });

  if (!parsed) {
    return {
      output: { ...templateOutput, generationMode: "template", llmFallbackReason: "invalid_json" },
      generationMode: "template",
    };
  }

  return {
    output: {
      ...templateOutput,
      ...parsed,
      agentKey: input.agentKey,
      orchestrationPhase: "I",
      generationMode: "llm",
    },
    generationMode: "llm",
  };
}
