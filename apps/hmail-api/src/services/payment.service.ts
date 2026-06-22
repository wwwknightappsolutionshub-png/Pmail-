import { getEnv, getEnabledPaymentProviders, isPaymentMockMode, type PaymentProviderId } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { createMockCheckoutUrl } from "./payments/mock.provider.js";
import { initializePaystackTransaction } from "./payments/paystack.provider.js";
import { createStripeCheckoutSession } from "./payments/stripe.provider.js";
import {
  cancelSubscriptionByStripeId,
  markSubscriptionPastDueByStripeId,
  renewSubscriptionByStripeId,
} from "./billing-lifecycle.service.js";
import { upgradeGrowthPlanOnSubscription } from "./growth-plan.service.js";
import { resolveGrowthPlanFromCheckoutSlug } from "../growth/plan-types.js";
import {
  type CheckoutMetadata,
  type ProvisionCredentials,
  provisionHostingFromCheckout,
  resolveOrCreateTenant,
} from "./provisioning.service.js";
import { quoteAddonSubscription } from "./addon-pricing.service.js";
import {
  activateMarketplaceSelection,
  quoteMarketplaceSelection,
  type MarketplaceBundleSelection,
} from "./marketplace-bundle.service.js";
import type { AddonSubscriptionScope } from "./addon.service.js";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export type ProductType = "hosting_plan" | "addon";

export type CreateCheckoutInput = {
  provider: PaymentProviderId;
  productType: ProductType;
  productSlug: string;
  tenantSlug?: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
  provision?: {
    orgName: string;
    domain?: string;
  };
};

