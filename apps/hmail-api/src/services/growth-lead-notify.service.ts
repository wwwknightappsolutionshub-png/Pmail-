import { prisma } from "../lib/prisma.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";
import { resolveGrowthNotifyEmail } from "./growth-settings.service.js";
import { notifyInternalAddress } from "./platform-email.service.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolve where to send new-lead alerts for a Growth workspace. */
export async function resolveGrowthLeadNotifyEmail(tenantId: string): Promise<string | null> {
  const override = process.env.GROWTH_LEAD_NOTIFY_EMAIL?.trim();
  if (override) return override;

  const workspace = await prisma.growthWorkspace.findUnique({
    where: { tenantId },
    select: { hostingAccountId: true },
  });

  if (workspace?.hostingAccountId) {
    const account = await prisma.hostingAccount.findUnique({
      where: { id: workspace.hostingAccountId },
      select: { username: true, domain: true },
    });
    if (account?.username && account.domain) {
      return `${account.username}@${account.domain}`;
    }
  }

  const fallbackAccount = await prisma.hostingAccount.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: { username: true, domain: true },
  });
  if (fallbackAccount?.username && fallbackAccount.domain) {
    return `${fallbackAccount.username}@${fallbackAccount.domain}`;
  }

  return null;
}

export async function notifyNewGrowthLead(input: {
  tenantId: string;
  workspaceId: string;
  lead: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    company: string | null;
    message: string | null;
    source: string;
    sourcePage: string | null;
    score: number;
    stageSlug: string;
  };
}): Promise<void> {
  if (input.lead.source === "manual") return;

  const to = await resolveGrowthNotifyEmail(input.tenantId, input.workspaceId);
  if (!to) return;

  const profile = await loadGrowthWizardProfile(input.workspaceId);
  const business = wizardBusinessName(profile);
  const panelUrl = process.env.GROWTH_PANEL_URL?.trim() || "http://localhost:5174/growth/pipeline";

  const lines = [
    `<p><strong>${escapeHtml(input.lead.fullName)}</strong> just submitted your Growth capture form.</p>`,
    `<ul>`,
    `<li>Email: ${escapeHtml(input.lead.email)}</li>`,
    input.lead.phone ? `<li>Phone: ${escapeHtml(input.lead.phone)}</li>` : "",
    input.lead.company ? `<li>Company: ${escapeHtml(input.lead.company)}</li>` : "",
    `<li>Score: ${input.lead.score}</li>`,
    `<li>Stage: ${escapeHtml(input.lead.stageSlug)}</li>`,
    `<li>Source: ${escapeHtml(input.lead.source)}${input.lead.sourcePage ? ` · ${escapeHtml(input.lead.sourcePage)}` : ""}</li>`,
    `</ul>`,
    input.lead.message
      ? `<p><strong>Message</strong><br>${escapeHtml(input.lead.message).replace(/\n/g, "<br>")}</p>`
      : "",
    `<p><a href="${escapeHtml(panelUrl)}">Open lead pipeline</a></p>`,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyInternalAddress(
    to,
    `New Growth lead — ${business}`,
    `<div style="font-family:system-ui,sans-serif;line-height:1.5">${lines}</div>`,
  );
}

/** Fire-and-forget wrapper so lead capture never fails on email errors. */
export function queueGrowthLeadNotification(input: Parameters<typeof notifyNewGrowthLead>[0]): void {
  void notifyNewGrowthLead(input).catch((err) => {
    console.warn("[growth-lead-notify]", err instanceof Error ? err.message : err);
  });
}
