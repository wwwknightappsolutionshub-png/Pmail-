import {
  PANEL_WORKSPACE_WELCOME_TRIAL_DAYS,
  PANEL_WORKSPACE_WELCOME_TRIAL_SLUG_SET,
} from "../data/addon-catalog.js";
import { prisma } from "../lib/prisma.js";
import { sendPanelWorkspaceTrialEmail } from "./addon-email.service.js";

export function panelWorkspaceTrialEndsAt(startedAt: Date): Date {
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + PANEL_WORKSPACE_WELCOME_TRIAL_DAYS);
  return endsAt;
}

export function isPanelWorkspaceWelcomeTrialActive(startedAt: Date | null | undefined, now = new Date()): boolean {
  if (!startedAt) return false;
  return panelWorkspaceTrialEndsAt(startedAt).getTime() > now.getTime();
}

export function panelWorkspaceTrialDaysLeft(startedAt: Date, now = new Date()): number {
  const endsAt = panelWorkspaceTrialEndsAt(startedAt);
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function isPanelWorkspaceWelcomeTrialSlug(slug: string): boolean {
  return PANEL_WORKSPACE_WELCOME_TRIAL_SLUG_SET.has(slug);
}

export async function getPanelWorkspaceTrialStartedAt(userId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { panelWorkspaceTrialStartedAt: true },
  });
  return user?.panelWorkspaceTrialStartedAt ?? null;
}

export async function hasActivePanelWorkspaceWelcomeTrial(userId: string): Promise<boolean> {
  const startedAt = await getPanelWorkspaceTrialStartedAt(userId);
  return isPanelWorkspaceWelcomeTrialActive(startedAt);
}

export type PanelWorkspaceTrialStatus = {
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  daysLeft: number | null;
};

export async function getPanelWorkspaceTrialStatus(userId: string): Promise<PanelWorkspaceTrialStatus> {
  const startedAt = await getPanelWorkspaceTrialStartedAt(userId);
  if (!startedAt) {
    return { active: false, startedAt: null, endsAt: null, daysLeft: null };
  }
  const endsAt = panelWorkspaceTrialEndsAt(startedAt);
  const active = isPanelWorkspaceWelcomeTrialActive(startedAt);
  return {
    active,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    daysLeft: active ? panelWorkspaceTrialDaysLeft(startedAt) : 0,
  };
}

/** Restart an expired welcome trial for PMail+ tester QA without sending another welcome email. */
export async function ensurePmailTesterPanelWorkspaceTrial(userId: string): Promise<void> {
  const startedAt = await getPanelWorkspaceTrialStartedAt(userId);
  if (startedAt && isPanelWorkspaceWelcomeTrialActive(startedAt)) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      panelWorkspaceTrialStartedAt: new Date(),
      panelWorkspaceDay5EmailSent: false,
      panelWorkspaceDay7ReminderSent: false,
    },
  });
}

/** Start the one-time 7-day welcome trial when a user first registers. */
export async function ensurePanelWorkspaceWelcomeTrial(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { panelWorkspaceTrialStartedAt: true, email: true, tenantId: true },
  });
  if (!user || user.panelWorkspaceTrialStartedAt) return;

  const startedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { panelWorkspaceTrialStartedAt: startedAt },
  });

  await sendPanelWorkspaceTrialEmail({
    tenantId: user.tenantId,
    userEmail: user.email,
    emailType: "welcome",
    trialEndsAt: panelWorkspaceTrialEndsAt(startedAt),
  });
}

export async function processPanelWorkspaceTrialEmails(): Promise<void> {
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      panelWorkspaceTrialStartedAt: { not: null },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      tenantId: true,
      panelWorkspaceTrialStartedAt: true,
      panelWorkspaceDay5EmailSent: true,
      panelWorkspaceDay7ReminderSent: true,
    },
  });

  for (const user of users) {
    const startedAt = user.panelWorkspaceTrialStartedAt;
    if (!startedAt) continue;

    const trialActive = isPanelWorkspaceWelcomeTrialActive(startedAt, now);
    if (!trialActive) continue;

    const trialEndsAt = panelWorkspaceTrialEndsAt(startedAt);
    const daysLeft = panelWorkspaceTrialDaysLeft(startedAt, now);
    const daysElapsed = PANEL_WORKSPACE_WELCOME_TRIAL_DAYS - daysLeft;

    if (!user.panelWorkspaceDay5EmailSent && daysElapsed >= 5) {
      await sendPanelWorkspaceTrialEmail({
        tenantId: user.tenantId,
        userEmail: user.email,
        emailType: "day5_upsell",
        trialEndsAt,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { panelWorkspaceDay5EmailSent: true },
      });
    }

    if (!user.panelWorkspaceDay7ReminderSent && daysLeft <= 1) {
      await sendPanelWorkspaceTrialEmail({
        tenantId: user.tenantId,
        userEmail: user.email,
        emailType: "day7_final",
        trialEndsAt,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { panelWorkspaceDay7ReminderSent: true },
      });
    }
  }
}
