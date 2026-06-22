import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { isGrowthPlanSlug, isGrowthTeamRole, type GrowthTeamRole } from "../growth/plan-types.js";
import { assertPanelOwnerPlanSlugChange } from "./growth-plan.service.js";
import { loadGrowthWizardProfile, wizardBusinessName } from "../growth/wizard-profile.js";
import { sendPlatformEmail } from "./platform-email.service.js";

export class GrowthSettingsError extends Error {
  code: "forbidden" | "not_found" | "invalid";

  constructor(message: string, code: "forbidden" | "not_found" | "invalid") {
    super(message);
    this.name = "GrowthSettingsError";
    this.code = code;
  }
}

function parseSettingsJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatSettings(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  planSlug: string;
  planTierOverride?: boolean;
  notifyEmail: string | null;
  settingsJson: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    planSlug: row.planSlug,
    planTierOverride: row.planTierOverride ?? false,
    notifyEmail: row.notifyEmail,
    settings: parseSettingsJson(row.settingsJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function formatTeamMember(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  role: string;
  hostingAccountId: string | null;
  invitedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role as GrowthTeamRole,
    hostingAccountId: row.hostingAccountId,
    invitedAt: row.invitedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureGrowthWorkspaceSettings(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId?: string;
}) {
  let settings = await prisma.growthWorkspaceSettings.findUnique({
    where: { workspaceId: input.workspaceId },
  });

  if (!settings) {
    let notifyEmail: string | null = null;
    if (input.hostingAccountId) {
      const account = await prisma.hostingAccount.findUnique({
        where: { id: input.hostingAccountId },
        select: { username: true, domain: true },
      });
      if (account?.username && account.domain) {
        notifyEmail = `${account.username}@${account.domain}`;
      }
    }

    settings = await prisma.growthWorkspaceSettings.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        notifyEmail,
      },
    });
  }

  return formatSettings(settings);
}

export async function getGrowthSettings(tenantId: string, workspaceId: string) {
  const settings = await prisma.growthWorkspaceSettings.findFirst({
    where: { tenantId, workspaceId },
  });
  if (!settings) return null;
  return formatSettings(settings);
}

export async function updateGrowthSettings(
  tenantId: string,
  workspaceId: string,
  input: {
    notifyEmail?: string | null;
    planSlug?: string;
    settings?: Record<string, unknown>;
  },
) {
  const existing = await prisma.growthWorkspaceSettings.findFirst({
    where: { tenantId, workspaceId },
  });
  if (!existing) throw new GrowthSettingsError("Settings not found", "not_found");

  assertPanelOwnerPlanSlugChange(input.planSlug);

  if (input.planSlug !== undefined && !isGrowthPlanSlug(input.planSlug)) {
    throw new GrowthSettingsError("Invalid plan slug", "invalid");
  }

  const mergedSettings =
    input.settings !== undefined
      ? { ...parseSettingsJson(existing.settingsJson), ...input.settings }
      : parseSettingsJson(existing.settingsJson);

  const row = await prisma.growthWorkspaceSettings.update({
    where: { id: existing.id },
    data: {
      ...(input.notifyEmail !== undefined
        ? { notifyEmail: input.notifyEmail?.trim().toLowerCase() || null }
        : {}),
      ...(input.planSlug !== undefined ? { planSlug: input.planSlug } : {}),
      ...(input.settings !== undefined ? { settingsJson: JSON.stringify(mergedSettings) } : {}),
    },
  });

  return formatSettings(row);
}

async function hostingAccountNotifyFallback(tenantId: string): Promise<string | null> {
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

export async function resolveGrowthNotifyEmail(tenantId: string, workspaceId: string): Promise<string | null> {
  const settings = await prisma.growthWorkspaceSettings.findFirst({
    where: { tenantId, workspaceId },
    select: { notifyEmail: true },
  });
  if (settings?.notifyEmail?.trim()) return settings.notifyEmail.trim();
  return hostingAccountNotifyFallback(tenantId);
}

export async function ensureGrowthOwnerMember(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId?: string;
}) {
  if (!input.hostingAccountId) return null;

  const account = await prisma.hostingAccount.findUnique({
    where: { id: input.hostingAccountId },
    select: { username: true, domain: true },
  });
  if (!account?.username || !account.domain) return null;

  const email = `${account.username}@${account.domain}`.toLowerCase();

  const row = await prisma.growthTeamMember.upsert({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
    create: {
      id: randomUUID(),
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      email,
      role: "owner",
      hostingAccountId: input.hostingAccountId,
    },
    update: {
      role: "owner",
      hostingAccountId: input.hostingAccountId,
    },
  });

  return formatTeamMember(row);
}

