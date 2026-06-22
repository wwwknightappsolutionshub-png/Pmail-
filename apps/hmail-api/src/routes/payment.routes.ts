import { Router } from "express";
import { z } from "zod";
import {
  createPaymentCheckout,
  getPaymentCheckout,
  getPaymentProvidersPublic,
  handlePaystackWebhook,
  handleStripeWebhook,
  mockCompleteCheckout,
  PaymentError,
} from "../services/payment.service.js";
import { isPaymentMockMode } from "../config/env.js";

const checkoutSchema = z
  .object({
    provider: z.enum(["stripe", "paystack", "mock"]),
    productType: z.enum(["hosting_plan", "addon"]),
    productSlug: z.string().min(1),
    tenantSlug: z.string().min(1).optional(),
    customerEmail: z.string().email(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    provision: z
      .object({
        orgName: z.string().min(1),
        domain: z.string().min(1).optional(),
      })
      .optional(),
  })
  .refine((body) => Boolean(body.tenantSlug?.trim() || body.provision?.orgName?.trim()), {
    message: "tenantSlug or provision.orgName is required",
  });

export const paymentRouter = Router();

paymentRouter.get("/providers", (_req, res) => {
  res.json(getPaymentProvidersPublic());
});

paymentRouter.post("/checkout", async (req, res, next) => {
  try {
    const body = checkoutSchema.parse(req.body);
    const checkout = await createPaymentCheckout(body);
    res.status(201).json({ checkout });
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

paymentRouter.get("/checkout/:id", async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const checkout = await getPaymentCheckout(id);
    if (!checkout) {
      res.status(404).json({ error: "Checkout not found" });
      return;
    }
    res.json({ checkout });
  } catch (err) {
    next(err);
  }
});

paymentRouter.post("/mock/complete/:id", async (req, res, next) => {
  try {
    if (!isPaymentMockMode()) {
      res.status(403).json({ error: "Mock payments are disabled" });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await mockCompleteCheckout(id);
    res.json(result);
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export async function stripeWebhookHandler(req: import("express").Request, res: import("express").Response) {
  try {
    const payload = req.body as Buffer;
    const signature = req.headers["stripe-signature"] as string | undefined;
    const result = await handleStripeWebhook(payload, signature);
    res.json(result);
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

export async function paystackWebhookHandler(req: import("express").Request, res: import("express").Response) {
  try {
    const payload = req.body as Buffer;
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const result = await handlePaystackWebhook(payload, signature);
    res.json(result);
  } catch (err) {
    if (err instanceof PaymentError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
