import { getCatalogEntry } from "../data/addon-catalog.js";
import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import { sendOpenTrackingUpsellEmail } from "./addon-email.service.js";
import {
  ensurePanelWorkspaceWelcomeTrial,
  hasActivePanelWorkspaceWelcomeTrial,
} from "./panel-workspace-trial.service.js";

export const OPEN_TRACKING_ADDON_SLUG = "open-tracking";
export const OPEN_TRACKING_UPSELL_HOURS = 70;

export async function ensureOpenTrackingOnFirstSend(userId: string): Promise<void> {
  const settings = await prisma.userComposeSettings.findUnique({ where: { userId } });
  const now = new Date();

  if (!settings?.openTrackingFirstSendAt) {
    await prisma.userComposeSettings.upsert({
      where: { userId },
      create: { userId, openTrackingFirstSendAt: now },
      update: { openTrackingFirstSendAt: now },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { panelWorkspaceTrialStartedAt: true },
  });
  if (!user?.panelWorkspaceTrialStartedAt) {
    await ensurePanelWorkspaceWelcomeTrial(userId);
  }
}

export async function hasOpenTrackingAccess(userId: string, tenantId: string): Promise<boolean> {
  return tenantHasAddonAccess(tenantId, OPEN_TRACKING_ADDON_SLUG, userId);
}

export function resolveOutboundTrackingEnabled(
  explicit: boolean | undefined,
  entitled: boolean,
): boolean {
  if (!entitled) return false;
  if (explicit === false) return false;
  return true;
}

export async function processOpenTrackingUpsellEmails(): Promise<number> {
  const threshold = new Date(Date.now() - OPEN_TRACKING_UPSELL_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.userComposeSettings.findMany({
    where: {
      openTrackingFirstSendAt: { lte: threshold },
      openTrackingUpsellEmailSent: false,
    },
    include: {
      user: { select: { id: true, email: true, tenantId: true } },
    },
  });

  let sent = 0;

  for (const settings of candidates) {
    const subscribed = await tenantHasAddonAccess(
      settings.user.tenantId,
      OPEN_TRACKING_ADDON_SLUG,
      settings.user.id,
    );
    if (subscribed) {
      await prisma.userComposeSettings.update({
        where: { userId: settings.userId },
        data: { openTrackingUpsellEmailSent: true },
      });
      continue;
    }

    const trialActive = await hasActivePanelWorkspaceWelcomeTrial(settings.user.id);
    if (!trialActive) continue;

    const addon = getCatalogEntry(OPEN_TRACKING_ADDON_SLUG);
    await sendOpenTrackingUpsellEmail({
      tenantId: settings.user.tenantId,
      userEmail: settings.user.email,
      addonName: addon?.name ?? "Open Tracking",
      addonSummary:
        "Your complimentary open and link tracking trial is ending soon. Subscribe to keep knowing when recipients open your mail and click tracked links.",
    });

    await prisma.userComposeSettings.update({
      where: { userId: settings.userId },
      data: { openTrackingUpsellEmailSent: true },
    });
    sent += 1;
  }

  return sent;
}
