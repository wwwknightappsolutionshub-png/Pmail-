import { api } from "../api/client";
import type { MarketplaceBrowseVertical, MarketplaceLicenseScope } from "../types/addon";

export type AddonCheckoutScope = "user" | "tenant";

export async function resolvePaymentProvider(): Promise<"stripe" | "paystack" | "mock"> {
  const { providers, mockMode } = await api.paymentProviders();
  if (mockMode) return "mock";
  const enabled = providers.map((entry) => entry.id).filter((id): id is "stripe" | "paystack" => id === "stripe" || id === "paystack");
  if (enabled.length === 0) {
    throw new Error("No payment provider configured. Add STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY to .env.");
  }
  return enabled[0];
}

export async function startAddonCheckout(input: {
  slug: string;
  scope: AddonCheckoutScope;
  seats?: number;
  returnPath?: string;
}) {
  const provider = await resolvePaymentProvider();
  const origin = window.location.origin;
  const returnPath = input.returnPath ?? "/addons";
  const result = await api.startAddonSubscription(input.slug, {
    scope: input.scope,
    seats: input.seats,
    provider,
    successUrl: `${origin}${returnPath}?subscribed=${encodeURIComponent(input.slug)}`,
    cancelUrl: `${origin}${returnPath}?cancelled=${encodeURIComponent(input.slug)}`,
  });

  if (result.mode === "checkout" && result.checkout?.checkoutUrl) {
    window.location.assign(result.checkout.checkoutUrl);
    return result;
  }

  return result;
}

export async function startMarketplaceCheckout(input: {
  vertical: MarketplaceBrowseVertical;
  scope: MarketplaceLicenseScope;
  includePlatformBundle: boolean;
  includeVerticalBundle: boolean;
  seats?: number;
  returnPath?: string;
}) {
  const provider = await resolvePaymentProvider();
  const origin = window.location.origin;
  const returnPath = input.returnPath ?? "/addons";
  const result = await api.marketplaceCheckout({
    vertical: input.vertical,
    scope: input.scope,
    includePlatformBundle: input.includePlatformBundle,
    includeVerticalBundle: input.includeVerticalBundle,
    seats: input.seats,
    provider,
    successUrl: `${origin}${returnPath}?subscribed=marketplace`,
    cancelUrl: `${origin}${returnPath}?cancelled=marketplace`,
  });

  if (result.mode === "checkout" && result.checkout?.checkoutUrl) {
    window.location.assign(result.checkout.checkoutUrl);
  }

  return result;
}
