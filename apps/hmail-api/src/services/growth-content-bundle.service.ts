import { randomUUID } from "node:crypto";
import { buildContentDrafts } from "../growth/content-bundle-builder.js";
import { loadGrowthWizardProfile } from "../growth/wizard-profile.js";
import { resolveWebsiteSnapshotForProfile } from "../growth/website-snapshot.js";
import { prisma } from "../lib/prisma.js";
import { enhanceContentDraftsWithLlm } from "./growth-content-llm.service.js";
import { ensureGrowthAdsSeoFoundation } from "./growth-ads-seo.service.js";
import { ensureGrowthCaptureFoundation } from "./growth-capture-foundation.service.js";
import { ensureGrowthChatbotFoundation } from "./growth-chatbot-foundation.service.js";
import { ensureGrowthAnalyticsFoundation } from "./growth-analytics-foundation.service.js";
import { ensureGrowthAutomationsFoundation } from "./growth-automations-foundation.service.js";
import { ensureGrowthPackagingFoundation } from "./growth-packaging-foundation.service.js";
import { ensureGrowthOptimizationFoundation } from "./growth-optimization-foundation.service.js";
import { ensureGrowthChannelsFoundation } from "./growth-channels-foundation.service.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";

export async function generateDayOneContentBundle(input: {
  tenantId: string;
  workspaceId: string;
}) {
  const profile = await loadGrowthWizardProfile(input.workspaceId);
  if (!profile.step1?.businessName) {
    throw new Error("Wizard step 1 must be completed before generating content");
  }

  await setWorkspaceStatus(input.workspaceId, "content_generating");

  const websiteUrl = profile.step1.website?.trim() ?? "";
  const snapshot = await resolveWebsiteSnapshotForProfile(profile);

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "content_bundle.started",
    payload: {
      contentMode: websiteUrl ? "existing_site" : "greenfield",
      websiteUrl: websiteUrl || null,
      websiteAnalyzed: snapshot?.fetched ?? false,
    },
  });

  await prisma.growthContentAsset.deleteMany({ where: { workspaceId: input.workspaceId } });

  const templateDrafts = buildContentDrafts(profile, snapshot);
  const drafts = await enhanceContentDraftsWithLlm(profile, templateDrafts);
  const created = [];

  for (const draft of drafts) {
    const row = await prisma.growthContentAsset.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        assetType: draft.assetType,
        title: draft.title,
        slug: draft.slug,
        bodyJson: JSON.stringify(draft.body),
        sortOrder: draft.sortOrder,
      },
    });
    created.push(formatContentAsset(row));
  }

  await setWorkspaceStatus(input.workspaceId, "content_ready");

  await ensureGrowthCaptureFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthChatbotFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthAnalyticsFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthAutomationsFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthPackagingFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    hostingAccountId:
      (
        await prisma.growthWorkspace.findUnique({
          where: { id: input.workspaceId },
          select: { hostingAccountId: true },
        })
      )?.hostingAccountId ?? undefined,
  });

  await ensureGrowthOptimizationFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthChannelsFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await ensureGrowthAdsSeoFoundation({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "content_bundle.generated",
    entityType: "growth_content_bundle",
    entityId: input.workspaceId,
    metadata: {
      assetCount: created.length,
      contentMode: websiteUrl ? "existing_site" : "greenfield",
      websiteAnalyzed: snapshot?.fetched ?? false,
    },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "content_bundle.completed",
    payload: {
      assetCount: created.length,
      contentMode: websiteUrl ? "existing_site" : "greenfield",
    },
  });

  return {
    assetCount: created.length,
    assets: created,
  };
}

export async function listGrowthContentAssets(tenantId: string, workspaceId: string, assetType?: string) {
  const rows = await prisma.growthContentAsset.findMany({
    where: {
      tenantId,
      workspaceId,
      ...(assetType ? { assetType } : {}),
    },
    orderBy: [{ assetType: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(formatContentAsset);
}

export async function getGrowthContentAsset(tenantId: string, workspaceId: string, assetId: string) {
  const row = await prisma.growthContentAsset.findFirst({
    where: { id: assetId, tenantId, workspaceId },
  });
  if (!row) return null;
  return formatContentAsset(row);
}

export async function getGrowthContentBundleSummary(tenantId: string, workspaceId: string) {
  const rows = await prisma.growthContentAsset.findMany({
    where: { tenantId, workspaceId },
    select: { assetType: true, bodyJson: true },
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.assetType] = (counts[row.assetType] ?? 0) + 1;
  }

  const summaryAsset = rows.find((row) => row.assetType === "bundle_summary");
  let contentMode: "greenfield" | "existing_site" | null = null;
  if (summaryAsset) {
    try {
      const body = JSON.parse(summaryAsset.bodyJson) as { contentMode?: string };
      if (body.contentMode === "greenfield" || body.contentMode === "existing_site") {
        contentMode = body.contentMode;
      }
    } catch {
      contentMode = null;
    }
  }

  return {
    totalAssets: rows.length,
    counts,
    hasBundle: rows.length > 0,
    contentMode,
  };
}

function formatContentAsset(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  assetType: string;
  title: string;
  slug: string | null;
  bodyJson: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    assetType: row.assetType,
    title: row.title,
    slug: row.slug,
    body: JSON.parse(row.bodyJson) as Record<string, unknown>,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
