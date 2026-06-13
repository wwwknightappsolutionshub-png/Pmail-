import { getEnv, getEnabledPaymentProviders, isPaymentMockMode, type PaymentProviderId } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { createMockCheckoutUrl } from "./payments/mock.provider.js";
import { initializePaystackTransaction } from "./payments/paystack.provider.js";
import { createStripeCheckoutSession } from "./payments/stripe.provider.js";

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
  tenantSlug: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
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

function serializeCheckout(checkout: {
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
}) {
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

export async function createPaymentCheckout(input: CreateCheckoutInput) {
  const env = getEnv();
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.provider)) {
    throw new PaymentError(`Payment provider "${input.provider}" is not enabled`);
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: input.tenantSlug.trim().toLowerCase(), isActive: true },
  });
  if (!tenant) throw new PaymentError("Tenant not found");

  const product = await resolveProduct(input.productType, input.productSlug);
  const successUrl = input.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = input.cancelUrl ?? env.PAYMENT_CANCEL_URL;

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
      metadata: JSON.stringify({ billingPeriod: product.billingPeriod }),
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

  return serializeCheckout(updated);
}

export async function getPaymentCheckout(id: string) {
  const checkout = await prisma.paymentCheckout.findUnique({ where: { id } });
  return checkout ? serializeCheckout(checkout) : null;
}

export async function completePaymentCheckout(
  checkoutId: string,
  externalPaymentId?: string,
): Promise<{ checkout: ReturnType<typeof serializeCheckout> }> {
  const checkout = await prisma.paymentCheckout.findUnique({ where: { id: checkoutId } });
  if (!checkout) throw new PaymentError("Checkout not found");
  if (checkout.status === "completed") {
    return { checkout: serializeCheckout(checkout) };
  }

  const metadata = checkout.metadata ? (JSON.parse(checkout.metadata) as { billingPeriod?: string }) : {};
  const billingPeriod = metadata.billingPeriod ?? "monthly";
  const periodEnd = periodEndFromBilling(billingPeriod);

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

  const completed = await prisma.paymentCheckout.findUniqueOrThrow({ where: { id: checkoutId } });
  return { checkout: serializeCheckout(completed) };
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
  const isComplete = parsed.type === "checkout.session.completed";
  if (!isComplete || !parsed.checkoutId) return { ok: true, handled: false };

  const recorded = await recordWebhookEvent("stripe", parsed.id, parsed.type, payload.toString("utf8"));
  if (!recorded) return { ok: true, handled: false };

  await completePaymentCheckout(parsed.checkoutId, parsed.paymentId ?? parsed.sessionId);
  return { ok: true, handled: true };
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
  return checkouts.map(serializeCheckout);
}
