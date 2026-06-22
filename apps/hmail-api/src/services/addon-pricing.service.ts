import { prisma } from "../lib/prisma.js";
import type { AddonSubscriptionScope } from "./addon.service.js";

export type AddonPricingQuote = {
  scope: AddonSubscriptionScope;
  seats: number;
  unitPriceCents: number;
  amountCents: number;
  tenantMemberCount: number;
  minTenantSeats: number;
  label: string;
};

export async function countTenantBillableUsers(tenantId: string): Promise<number> {
  return prisma.user.count({ where: { tenantId, isActive: true } });
}

export function resolveTenantSeats(
  minTenantSeats: number,
  tenantMemberCount: number,
  requestedSeats?: number,
): number {
  const baseline = Math.max(minTenantSeats, tenantMemberCount, 1);
  if (requestedSeats == null || Number.isNaN(requestedSeats)) return baseline;
  return Math.max(baseline, Math.floor(requestedSeats));
}

export async function quoteAddonSubscription(
  addon: {
    slug: string;
    name: string;
    priceCents: number;
    tenantPriceCents: number;
    minTenantSeats: number;
    addonKind: string;
  },
  tenantId: string,
  scope: AddonSubscriptionScope,
  requestedSeats?: number,
): Promise<AddonPricingQuote> {
  const tenantMemberCount = await countTenantBillableUsers(tenantId);

  if (scope === "user") {
    return {
      scope: "user",
      seats: 1,
      unitPriceCents: addon.priceCents,
      amountCents: addon.priceCents,
      tenantMemberCount,
      minTenantSeats: addon.minTenantSeats,
      label: `${addon.name} — $${(addon.priceCents / 100).toFixed(2)}/month per user`,
    };
  }

  const seats = resolveTenantSeats(addon.minTenantSeats, tenantMemberCount, requestedSeats);
  const unitPriceCents = addon.tenantPriceCents;
  const amountCents = unitPriceCents * seats;

  return {
    scope: "tenant",
    seats,
    unitPriceCents,
    amountCents,
    tenantMemberCount,
    minTenantSeats: addon.minTenantSeats,
    label: `${addon.name} — $${(unitPriceCents / 100).toFixed(2)}/month × ${seats} members`,
  };
}
