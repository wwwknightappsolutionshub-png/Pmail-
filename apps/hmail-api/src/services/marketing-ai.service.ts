import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";

export type AiProvider = "openai" | "anthropic" | "google" | "custom";

export type MarketingConfigPayload = {
  aiProvider: AiProvider;
  aiModel: string | null;
  hasApiKey: boolean;
  aiBaseUrl: string | null;
  settings: Record<string, unknown>;
  updatedAt: string;
};

function defaultModel(provider: AiProvider): string {
  switch (provider) {
    case "anthropic":
      return "claude-3-5-sonnet-20241022";
    case "google":
      return "gemini-1.5-pro";
    case "custom":
      return "default";
    default:
      return "gpt-4o-mini";
  }
}

function providerEndpoint(provider: AiProvider, baseUrl: string | null): string {
  if (baseUrl?.trim()) return baseUrl.trim();
  switch (provider) {
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta/models";
    default:
      return "https://api.openai.com/v1/chat/completions";
  }
}

export async function getMarketingConfig(): Promise<MarketingConfigPayload> {
  let row = await prisma.marketingPlatformConfig.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.marketingPlatformConfig.create({
      data: { id: "default", aiProvider: "openai", aiModel: defaultModel("openai") },
    });
  }
  let settings: Record<string, unknown> = {};
  if (row.settingsJson) {
    try {
      settings = JSON.parse(row.settingsJson) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }
  return {
    aiProvider: row.aiProvider as AiProvider,
    aiModel: row.aiModel,
    hasApiKey: Boolean(row.aiApiKeyEnc),
    aiBaseUrl: row.aiBaseUrl,
    settings,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateMarketingConfig(input: {
  aiProvider?: AiProvider;
  aiModel?: string | null;
  aiApiKey?: string | null;
  aiBaseUrl?: string | null;
  settings?: Record<string, unknown>;
}) {
  const current = await prisma.marketingPlatformConfig.findUnique({ where: { id: "default" } });
  const provider = input.aiProvider ?? (current?.aiProvider as AiProvider) ?? "openai";

  await prisma.marketingPlatformConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      aiProvider: provider,
      aiModel: input.aiModel ?? defaultModel(provider),
      aiApiKeyEnc: input.aiApiKey ? encryptSecret(input.aiApiKey) : null,
      aiBaseUrl: input.aiBaseUrl ?? null,
      settingsJson: input.settings ? JSON.stringify(input.settings) : null,
    },
    update: {
      ...(input.aiProvider !== undefined ? { aiProvider: input.aiProvider } : {}),
      ...(input.aiModel !== undefined ? { aiModel: input.aiModel } : {}),
      ...(input.aiApiKey !== undefined
        ? { aiApiKeyEnc: input.aiApiKey ? encryptSecret(input.aiApiKey) : null }
        : {}),
      ...(input.aiBaseUrl !== undefined ? { aiBaseUrl: input.aiBaseUrl } : {}),
      ...(input.settings !== undefined ? { settingsJson: JSON.stringify(input.settings) } : {}),
    },
  });

  return getMarketingConfig();
}

async function resolveApiKey(): Promise<string> {
  const row = await prisma.marketingPlatformConfig.findUnique({ where: { id: "default" } });
  if (row?.aiApiKeyEnc) return decryptSecret(row.aiApiKeyEnc);
  const envKey =
    process.env.MARKETING_AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim();
  if (!envKey) throw new Error("Marketing AI API key is not configured");
  return envKey;
}

