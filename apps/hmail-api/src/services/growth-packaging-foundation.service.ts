import { prisma } from "../lib/prisma.js";
import { GROWTH_ADDON_SLUG } from "../growth/plan-types.js";
import { seedAddonCatalog, tenantHasAddonAccess } from "./addon.service.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import {
  ensureGrowthOwnerMember,
  ensureGrowthWorkspaceSettings,
  listGrowthTeamMembers,
} from "./growth-settings.service.js";

async function ensureGrowthAddonTrial(tenantId: string, notifyEmail: string | null) {
  await seedAddonCatalog();
  const hasAccess = await tenantHasAddonAccess(tenantId, GROWTH_ADDON_SLUG);
  if (hasAccess) return;

  const addon = await prisma.addon.findFirst({ where: { slug: GROWTH_ADDON_SLUG, isActive: true } });
  if (!addon) return;

  const existingTrial = await prisma.tenantAddonTrial.findUnique({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
  });
  if (existingTrial) return;

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 7);

  await prisma.tenantAddonTrial.create({
    data: {
      tenantId,
      addonId: addon.id,
      endsAt,
      status: "active",
    },
  });

  void notifyEmail;
}

/** Mark workspace packaging-ready: settings, team, addon trial, final status. */
export async function ensureGrowthPackagingFoundation(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId?: string;
}) {
  const workspace = await prisma.growthWorkspace.findUnique({ where: { id: input.workspaceId } });
  if (!workspace) throw new Error("Growth workspace not found");

  const settings = await ensureGrowthWorkspaceSettings({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostingAccountId: input.hostingAccountId ?? workspace.hostingAccountId ?? undefined,
  });

  await ensureGrowthOwnerMember({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostingAccountId: input.hostingAccountId ?? workspace.hostingAccountId ?? undefined,
  });

  await ensureGrowthAddonTrial(input.tenantId, settings.notifyEmail);

  const team = await listGrowthTeamMembers(input.tenantId, input.workspaceId);

  if (workspace.status !== "packaging_ready") {
    await setWorkspaceStatus(input.workspaceId, "packaging_ready");
  }

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "packaging.foundation_ready",
    entityType: "growth_workspace",
    entityId: input.workspaceId,
    metadata: { planSlug: settings.planSlug, teamCount: team.length },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "packaging.foundation_ready",
    payload: { planSlug: settings.planSlug, teamCount: team.length },
  });

  return { workspaceStatus: "packaging_ready" as const, settings, team };
}
