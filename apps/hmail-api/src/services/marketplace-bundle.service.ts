import type { AddonVertical } from "../data/addon-verticals.js";
import {
  getPlatformBundleAnchorSlug,
  getVerticalBundleAnchorSlug,
  getVerticalBundleSlugs,
  MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS,
  MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS,
  MARKETPLACE_VERTICAL_BUNDLE_TENANT_SEAT_PRICE_CENTS,
  MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS,
  PLATFORM_WORKSPACE_BUNDLE_SLUGS,
} from "../data/addon-catalog.js";
import { prisma } from "../lib/prisma.js";
import type { AddonSubscriptionScope } from "./addon.service.js";
import { countTenantBillableUsers, resolveTenantSeats } from "./addon-pricing.service.js";

export type MarketplaceBundleSelection = {
  vertical: Exclude<AddonVertical, "platform">;
  scope: AddonSubscriptionScope;
  includePlatformBundle: boolean;
  includeVerticalBundle: boolean;
  seats?: number;
};

export type MarketplaceBundleLine = {
  bundle: "platform" | "vertical";
  label: string;
  addonSlugs: readonly string[];
  anchorSlug: string;
  unitPriceCents: number;
  amountCents: number;
  isFree: boolean;
};

export type MarketplaceSelectionQuote = {
  vertical: Exclude<AddonVertical, "platform">;
  scope: AddonSubscriptionScope;
  seats: number;
  tenantMemberCount: number;
  minTenantSeats: number;
  lines: MarketplaceBundleLine[];
  amountCents: number;
  label: string;
};

function nextMonthlyPeriodEnd(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function quoteMarketplaceSelection(
  tenantId: string,
  selection: MarketplaceBundleSelection,
): Promise<MarketplaceSelectionQuote> {
  if (!selection.includePlatformBundle && !selection.includeVerticalBundle) {
    throw new Error("Select at least one workspace bundle to continue");
  }

  const tenantMemberCount = await countTenantBillableUsers(tenantId);
  const seats =
    selection.scope === "tenant"
      ? resolveTenantSeats(
          MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS,
          tenantMemberCount,
          selection.seats,
        )
      : 1;

  const lines: MarketplaceBundleLine[] = [];

  if (selection.includePlatformBundle) {
    const amountCents =
      selection.scope === "tenant" ? 0 : MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS;
    lines.push({
      bundle: "platform",
      label:
        selection.scope === "tenant"
          ? "Platform workspace tools — Free for tenant"
          : `Platform workspace tools — ${formatMoney(MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS)}/month`,
      addonSlugs: PLATFORM_WORKSPACE_BUNDLE_SLUGS,
      anchorSlug: getPlatformBundleAnchorSlug(),
      unitPriceCents: selection.scope === "tenant" ? 0 : MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS,
      amountCents,
      isFree: selection.scope === "tenant",
    });
  }

  if (selection.includeVerticalBundle) {
    const verticalSlugs = getVerticalBundleSlugs(selection.vertical);
    const unitPriceCents =
      selection.scope === "tenant"
        ? MARKETPLACE_VERTICAL_BUNDLE_TENANT_SEAT_PRICE_CENTS
        : MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS;
    const amountCents = selection.scope === "tenant" ? unitPriceCents * seats : unitPriceCents;
    lines.push({
      bundle: "vertical",
      label:
        selection.scope === "tenant"
          ? `Vertical workspace bundle — ${formatMoney(unitPriceCents)}/month × ${seats} seats`
          : `Vertical workspace bundle — ${formatMoney(MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS)}/month`,
      addonSlugs: verticalSlugs,
      anchorSlug: getVerticalBundleAnchorSlug(selection.vertical),
      unitPriceCents,
      amountCents,
      isFree: false,
    });
  }

  const amountCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const label =
    amountCents === 0
      ? "Workspace bundles — included for tenant"
      : `Workspace bundles — ${formatMoney(amountCents)}/month`;

  return {
    vertical: selection.vertical,
    scope: selection.scope,
    seats,
    tenantMemberCount,
    minTenantSeats: MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS,
    lines,
    amountCents,
    label,
  };
}

async function activateBundleAnchor(input: {
  tenantId: string;
  userId: string;
  scope: AddonSubscriptionScope;
  anchorSlug: string;
  unitPriceCents: number;
  seats: number;
  vertical?: string;
  paymentProvider?: string;
}): Promise<void> {
  const addon = await prisma.addon.findFirst({
    where: { slug: input.anchorSlug, isActive: true, deletedAt: null },
  });
  if (!addon) throw new Error(`Bundle anchor add-on not found: ${input.anchorSlug}`);

  const currentPeriodEnd = nextMonthlyPeriodEnd();

  if (input.scope === "tenant") {
    await prisma.tenantAddonSubscription.upsert({
      where: { tenantId_addonId: { tenantId: input.tenantId, addonId: addon.id } },
      create: {
        tenantId: input.tenantId,
        addonId: addon.id,
        scope: "tenant",
        seats: input.seats,
        priceCentsPerSeat: input.unitPriceCents,
        status: "active",
        paymentProvider: input.paymentProvider ?? "marketplace_bundle",
        currentPeriodEnd,
      },
      update: {
        scope: "tenant",
        seats: input.seats,
        priceCentsPerSeat: input.unitPriceCents,
        status: "active",
        canceledAt: null,
        currentPeriodEnd,
      },
    });
  } else {
    await prisma.userAddonSubscription.upsert({
      where: { userId_addonId: { userId: input.userId, addonId: addon.id } },
      create: {
        tenantId: input.tenantId,
        userId: input.userId,
        addonId: addon.id,
        scope: "user",
        priceCents: input.unitPriceCents,
        status: "active",
        currentPeriodEnd,
      },
      update: {
        scope: "user",
        priceCents: input.unitPriceCents,
        status: "active",
        canceledAt: null,
        currentPeriodEnd,
      },
    });
  }

  if (addon.addonKind === "vertical" && input.vertical) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { businessVertical: input.vertical },
    });
  }
}

export async function activateMarketplaceSelection(
  tenantId: string,
  userId: string,
  selection: MarketplaceBundleSelection,
  paymentProvider = "marketplace_bundle",
): Promise<void> {
  const quote = await quoteMarketplaceSelection(tenantId, selection);

  for (const line of quote.lines) {
    await activateBundleAnchor({
      tenantId,
      userId,
      scope: selection.scope,
      anchorSlug: line.anchorSlug,
      unitPriceCents: line.unitPriceCents,
      seats: quote.seats,
      vertical: line.bundle === "vertical" ? selection.vertical : undefined,
      paymentProvider,
    });
  }
}
