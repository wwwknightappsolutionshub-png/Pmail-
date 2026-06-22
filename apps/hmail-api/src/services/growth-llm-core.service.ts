import { callMarketingAi, getMarketingConfig } from "./marketing-ai.service.js";

export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fence?.[1]?.trim(), trimmed].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // continue
    }
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export function extractJsonArray(text: string): unknown[] | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function isGrowthLlmConfigured(): Promise<boolean> {
  if (process.env.GROWTH_USE_LLM === "false") return false;
  const config = await getMarketingConfig();
  if (config.hasApiKey) return true;
  return Boolean(
    process.env.MARKETING_AI_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

export async function callGrowthLlmJson(input: {
  system: string;
  user: string;
}): Promise<Record<string, unknown> | null> {
  if (!(await isGrowthLlmConfigured())) return null;
  try {
    const raw = await callMarketingAi({
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });
    return extractJsonObject(raw);
  } catch {
    return null;
  }
}

export async function callGrowthLlmText(input: {
  system: string;
  user: string;
}): Promise<string | null> {
  if (!(await isGrowthLlmConfigured())) return null;
  try {
    const raw = await callMarketingAi({
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });
    return raw.trim() || null;
  } catch {
    return null;
  }
}
