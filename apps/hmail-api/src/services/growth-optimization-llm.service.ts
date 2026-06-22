import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";
import type { OptimizationInsightDraft } from "./growth-optimization.service.js";
import { callGrowthLlmJson, isGrowthLlmConfigured } from "./growth-llm-core.service.js";
import { sendPlatformEmail } from "./platform-email.service.js";
import { getGrowthSettings } from "./growth-settings.service.js";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseAiInsights(raw: unknown): OptimizationInsightDraft[] {
  if (!Array.isArray(raw)) return [];
  const drafts: OptimizationInsightDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const summary = typeof row.summary === "string" ? row.summary.trim() : "";
    if (!title || !summary) continue;
    const priority = row.priority === "high" || row.priority === "low" ? row.priority : "medium";
    drafts.push({
      category: typeof row.category === "string" ? row.category : "ai",
      priority,
      title,
      summary,
      actionLabel: typeof row.actionLabel === "string" ? row.actionLabel : undefined,
      actionTarget: typeof row.actionTarget === "string" ? row.actionTarget : undefined,
      metrics: { source: "ai" },
    });
  }
  return drafts.slice(0, 8);
}

export async function generateAiOptimizationInsights(input: {
  tenantId: string;
  workspaceId: string;
  ruleDrafts: OptimizationInsightDraft[];
  analyticsJson: Record<string, unknown>;
  planJson: Record<string, unknown>;
  contentStats: { publishedCount: number; blogCount: number };
}): Promise<{ insights: OptimizationInsightDraft[]; weeklyBrief: string | null }> {
  if (!(await isGrowthLlmConfigured())) {
    return { insights: [], weeklyBrief: null };
  }

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);

  const parsed = await callGrowthLlmJson({
    system: `You are a growth marketing optimizer for small businesses. Return JSON only:
{
  "weeklyBrief": "markdown string — 3-5 bullet executive summary for the owner",
  "insights": [
    {
      "category": "conversion|traffic|content|plan|automation|ads|seo",
      "priority": "high|medium|low",
      "title": "short action title",
      "summary": "specific recommendation with numbers when possible",
      "actionLabel": "button label",
      "actionTarget": "/growth/studio|/growth/analytics|/growth/channels|/growth/ads-seo|/growth/chatbot|/growth/settings"
    }
  ]
}
Include concrete actions like "Pause underperforming Google campaign", "Publish blog on {topic}", "Add UTM to email signature", "Shift budget from Meta to search". Max 6 insights.`,
    user: `Business: ${business}
Industry: ${profile.step1?.industry ?? "local services"}
Service area: ${profile.step1?.serviceArea ?? ""}

Analytics (last 30 days):
${JSON.stringify(input.analyticsJson, null, 2)}

Plan & usage:
${JSON.stringify(input.planJson, null, 2)}

Content: ${input.contentStats.publishedCount} published pages, ${input.contentStats.blogCount} blog drafts.

Existing rule-based insights (enhance, don't duplicate verbatim):
${JSON.stringify(input.ruleDrafts.slice(0, 5), null, 2)}`,
  });

  if (!parsed) return { insights: [], weeklyBrief: null };

  const weeklyBrief = typeof parsed.weeklyBrief === "string" ? parsed.weeklyBrief.trim() : null;
  const insights = parseAiInsights(parsed.insights);
  return { insights, weeklyBrief };
}

export async function storeWeeklyBrief(input: {
  tenantId: string;
  workspaceId: string;
  briefMarkdown: string;
  insightCount: number;
}) {
  const weekStart = startOfWeek(new Date());
  return prisma.growthWeeklyBrief.upsert({
    where: {
      workspaceId_weekStart: { workspaceId: input.workspaceId, weekStart },
    },
    create: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      weekStart,
      briefMarkdown: input.briefMarkdown,
      insightCount: input.insightCount,
    },
    update: {
      briefMarkdown: input.briefMarkdown,
      insightCount: input.insightCount,
    },
  });
}

export async function getLatestWeeklyBrief(workspaceId: string) {
  const row = await prisma.growthWeeklyBrief.findFirst({
    where: { workspaceId },
    orderBy: { weekStart: "desc" },
  });
  if (!row) return null;
  return {
    id: row.id,
    weekStart: row.weekStart.toISOString(),
    briefMarkdown: row.briefMarkdown,
    insightCount: row.insightCount,
    emailedAt: row.emailedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function resolveNotifyEmail(tenantId: string, workspaceId: string): Promise<string | null> {
  const settings = await getGrowthSettings(tenantId, workspaceId);
  if (settings?.notifyEmail) return settings.notifyEmail;
  const owner = await prisma.growthTeamMember.findFirst({
    where: { tenantId, workspaceId, role: "owner" },
  });
  return owner?.email ?? null;
}

export async function emailWeeklyBriefIfDue(input: {
  tenantId: string;
  workspaceId: string;
  force?: boolean;
}): Promise<boolean> {
  const brief = await getLatestWeeklyBrief(input.workspaceId);
  if (!brief) return false;
  if (!input.force && brief.emailedAt) {
    const emailed = new Date(brief.emailedAt);
    if (Date.now() - emailed.getTime() < 6 * 24 * 60 * 60 * 1000) return false;
  }

  const to = await resolveNotifyEmail(input.tenantId, input.workspaceId);
  if (!to) return false;

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);

  await sendPlatformEmail({
    to,
    subject: `[Prohost Growth] Weekly optimization brief — ${business}`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;max-width:640px">
<h2>Weekly growth brief</h2>
<div>${brief.briefMarkdown.replace(/\n/g, "<br>").replace(/^- /gm, "• ")}</div>
<p style="margin-top:1.25rem"><a href="${process.env.GROWTH_PANEL_URL ?? "http://localhost:5174"}/growth/optimization">Open optimization loop →</a></p>
</div>`,
    text: brief.briefMarkdown,
    templateSlug: "growth_weekly_brief",
  });

  await prisma.growthWeeklyBrief.update({
    where: { id: brief.id },
    data: { emailedAt: new Date() },
  });
  return true;
}

export async function runWeeklyBriefsForAllWorkspaces(): Promise<number> {
  const workspaces = await prisma.growthWorkspace.findMany({
    where: { status: "channels_ready" },
    select: { tenantId: true, id: true },
  });
  let sent = 0;
  for (const ws of workspaces) {
    const ok = await emailWeeklyBriefIfDue({ tenantId: ws.tenantId, workspaceId: ws.id });
    if (ok) sent += 1;
  }
  return sent;
}
