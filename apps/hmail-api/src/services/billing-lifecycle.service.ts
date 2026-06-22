import { prisma } from "../lib/prisma.js";

function graceDays(): number {
  const raw = process.env.BILLING_GRACE_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : 7;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

function periodEndFromBilling(billingPeriod: string): Date {
  const end = new Date();
  if (billingPeriod === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

export async function processBillingLifecycle(): Promise<{
  markedPastDue: number;
  canceled: number;
}> {
  const now = new Date();
  const graceMs = graceDays() * 24 * 60 * 60 * 1000;

  const expiredHosting = await prisma.hostingPlanSubscription.findMany({
    where: {
      status: "active",
      currentPeriodEnd: { lt: now },
    },
  });

  let markedPastDue = 0;
  for (const sub of expiredHosting) {
    await prisma.hostingPlanSubscription.update({
      where: { id: sub.id },
      data: { status: "past_due", pastDueSince: now },
    });
    markedPastDue += 1;
  }

  const expiredAddons = await prisma.tenantAddonSubscription.findMany({
    where: {
      status: "active",
      currentPeriodEnd: { lt: now },
    },
  });

  for (const sub of expiredAddons) {
    await prisma.tenantAddonSubscription.update({
      where: { id: sub.id },
      data: { status: "past_due", pastDueSince: now },
    });
    markedPastDue += 1;
  }

  const graceCutoff = new Date(now.getTime() - graceMs);
  const overdueHosting = await prisma.hostingPlanSubscription.findMany({
    where: {
      status: "past_due",
      pastDueSince: { lt: graceCutoff },
    },
  });

  let canceled = 0;
  for (const sub of overdueHosting) {
    await prisma.hostingPlanSubscription.update({
      where: { id: sub.id },
      data: { status: "canceled", canceledAt: now },
    });
    canceled += 1;
  }

  const overdueAddons = await prisma.tenantAddonSubscription.findMany({
    where: {
      status: "past_due",
      pastDueSince: { lt: graceCutoff },
    },
  });

  for (const sub of overdueAddons) {
    await prisma.tenantAddonSubscription.update({
      where: { id: sub.id },
      data: { status: "canceled", canceledAt: now },
    });
    canceled += 1;
  }

  return { markedPastDue, canceled };
}

export async function renewSubscriptionByStripeId(
  stripeSubscriptionId: string,
  billingPeriod = "monthly",
): Promise<void> {
  const periodEnd = periodEndFromBilling(billingPeriod);
  const now = new Date();

  await prisma.hostingPlanSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status: "active",
      currentPeriodEnd: periodEnd,
      pastDueSince: null,
      canceledAt: null,
    },
  });

  await prisma.tenantAddonSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: {
      status: "active",
      currentPeriodEnd: periodEnd,
      pastDueSince: null,
      canceledAt: null,
    },
  });
}

export async function markSubscriptionPastDueByStripeId(stripeSubscriptionId: string): Promise<void> {
  const now = new Date();
  await prisma.hostingPlanSubscription.updateMany({
    where: { stripeSubscriptionId, status: "active" },
    data: { status: "past_due", pastDueSince: now },
  });
  await prisma.tenantAddonSubscription.updateMany({
    where: { stripeSubscriptionId, status: "active" },
    data: { status: "past_due", pastDueSince: now },
  });
}

export async function cancelSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
  const now = new Date();
  await prisma.hostingPlanSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "canceled", canceledAt: now },
  });
  await prisma.tenantAddonSubscription.updateMany({
    where: { stripeSubscriptionId },
    data: { status: "canceled", canceledAt: now },
  });
}

export async function getBillingLifecycleSummary() {
  const [hostingActive, hostingPastDue, hostingCanceled, addonActive, addonPastDue, addonCanceled] =
    await Promise.all([
      prisma.hostingPlanSubscription.count({ where: { status: "active" } }),
      prisma.hostingPlanSubscription.count({ where: { status: "past_due" } }),
      prisma.hostingPlanSubscription.count({ where: { status: "canceled" } }),
      prisma.tenantAddonSubscription.count({ where: { status: "active" } }),
      prisma.tenantAddonSubscription.count({ where: { status: "past_due" } }),
      prisma.tenantAddonSubscription.count({ where: { status: "canceled" } }),
    ]);

  return {
    graceDays: graceDays(),
    hosting: { active: hostingActive, pastDue: hostingPastDue, canceled: hostingCanceled },
    addons: { active: addonActive, pastDue: addonPastDue, canceled: addonCanceled },
  };
}
