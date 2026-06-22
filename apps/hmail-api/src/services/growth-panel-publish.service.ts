import { renderGrowthAssetHtml } from "../growth/content-html-renderer.js";
import { isGrowthContentAssetType } from "../growth/content-asset-types.js";
import { prisma } from "../lib/prisma.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";
import { getGrowthContentAsset, listGrowthContentAssets } from "./growth-content-bundle.service.js";
import { assertGrowthPublishCapacity } from "./growth-plan.service.js";
import { ensurePanelDefaults, upsertPanelFile } from "./panel-resources.service.js";

const PUBLISHABLE_TYPES = new Set(["homepage_copy", "blog_post", "landing_copy"]);

export async function publishGrowthAssetToPanel(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId: string;
  assetId: string;
}) {
  const asset = await getGrowthContentAsset(input.tenantId, input.workspaceId, input.assetId);
  if (!asset) throw new Error("Asset not found");
  if (!PUBLISHABLE_TYPES.has(asset.assetType)) {
    throw new Error(`Asset type "${asset.assetType}" cannot be published to the panel site`);
  }

  const existingPublish = (asset.body as { publish?: { publishedAt?: string } }).publish?.publishedAt;
  if (!existingPublish) {
    await assertGrowthPublishCapacity(input.tenantId, input.workspaceId);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
  const html = renderGrowthAssetHtml(asset.assetType, asset.title, asset.body, {
    tenantSlug: tenant?.slug,
  });
  if (!html) throw new Error("Could not render asset as HTML");

  await ensurePanelDefaults(
    await prisma.hostingAccount.findUniqueOrThrow({ where: { id: input.hostingAccountId } }),
  );

  const { panelPath, fileName } = resolvePanelPublishPath(asset.assetType, asset.slug, asset.title);

  if (asset.assetType === "blog_post") {
    await upsertPanelFile(input.hostingAccountId, {
      parentPath: "/public_html/blog",
      name: fileName,
      type: "dir",
    });
  }

  const file = await upsertPanelFile(input.hostingAccountId, {
    parentPath: panelPath,
    name: fileName,
    type: "file",
    content: html,
  });

  const publishedAt = new Date().toISOString();
  const publishMeta = {
    panelFileId: file.id,
    panelPath: `${panelPath}/${fileName}`.replace(/\/+/g, "/"),
    publishedAt,
  };

  await prisma.growthContentAsset.update({
    where: { id: asset.id },
    data: {
      bodyJson: JSON.stringify({ ...asset.body, publish: publishMeta }),
    },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "content_asset.published",
    entityType: "growth_content_asset",
    entityId: asset.id,
    metadata: publishMeta,
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "content_asset.published",
    payload: { assetId: asset.id, assetType: asset.assetType, ...publishMeta },
  });

  return {
    assetId: asset.id,
    assetType: asset.assetType,
    title: asset.title,
    ...publishMeta,
  };
}

export async function publishGrowthBundleToPanel(input: {
  tenantId: string;
  workspaceId: string;
  hostingAccountId: string;
}) {
  const assets = await listGrowthContentAssets(input.tenantId, input.workspaceId);
  const targets = assets.filter((a) => PUBLISHABLE_TYPES.has(a.assetType));
  const published = [];

  for (const asset of targets) {
    published.push(
      await publishGrowthAssetToPanel({
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        hostingAccountId: input.hostingAccountId,
        assetId: asset.id,
      }),
    );
  }

  return { publishedCount: published.length, published };
}

function resolvePanelPublishPath(assetType: string, slug: string | null, title: string): {
  panelPath: string;
  fileName: string;
} {
  if (assetType === "homepage_copy") {
    return { panelPath: "/public_html", fileName: "index.html" };
  }
  if (assetType === "landing_copy") {
    return { panelPath: "/public_html", fileName: "offer.html" };
  }
  const safeSlug = (slug ?? title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return { panelPath: "/public_html/blog", fileName: `${safeSlug || "post"}.html` };
}

export function isPublishableGrowthAssetType(assetType: string): boolean {
  return isGrowthContentAssetType(assetType) && PUBLISHABLE_TYPES.has(assetType);
}
