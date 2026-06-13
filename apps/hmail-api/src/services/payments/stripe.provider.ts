import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";

export type StripeCheckoutInput = {
  checkoutId: string;
  amountCents: number;
  currency: string;
  productName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  billingPeriod: "monthly" | "yearly" | "one_time";
};

export async function createStripeCheckoutSession(input: StripeCheckoutInput): Promise<{
  sessionId: string;
  checkoutUrl: string;
}> {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  const body = new URLSearchParams();
  const isRecurring = input.billingPeriod !== "one_time";
  body.append("mode", isRecurring ? "subscription" : "payment");
  body.append("success_url", `${input.successUrl}?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  body.append("cancel_url", input.cancelUrl);
  body.append("customer_email", input.customerEmail);
  body.append("client_reference_id", input.checkoutId);
  body.append("metadata[checkout_id]", input.checkoutId);
  body.append("line_items[0][quantity]", "1");
  body.append("line_items[0][price_data][currency]", input.currency);
  body.append("line_items[0][price_data][unit_amount]", String(input.amountCents));
  body.append("line_items[0][price_data][product_data][name]", input.productName);

  if (isRecurring) {
    body.append("line_items[0][price_data][recurring][interval]", input.billingPeriod === "yearly" ? "year" : "month");
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? "Stripe checkout failed");
  }
  if (!data.id || !data.url) throw new Error("Stripe returned an invalid session");

  return { sessionId: data.id, checkoutUrl: data.url };
}

export function verifyStripeWebhook(payload: Buffer, signatureHeader: string | undefined): boolean {
  const env = getEnv();
  if (!env.STRIPE_WEBHOOK_SECRET || !signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signed = `${timestamp}.${payload.toString("utf8")}`;
  const expected = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET).update(signed).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseStripeWebhookEvent(payload: Buffer): {
  id: string;
  type: string;
  checkoutId?: string;
  sessionId?: string;
  paymentId?: string;
} {
  const event = JSON.parse(payload.toString("utf8")) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };

  const obj = event.data.object;
  const checkoutId =
    (obj.metadata as { checkout_id?: string } | undefined)?.checkout_id ??
    (obj.client_reference_id as string | undefined);

  return {
    id: event.id,
    type: event.type,
    checkoutId,
    sessionId: obj.id as string | undefined,
    paymentId: (obj.payment_intent as string | undefined) ?? (obj.subscription as string | undefined),
  };
}