function periodEndFromBilling(billingPeriod: string): Date {
  const end = new Date();
  if (billingPeriod === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

function serializeCheckout(
  checkout: {
    id: string;
    provider: string;
    productType: string;
    productSlug: string;
    productName: string;
    amountCents: number;
    currency: string;
    customerEmail: string;
    status: string;
    checkoutUrl: string | null;
    successUrl: string;
    cancelUrl: string;
    createdAt: Date;
    completedAt: Date | null;
    metadata: string | null;
  },
  tenantSlug?: string,
) {
  const metadata = checkout.metadata ? (JSON.parse(checkout.metadata) as CheckoutMetadata) : {};
  return {
    id: checkout.id,
    provider: checkout.provider,
    productType: checkout.productType,
    productSlug: checkout.productSlug,
    productName: checkout.productName,
    amountCents: checkout.amountCents,
    currency: checkout.currency,
    customerEmail: checkout.customerEmail,
    status: checkout.status,
    checkoutUrl: checkout.checkoutUrl,
    successUrl: checkout.successUrl,
    cancelUrl: checkout.cancelUrl,
    createdAt: checkout.createdAt.toISOString(),
    completedAt: checkout.completedAt?.toISOString() ?? null,
    tenantSlug: tenantSlug ?? metadata.provisioning?.tenantSlug ?? metadata.provision?.tenantSlug ?? null,
    provisioning: metadata.provisioning ?? null,
  };
}

export function getPaymentProvidersPublic() {
  const env = getEnv();
  const providers = getEnabledPaymentProviders();
  return {
    providers: providers.map((id) => ({
      id,
      label: id === "stripe" ? "Stripe" : id === "paystack" ? "Paystack" : "Demo checkout",
      publishableKey:
        id === "stripe" ? env.STRIPE_PUBLISHABLE_KEY ?? null : id === "paystack" ? env.PAYSTACK_PUBLIC_KEY ?? null : null,
    })),
    currency: env.PAYMENT_DEFAULT_CURRENCY,
    mockMode: isPaymentMockMode(),
  };
}

async function resolveProduct(productType: ProductType, productSlug: string) {
  if (productType === "addon") {
    const addon = await prisma.addon.findFirst({ where: { slug: productSlug, isActive: true } });
    if (!addon) throw new PaymentError("Add-on not found");
    const marketing = await prisma.addonMarketing.findUnique({ where: { addonId: addon.id } });
    const amountCents = marketing?.displayPriceCents && marketing.displayPriceCents > 0
      ? marketing.displayPriceCents
      : addon.priceCents;
    return {
      productId: addon.id,
      productSlug: addon.slug,
      productName: addon.name,
      amountCents,
      billingPeriod: "monthly" as const,
    };
  }

  const plan = await prisma.hostingPlan.findFirst({ where: { slug: productSlug, isActive: true } });
  if (!plan) throw new PaymentError("Hosting plan not found");
  return {
    productId: plan.id,
    productSlug: plan.slug,
    productName: plan.name,
    amountCents: plan.priceCents,
    billingPeriod: plan.billingPeriod === "yearly" ? ("yearly" as const) : ("monthly" as const),
  };
}

export type CreateAddonCheckoutInput = {
  provider: PaymentProviderId;
  tenantId: string;
  tenantSlug: string;
  userId: string;
  addonSlug: string;
  scope: AddonSubscriptionScope;
  seats?: number;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
};

export async function createAddonSubscriptionCheckout(input: CreateAddonCheckoutInput) {
  const env = getEnv();
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.provider)) {
    throw new PaymentError(`Payment provider "${input.provider}" is not enabled`);
  }

  const addon = await prisma.addon.findFirst({
    where: { slug: input.addonSlug, isActive: true, deletedAt: null },
  });
  if (!addon) throw new PaymentError("Add-on not found");
  if (addon.comingSoon) throw new PaymentError("This add-on is coming soon");
  if (!addon.isPaid) throw new PaymentError("This add-on is included and does not require checkout");

  const quote = await quoteAddonSubscription(addon, input.tenantId, input.scope, input.seats);
  const successUrl = input.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = input.cancelUrl ?? env.PAYMENT_CANCEL_URL;

  const metadata: CheckoutMetadata = {
    billingPeriod: "monthly",
    addonSubscription: {
      scope: input.scope,
      userId: input.userId,
      addonSlug: addon.slug,
      seats: quote.seats,
      unitPriceCents: quote.unitPriceCents,
      vertical: addon.vertical,
      addonKind: addon.addonKind,
    },
  };

  const checkout = await prisma.paymentCheckout.create({
    data: {
      tenantId: input.tenantId,
      provider: input.provider,
      productType: "addon",
      productId: addon.id,
      productSlug: addon.slug,
      productName: `${addon.name} (${quote.label})`,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      successUrl,
      cancelUrl,
      metadata: JSON.stringify(metadata),
    },
  });

  let checkoutUrl: string;
  let externalId: string | null = null;

  if (input.provider === "mock") {
    checkoutUrl = createMockCheckoutUrl(checkout.id);
    externalId = `mock_${checkout.id}`;
  } else if (input.provider === "stripe") {
    const session = await createStripeCheckoutSession({
      checkoutId: checkout.id,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      productName: `${addon.name} subscription`,
      customerEmail: input.customerEmail,
      successUrl,
      cancelUrl,
      billingPeriod: "monthly",
    });
    checkoutUrl = session.checkoutUrl;
    externalId = session.sessionId;
  } else {
    const tx = await initializePaystackTransaction({
      checkoutId: checkout.id,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail,
      successUrl,
      productName: `${addon.name} subscription`,
    });
    checkoutUrl = tx.checkoutUrl;
    externalId = tx.reference;
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: { checkoutUrl, externalId },
  });

  return {
    checkout: serializeCheckout(updated, input.tenantSlug),
    quote,
  };
}

export type CreateMarketplaceCheckoutInput = {
  provider: PaymentProviderId;
  tenantId: string;
  tenantSlug: string;
  userId: string;
  customerEmail: string;
  selection: MarketplaceBundleSelection;
  successUrl?: string;
  cancelUrl?: string;
};