export async function listGrowthTeamMembers(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthTeamMember.findMany({
    where: { tenantId, workspaceId },
    orderBy: [{ role: "asc" }, { invitedAt: "asc" }],
  });
  return rows.map(formatTeamMember);
}

export async function resolveGrowthTeamRole(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId: string;
}): Promise<GrowthTeamRole | null> {
  const account = await prisma.hostingAccount.findUnique({
    where: { id: input.hostingAccountId },
    select: { username: true, domain: true },
  });
  if (!account?.username || !account.domain) return null;

  const email = `${account.username}@${account.domain}`.toLowerCase();
  const member = await prisma.growthTeamMember.findUnique({
    where: { workspaceId_email: { workspaceId: input.workspaceId, email } },
  });
  if (!member || !isGrowthTeamRole(member.role)) return null;
  return member.role;
}

export async function assertGrowthOwner(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId: string;
}) {
  const role = await resolveGrowthTeamRole(input);
  if (role !== "owner") {
    throw new GrowthSettingsError("Owner role required for this action", "forbidden");
  }
}

export async function inviteGrowthTeamMember(
  tenantId: string,
  workspaceId: string,
  input: { email: string; role?: GrowthTeamRole },
) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new GrowthSettingsError("Valid email required", "invalid");

  const role = input.role ?? "marketer";
  if (!isGrowthTeamRole(role) || role === "owner") {
    throw new GrowthSettingsError("Only marketer role can be invited", "invalid");
  }

  const row = await prisma.growthTeamMember.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: {
      id: randomUUID(),
      tenantId,
      workspaceId,
      email,
      role,
    },
    update: { role },
  });

  void sendGrowthTeamInviteEmail({ workspaceId, email, businessName: await resolveBusinessName(workspaceId) }).catch(
    (err) => {
      console.warn("[growth-team-invite]", err instanceof Error ? err.message : err);
    },
  );

  return formatTeamMember(row);
}

async function resolveBusinessName(workspaceId: string): Promise<string> {
  try {
    const profile = await loadGrowthWizardProfile(workspaceId);
    return wizardBusinessName(profile);
  } catch {
    return "your business";
  }
}

async function sendGrowthTeamInviteEmail(input: {
  workspaceId: string;
  email: string;
  businessName: string;
}) {
  const panelBase = process.env.GROWTH_PANEL_URL?.trim() || "http://localhost:5174";
  const loginUrl = `${panelBase}/panel/login?return=${encodeURIComponent("/growth/dashboard")}`;

  await sendPlatformEmail({
    to: input.email,
    subject: `You're invited to ${input.businessName} on Prohost Growth`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">
      <p>You've been invited as a <strong>marketer</strong> on the Prohost Growth workspace for <strong>${input.businessName}</strong>.</p>
      <p>Marketers can use the content studio, pipeline, chatbot, analytics, and automations. Billing and team settings remain with the workspace owner.</p>
      <p><a href="${loginUrl}">Sign in to Prohost Growth</a></p>
    </div>`,
    text: `You've been invited as a marketer on Prohost Growth for ${input.businessName}. Sign in: ${loginUrl}`,
  });
}

export async function removeGrowthTeamMember(
  tenantId: string,
  workspaceId: string,
  memberId: string,
) {
  const member = await prisma.growthTeamMember.findFirst({
    where: { id: memberId, tenantId, workspaceId },
  });
  if (!member) throw new GrowthSettingsError("Team member not found", "not_found");
  if (member.role === "owner") {
    throw new GrowthSettingsError("Cannot remove workspace owner", "forbidden");
  }

  await prisma.growthTeamMember.delete({ where: { id: memberId } });
}
