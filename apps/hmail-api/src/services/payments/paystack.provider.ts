import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";

export type PaystackCheckoutInput = {
  checkoutId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  productName: string;
};

export async function initializePaystackTransaction(input: PaystackCheckoutInput): Promise<{
  reference: string;
  checkoutUrl: string;
}> {
  const env = getEnv();
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error("Paystack is not configured");
  }

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.customerEmail,
      amount: input.amountCents,
      currency: input.currency.toUpperCase(),
      reference: input.checkoutId,
      callback_url: `${input.successUrl}?provider=paystack&reference=${input.checkoutId}`,
      metadata: {
        checkout_id: input.checkoutId,
        product_name: input.productName,
      },
    }),
  });

  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw new Error(data.message ?? "Paystack initialization failed");
  }

  return {
    reference: data.data.reference ?? input.checkoutId,
    checkoutUrl: data.data.authorization_url,
  };
}

export function verifyPaystackWebhook(payload: Buffer, signatureHeader: string | undefined): boolean {
  const env = getEnv();
  if (!env.PAYSTACK_SECRET_KEY || !signatureHeader) return false;

  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function parsePaystackWebhookEvent(payload: Buffer): {
  id: string;
  type: string;
  checkoutId?: string;
  paymentId?: string;
} {
  const event = JSON.parse(payload.toString("utf8")) as {
    event: string;
    data: {
      id?: number;
      reference?: string;
      metadata?: { checkout_id?: string };
    };
  };

  const checkoutId = event.data.metadata?.checkout_id ?? event.data.reference;
  return {
    id: `${event.event}-${event.data.id ?? event.data.reference ?? Date.now()}`,
    type: event.event,
    checkoutId,
    paymentId: event.data.reference,
  };
}
