import { prisma } from "../lib/prisma.js";
import {
  AUTO_REPLY_COMPLIMENTARY_DAYS,
  AUTO_REPLY_FUNCTIONALITY_SLUG,
  AUTO_REPLY_UPSELL_DAYS_BEFORE_END,
  resolveAutoReplyTemplates,
} from "../data/auto-reply-templates.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import { sendAutoReplyUpsellEmail } from "./addon-email.service.js";

export type AutoReplyEntitlement = {
  entitled: boolean;
  gated: boolean;
  complimentaryActive: boolean;
  subscribed: boolean;
  daysLeft: number;
  complimentaryEndsAt: string | null;
  upsellDue: boolean;
};

function complimentaryEndsAt(startedAt: Date): Date {
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + AUTO_REPLY_COMPLIMENTARY_DAYS);
  return endsAt;
}

function daysLeftUntil(endAt: Date): number {
  return Math.max(0, Math.ceil((endAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export async function seedDefaultAutoReplies(userId: string, businessVertical: string | null | undefined): Promise<void> {
  const existing = await prisma.userAutoReply.count({ where: { userId } });
  if (existing > 0) return;

  const templates = resolveAutoReplyTemplates(businessVertical);
  const created = await Promise.all(
    templates.map((template, index) =>
      prisma.userAutoReply.create({
        data: {
          userId,
          name: template.name,
          subject: template.subject,
          body: template.body,
          enabled: index === 0,
        },
      }),
    ),
  );

  await prisma.userComposeSettings.update({
    where: { userId },
    data: { activeAutoReplyId: created[0]?.id ?? null },
  });
}

export async function ensureAutoReplyComplimentary(userId: string, businessVertical: string | null | undefined): Promise<void> {
  const existing = await prisma.userComposeSettings.findUnique({ where: { userId } });
  const now = new Date();

  if (!existing) {
    await prisma.userComposeSettings.create({
      data: {
        userId,
        autoReplyEnabled: true,
        autoReplyComplimentaryStartedAt: now,
      },
    });
    await seedDefaultAutoReplies(userId, businessVertical);
    return;
  }

  if (!existing.autoReplyComplimentaryStartedAt) {
    await prisma.userComposeSettings.update({
      where: { userId },
      data: {
        autoReplyComplimentaryStartedAt: now,
        autoReplyEnabled: existing.autoReplyEnabled || true,
      },
    });
    await seedDefaultAutoReplies(userId, businessVertical);
  }
}

export async function getAutoReplyEntitlement(userId: string, tenantId: string): Promise<AutoReplyEntitlement> {
  const [settings, subscribed] = await Promise.all([
    prisma.userComposeSettings.findUnique({ where: { userId } }),
    tenantHasAddonAccess(tenantId, AUTO_REPLY_FUNCTIONALITY_SLUG, userId),
  ]);

  if (subscribed) {
    return {
      entitled: true,
      gated: false,
      complimentaryActive: false,
      subscribed: true,
      daysLeft: 0,
      complimentaryEndsAt: null,
      upsellDue: false,
    };
  }

  const startedAt = settings?.autoReplyComplimentaryStartedAt;
  if (!startedAt) {
    return {
      entitled: false,
      gated: true,
      complimentaryActive: false,
      subscribed: false,
      daysLeft: 0,
      complimentaryEndsAt: null,
      upsellDue: false,
    };
  }

  const endsAt = complimentaryEndsAt(startedAt);
  const complimentaryActive = endsAt.getTime() > Date.now();
  const daysLeft = daysLeftUntil(endsAt);

  return {
    entitled: complimentaryActive,
    gated: !complimentaryActive,
    complimentaryActive,
    subscribed: false,
    daysLeft,
    complimentaryEndsAt: endsAt.toISOString(),
    upsellDue: complimentaryActive && daysLeft <= AUTO_REPLY_UPSELL_DAYS_BEFORE_END,
  };
}

export async function processAutoReplyUpsellEmails(): Promise<number> {
  const now = new Date();
  const upsellStartDay = AUTO_REPLY_COMPLIMENTARY_DAYS - AUTO_REPLY_UPSELL_DAYS_BEFORE_END;
  const upsellThreshold = new Date(now);
  upsellThreshold.setDate(upsellThreshold.getDate() - upsellStartDay);

  const candidates = await prisma.userComposeSettings.findMany({
    where: {
      autoReplyComplimentaryStartedAt: { lte: upsellThreshold },
      autoReplyUpsellEmailSent: false,
    },
    include: {
      user: { select: { id: true, email: true, tenantId: true, businessVertical: true } },
    },
  });

  let sent = 0;

  for (const settings of candidates) {
    const entitlement = await getAutoReplyEntitlement(settings.userId, settings.user.tenantId);
    if (!entitlement.complimentaryActive || entitlement.subscribed) continue;

    await sendAutoReplyUpsellEmail({
      userEmail: settings.user.email,
      tenantId: settings.user.tenantId,
      daysLeft: entitlement.daysLeft,
    });

    await prisma.userComposeSettings.update({
      where: { userId: settings.userId },
      data: { autoReplyUpsellEmailSent: true },
    });
    sent += 1;
  }

  return sent;
}
