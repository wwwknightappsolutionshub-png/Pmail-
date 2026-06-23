import { extractJsonObject } from "./growth-llm-core.service.js";
import { callMarketingAi, getMarketingConfig } from "./marketing-ai.service.js";

export class JobHunterLlmUnavailableError extends Error {
  constructor() {
    super("Job Hunter AI is not configured. Set MARKETING_AI_API_KEY or OPENAI_API_KEY.");
    this.name = "JobHunterLlmUnavailableError";
  }
}

export async function isJobHunterLlmConfigured(): Promise<boolean> {
  if (process.env.JOB_HUNTER_USE_LLM === "false") return false;
  const config = await getMarketingConfig();
  if (config.hasApiKey) return true;
  return Boolean(
    process.env.MARKETING_AI_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

export async function callJobHunterLlmJson(input: {
  system: string;
  user: string;
}): Promise<Record<string, unknown>> {
  if (!(await isJobHunterLlmConfigured())) {
    throw new JobHunterLlmUnavailableError();
  }

  const raw = await callMarketingAi({
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  });

  const parsed = extractJsonObject(raw);
  if (!parsed) {
    throw new Error("Job Hunter AI returned invalid JSON");
  }

  return parsed;
}
