import { prisma } from "../lib/prisma.js";
import { isGrowthAnalyticsEventType } from "../growth/analytics-events.js";
import { recordGrowthAnalyticsEvent } from "./growth-analytics.service.js";

export async function recordPublicGrowthAnalyticsEvent(
  tenantSlug: string,
  input: {
    eventType: string;
    sourcePage?: string;
    path?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!isGrowthAnalyticsEventType(input.eventType)) {
    throw new Error(`Invalid event type: ${input.eventType}`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error("Tenant not found");

  const workspace = await prisma.growthWorkspace.findUnique({ where: { tenantId: tenant.id } });
  if (!workspace) throw new Error("Growth workspace not found");

  await recordGrowthAnalyticsEvent({
    tenantId: tenant.id,
    workspaceId: workspace.id,
    eventType: input.eventType,
    sourcePage: input.sourcePage,
    path: input.path,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    referrer: input.referrer,
    metadata: input.metadata,
  });

  return { ok: true };
}