export async function callMarketingAi(input: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}): Promise<string> {
  const config = await getMarketingConfig();
  const apiKey = await resolveApiKey();
  const model = config.aiModel ?? defaultModel(config.aiProvider);
  const endpoint = providerEndpoint(config.aiProvider, config.aiBaseUrl);

  if (config.aiProvider === "anthropic") {
    const system = input.messages.find((m) => m.role === "system")?.content ?? "";
    const messages = input.messages.filter((m) => m.role !== "system");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? "";
  }

  if (config.aiProvider === "google") {
    const prompt = input.messages.map((m) => `${m.role}: ${m.content}`).join("\n\n");
    const url = `${endpoint}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) throw new Error(`Google AI API error: ${res.status}`);
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

const MARKETING_SYSTEM = `You are Prohost Cloud's enterprise marketing strategist. Help a novice super admin grow leads, SEO, Google Ads, and conversions for an enterprise hosting/mail platform. Be actionable, structured, and conservative with ad spend (recommendations only unless explicitly asked to draft copy). Use markdown headings and bullet lists.`;

export async function runMarketingAssistant(input: {
  adminId: string;
  sessionId?: string;
  prompt: string;
  context?: Record<string, unknown>;
}) {
  let session = input.sessionId
    ? await prisma.marketingAiSession.findUnique({ where: { id: input.sessionId } })
    : null;

  let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: MARKETING_SYSTEM },
  ];

  if (session) {
    try {
      const prior = JSON.parse(session.messagesJson) as Array<{ role: "user" | "assistant"; content: string }>;
      messages = [...messages, ...prior];
    } catch {
      // ignore
    }
  }

  const contextBlock = input.context ? `\n\nContext:\n${JSON.stringify(input.context, null, 2)}` : "";
  messages.push({ role: "user", content: input.prompt + contextBlock });

  const reply = await callMarketingAi({ messages: messages.filter((m) => m.role !== "assistant" || m.content) });

  const transcript = session
    ? (JSON.parse(session.messagesJson) as Array<{ role: string; content: string }>)
    : [];
  transcript.push({ role: "user", content: input.prompt });
  transcript.push({ role: "assistant", content: reply });

  const recommendations = extractRecommendations(reply);

  if (session) {
    session = await prisma.marketingAiSession.update({
      where: { id: session.id },
      data: {
        messagesJson: JSON.stringify(transcript),
        recommendationsJson: JSON.stringify(recommendations),
      },
    });
  } else {
    session = await prisma.marketingAiSession.create({
      data: {
        adminId: input.adminId,
        title: input.prompt.slice(0, 80),
        messagesJson: JSON.stringify(transcript),
        recommendationsJson: JSON.stringify(recommendations),
      },
    });
  }

  return {
    sessionId: session.id,
    title: session.title,
    reply,
    recommendations,
    updatedAt: session.updatedAt.toISOString(),
  };
}

function extractRecommendations(reply: string): string[] {
  return reply
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length > 10)
    .slice(0, 8);
}

export async function listMarketingSessions(adminId: string) {
  const rows = await prisma.marketingAiSession.findMany({
    where: { adminId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getMarketingSession(id: string) {
  const row = await prisma.marketingAiSession.findUnique({ where: { id } });
  if (!row) return null;
  let messages: Array<{ role: string; content: string }> = [];
  let recommendations: string[] = [];
  try {
    messages = JSON.parse(row.messagesJson) as Array<{ role: string; content: string }>;
  } catch {
    messages = [];
  }
  if (row.recommendationsJson) {
    try {
      recommendations = JSON.parse(row.recommendationsJson) as string[];
    } catch {
      recommendations = [];
    }
  }
  return {
    id: row.id,
    title: row.title,
    messages,
    recommendations,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteMarketingSession(id: string): Promise<void> {
  await prisma.marketingAiSession.delete({ where: { id } });
}

export async function getMarketingPlaybooks() {
  const overview = await import("./sales-pipeline.service.js").then((m) => m.getSalesPipelineOverview());
  return [
    {
      id: "seo-audit",
      title: "SEO landing audit",
      description: "Improve organic rankings for Prohost Cloud keywords.",
      prompt:
        "Run an SEO audit checklist for our enterprise hosting landing page. Cover meta titles, H1 structure, internal links, schema, page speed, and 10 target keywords for B2B hosting resellers.",
    },
    {
      id: "google-ads-starter",
      title: "Google Ads starter campaign",
      description: "Draft a novice-friendly Search campaign for membership signups.",
      prompt:
        "Create a Google Search Ads starter plan with campaign objective, 3 ad groups, 15 keywords, 3 responsive search ads, daily budget guidance, and conversion tracking steps. Target hosting agencies and SaaS teams.",
    },
    {
      id: "lead-nurture",
      title: "Lead nurture sequence",
      description: "Email drip from membership signup to paid deployment.",
      prompt:
        "Design a 5-email nurture sequence for membership applicants who received a sample panel. Include subject lines, goals, and CTAs aligned to Hosting Scale tiers.",
    },
    {
      id: "conversion-review",
      title: "Conversion rate review",
      description: "Analyze funnel metrics and recommend experiments.",
      prompt: `Review this funnel data and recommend 5 high-impact experiments:\n${JSON.stringify(overview, null, 2)}`,
    },
  ];
}