export async function createMarketplaceCheckout(input: CreateMarketplaceCheckoutInput) {
  const env = getEnv();
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.provider)) {
    throw new PaymentError(`Payment provider "${input.provider}" is not enabled`);
  }

  const quote = await quoteMarketplaceSelection(input.tenantId, input.selection);
  const successUrl = input.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = input.cancelUrl ?? env.PAYMENT_CANCEL_URL;
  const productSlug = `marketplace-${input.selection.vertical}`;
  const anchorSlug = quote.lines.find((line) => line.bundle === "vertical")?.anchorSlug
    ?? quote.lines.find((line) => line.bundle === "platform")?.anchorSlug;
  if (!anchorSlug) throw new PaymentError("No bundle anchor found");

  const anchorAddon = await prisma.addon.findFirst({
    where: { slug: anchorSlug, isActive: true, deletedAt: null },
  });
  if (!anchorAddon) throw new PaymentError("Bundle anchor add-on not found");

  if (quote.amountCents === 0) {
    await activateMarketplaceSelection(
      input.tenantId,
      input.userId,
      input.selection,
      input.provider,
    );
    return {
      mode: "activated" as const,
      quote,
    };
  }

  const metadata: CheckoutMetadata = {
    billingPeriod: "monthly",
    marketplaceCheckout: {
      scope: input.selection.scope,
      userId: input.userId,
      vertical: input.selection.vertical,
      includePlatformBundle: input.selection.includePlatformBundle,
      includeVerticalBundle: input.selection.includeVerticalBundle,
      seats: quote.seats,
      lines: quote.lines.map((line) => ({
        bundle: line.bundle,
        anchorSlug: line.anchorSlug,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.amountCents,
      })),
    },
  };

  const checkout = await prisma.paymentCheckout.create({
    data: {
      tenantId: input.tenantId,
      provider: input.provider,
      productType: "addon",
      productId: anchorAddon.id,
      productSlug,
      productName: quote.label,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      successUrl,
      cancelUrl,
      metadata: JSON.stringify(metadata),
    },
  });

  let checkoutUrl: string;
  let externalId: string | null = null;

  if (input.provider === "mock") {
    checkoutUrl = createMockCheckoutUrl(checkout.id);
    externalId = `mock_${checkout.id}`;
  } else if (input.provider === "stripe") {
    const session = await createStripeCheckoutSession({
      checkoutId: checkout.id,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      productName: quote.label,
      customerEmail: input.customerEmail,
      successUrl,
      cancelUrl,
      billingPeriod: "monthly",
    });
    checkoutUrl = session.checkoutUrl;
    externalId = session.sessionId;
  } else {
    const tx = await initializePaystackTransaction({
      checkoutId: checkout.id,
      amountCents: quote.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail,
      successUrl,
      productName: quote.label,
    });
    checkoutUrl = tx.checkoutUrl;
    externalId = tx.reference;
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: { checkoutUrl, externalId },
  });

  return {
    mode: "checkout" as const,
    checkout: serializeCheckout(updated, input.tenantSlug),
    quote,
  };
}

export async function createPaymentCheckout(input: CreateCheckoutInput) {
  const env = getEnv();
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.provider)) {
    throw new PaymentError(`Payment provider "${input.provider}" is not enabled`);
  }

  if (!input.tenantSlug?.trim() && !input.provision?.orgName?.trim()) {
    throw new PaymentError("Tenant slug or organization name is required");
  }

  const tenant = await resolveOrCreateTenant({
    tenantSlug: input.tenantSlug?.trim().toLowerCase(),
    orgName: input.provision?.orgName,
  });

  const product = await resolveProduct(input.productType, input.productSlug);
  const successUrl = input.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = input.cancelUrl ?? env.PAYMENT_CANCEL_URL;

  const metadata: CheckoutMetadata = {
    billingPeriod: product.billingPeriod,
    ...(input.provision
      ? {
          provision: {
            orgName: input.provision.orgName.trim(),
            tenantSlug: tenant.slug,
            domain: input.provision.domain?.trim().toLowerCase(),
          },
        }
      : {}),
  };

  const checkout = await prisma.paymentCheckout.create({
    data: {
      tenantId: tenant.id,
      provider: input.provider,
      productType: input.productType,
      productId: product.productId,
      productSlug: product.productSlug,
      productName: product.productName,
      amountCents: product.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      successUrl,
      cancelUrl,
      metadata: JSON.stringify(metadata),
    },
  });

  let checkoutUrl: string;
  let externalId: string | null = null;

  if (input.provider === "mock") {
    checkoutUrl = createMockCheckoutUrl(checkout.id);
    externalId = `mock_${checkout.id}`;
  } else if (input.provider === "stripe") {
    const session = await createStripeCheckoutSession({
      checkoutId: checkout.id,
      amountCents: product.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      productName: product.productName,
      customerEmail: input.customerEmail,
      successUrl,
      cancelUrl,
      billingPeriod: product.billingPeriod,
    });
    checkoutUrl = session.checkoutUrl;
    externalId = session.sessionId;
  } else {
    const tx = await initializePaystackTransaction({
      checkoutId: checkout.id,
      amountCents: product.amountCents,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail,
      successUrl,
      productName: product.productName,
    });
    checkoutUrl = tx.checkoutUrl;
    externalId = tx.reference;
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: { checkoutUrl, externalId },
  });

  return serializeCheckout(updated, tenant.slug);
}

export async function getPaymentCheckout(id: string) {
  const checkout = await prisma.paymentCheckout.findUnique({
    where: { id },
    include: { tenant: { select: { slug: true } } },
  });
  return checkout ? serializeCheckout(checkout, checkout.tenant.slug) : null;
}

export async function completePaymentCheckout(
  checkoutId: string,
  externalPaymentId?: string,
): Promise<{ checkout: ReturnType<typeof serializeCheckout>; provisioning?: ProvisionCredentials }> {
  const checkout = await prisma.paymentCheckout.findUnique({
    where: { id: checkoutId },
    include: { tenant: { select: { slug: true } } },
  });
  if (!checkout) throw new PaymentError("Checkout not found");
  if (checkout.status === "completed") {
    return { checkout: serializeCheckout(checkout, checkout.tenant.slug) };
  }

  const metadata = checkout.metadata ? (JSON.parse(checkout.metadata) as CheckoutMetadata) : {};
  const billingPeriod = metadata.billingPeriod ?? "monthly";
  const periodEnd = periodEndFromBilling(billingPeriod);
  const addonSubscription = metadata.addonSubscription;

  await prisma.$transaction(async (tx) => {
    await tx.paymentCheckout.update({
      where: { id: checkout.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        externalPaymentId: externalPaymentId ?? checkout.externalPaymentId,
      },
    });

    if (checkout.productType === "addon") {
      if (metadata.marketplaceCheckout) {
        const marketplace = metadata.marketplaceCheckout;
        await activateMarketplaceSelection(
          checkout.tenantId,
          marketplace.userId,
          {
            vertical: marketplace.vertical as MarketplaceBundleSelection["vertical"],
            scope: marketplace.scope,
            includePlatformBundle: marketplace.includePlatformBundle,
            includeVerticalBundle: marketplace.includeVerticalBundle,
            seats: marketplace.seats,
          },
          checkout.provider,
        );
      } else if (addonSubscription?.scope === "user") {
        await tx.userAddonSubscription.upsert({
          where: {
            userId_addonId: { userId: addonSubscription.userId, addonId: checkout.productId },
          },
          create: {
            tenantId: checkout.tenantId,
            userId: addonSubscription.userId,
            addonId: checkout.productId,
            scope: "user",
            priceCents: addonSubscription.unitPriceCents,
            status: "active",
            currentPeriodEnd: periodEnd,
          },
          update: {
            scope: "user",
            priceCents: addonSubscription.unitPriceCents,
            status: "active",
            canceledAt: null,
            currentPeriodEnd: periodEnd,
          },
        });

        if (addonSubscription.addonKind === "vertical" && addonSubscription.vertical) {
          await tx.user.update({
            where: { id: addonSubscription.userId },
            data: { businessVertical: addonSubscription.vertical },
          });
        }
      } else if (addonSubscription?.scope === "tenant") {
        await tx.tenantAddonSubscription.upsert({
          where: {
            tenantId_addonId: { tenantId: checkout.tenantId, addonId: checkout.productId },
          },
          create: {
            tenantId: checkout.tenantId,
            addonId: checkout.productId,
            scope: "tenant",
            seats: addonSubscription.seats,
            priceCentsPerSeat: addonSubscription.unitPriceCents,
            status: "active",
            paymentProvider: checkout.provider,
            stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : null,
            paystackSubscriptionCode:
              checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : null,
            currentPeriodEnd: periodEnd,
          },
          update: {
            scope: "tenant",
            seats: addonSubscription.seats,
            priceCentsPerSeat: addonSubscription.unitPriceCents,
            status: "active",
            paymentProvider: checkout.provider,
            stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : undefined,
            paystackSubscriptionCode:
              checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : undefined,
            canceledAt: null,
            currentPeriodEnd: periodEnd,
          },
        });

        if (addonSubscription.addonKind === "vertical" && addonSubscription.vertical && addonSubscription.userId) {
          await tx.user.update({
            where: { id: addonSubscription.userId },
            data: { businessVertical: addonSubscription.vertical },
          });
        }
      } else {
        await tx.tenantAddonSubscription.upsert({
          where: {
            tenantId_addonId: { tenantId: checkout.tenantId, addonId: checkout.productId },
          },
          create: {
            tenantId: checkout.tenantId,
            addonId: checkout.productId,
            status: "active",
            paymentProvider: checkout.provider,
            stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : null,
            paystackSubscriptionCode: checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : null,
            currentPeriodEnd: periodEnd,
          },
          update: {
            status: "active",
            paymentProvider: checkout.provider,
            stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : undefined,
            paystackSubscriptionCode:
              checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : undefined,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    } else {
      await tx.hostingPlanSubscription.upsert({
        where: {
          tenantId_hostingPlanId: { tenantId: checkout.tenantId, hostingPlanId: checkout.productId },
        },
        create: {
          tenantId: checkout.tenantId,
          hostingPlanId: checkout.productId,
          status: "active",
          paymentProvider: checkout.provider,
          stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : null,
          paystackSubscriptionCode: checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : null,
          currentPeriodEnd: periodEnd,
        },
        update: {
          status: "active",
          paymentProvider: checkout.provider,
          stripeSubscriptionId: checkout.provider === "stripe" ? externalPaymentId ?? checkout.externalId : undefined,
          paystackSubscriptionCode:
            checkout.provider === "paystack" ? externalPaymentId ?? checkout.externalId : undefined,
          currentPeriodEnd: periodEnd,
        },
      });

      const account = await tx.hostingAccount.findFirst({ where: { tenantId: checkout.tenantId } });
      if (account) {
        await tx.hostingAccount.update({
          where: { id: account.id },
          data: { planId: checkout.productId },
        });
      }
    }
  });

  if (checkout.productType === "addon") {
    const planSlug = resolveGrowthPlanFromCheckoutSlug(checkout.productSlug);
    if (planSlug) {
      await upgradeGrowthPlanOnSubscription(checkout.tenantId, planSlug);
    }
  }

  let provisioning: ProvisionCredentials | null = null;
  if (checkout.productType === "hosting_plan") {
    provisioning = await provisionHostingFromCheckout(checkoutId);
  }

  const completed = await prisma.paymentCheckout.findUniqueOrThrow({
    where: { id: checkoutId },
    include: { tenant: { select: { slug: true } } },
  });
  return {
    checkout: serializeCheckout(completed, completed.tenant.slug),
    ...(provisioning ? { provisioning } : {}),
  };
}

export async function recordWebhookEvent(
  provider: PaymentProviderId,
  eventId: string,
  eventType: string,
  payload: string,
): Promise<boolean> {
  try {
    await prisma.paymentWebhookEvent.create({
      data: { provider, eventId, eventType, payload },
    });
    return true;
  } catch {
    return false;
  }
}

export async function handleStripeWebhook(payload: Buffer, signature: string | undefined) {
  const { verifyStripeWebhook, parseStripeWebhookEvent } = await import("./payments/stripe.provider.js");
  if (!verifyStripeWebhook(payload, signature)) {
    throw new PaymentError("Invalid Stripe webhook signature");
  }

  const parsed = parseStripeWebhookEvent(payload);
  const recorded = await recordWebhookEvent("stripe", parsed.id, parsed.type, payload.toString("utf8"));
  if (!recorded) return { ok: true, handled: false };

  if (parsed.type === "checkout.session.completed" && parsed.checkoutId) {
    await completePaymentCheckout(parsed.checkoutId, parsed.paymentId ?? parsed.sessionId);
    return { ok: true, handled: true };
  }

  if (parsed.subscriptionId) {
    if (parsed.type === "invoice.paid") {
      await renewSubscriptionByStripeId(parsed.subscriptionId);
      return { ok: true, handled: true };
    }
    if (parsed.type === "invoice.payment_failed") {
      await markSubscriptionPastDueByStripeId(parsed.subscriptionId);
      return { ok: true, handled: true };
    }
    if (parsed.type === "customer.subscription.deleted") {
      await cancelSubscriptionByStripeId(parsed.subscriptionId);
      return { ok: true, handled: true };
    }
  }

  return { ok: true, handled: false };
}

export async function handlePaystackWebhook(payload: Buffer, signature: string | undefined) {
  const { verifyPaystackWebhook, parsePaystackWebhookEvent } = await import("./payments/paystack.provider.js");
  if (!verifyPaystackWebhook(payload, signature)) {
    throw new PaymentError("Invalid Paystack webhook signature");
  }

  const parsed = parsePaystackWebhookEvent(payload);
  const isComplete = parsed.type === "charge.success";
  if (!isComplete || !parsed.checkoutId) return { ok: true, handled: false };

  const recorded = await recordWebhookEvent("paystack", parsed.id, parsed.type, payload.toString("utf8"));
  if (!recorded) return { ok: true, handled: false };

  await completePaymentCheckout(parsed.checkoutId, parsed.paymentId);
  return { ok: true, handled: true };
}

export async function mockCompleteCheckout(checkoutId: string) {
  if (!isPaymentMockMode()) {
    throw new PaymentError("Mock payments are disabled");
  }
  return completePaymentCheckout(checkoutId, `mock_pay_${checkoutId}`);
}

export async function listTenantPayments(tenantId: string) {
  const checkouts = await prisma.paymentCheckout.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return checkouts.map((c) => serializeCheckout(c));
}
