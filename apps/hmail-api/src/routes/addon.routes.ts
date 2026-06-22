import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isPaymentMockMode } from "../config/env.js";
import { quoteAddonSubscription } from "../services/addon-pricing.service.js";
import { createAddonSubscriptionCheckout, createMarketplaceCheckout } from "../services/payment.service.js";
import {
  quoteMarketplaceSelection,
  type MarketplaceBundleSelection,
} from "../services/marketplace-bundle.service.js";
import { prisma } from "../lib/prisma.js";
import {
  listAddonsForTenant,
  getActiveAddonSlugs,
  startAddonSubscription,
  startAddonTrial,
  type AddonSubscriptionScope,
} from "../services/addon.service.js";

export const addonRouter = Router();

addonRouter.use(requireAuth);

const subscribeSchema = z.object({
  scope: z.enum(["user", "tenant"]).default("user"),
  seats: z.coerce.number().int().min(1).optional(),
  provider: z.enum(["stripe", "paystack", "mock"]).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const marketplaceQuoteSchema = z.object({
  vertical: z.enum(["legal", "accounting", "real-estate", "recruitment", "b2b-services", "healthcare"]),
  scope: z.enum(["user", "tenant"]),
  includePlatformBundle: z.boolean(),
  includeVerticalBundle: z.boolean(),
  seats: z.coerce.number().int().min(1).optional(),
});

const marketplaceCheckoutSchema = marketplaceQuoteSchema.extend({
  provider: z.enum(["stripe", "paystack", "mock"]).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

addonRouter.post("/marketplace/quote", async (req, res, next) => {
  try {
    const body = marketplaceQuoteSchema.parse(req.body);
    const tenantId = req.auth!.user.tenant.id;
    const quote = await quoteMarketplaceSelection(tenantId, body as MarketplaceBundleSelection);
    res.json({ quote });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

addonRouter.post("/marketplace/checkout", async (req, res, next) => {
  try {
    const body = marketplaceCheckoutSchema.parse(req.body);
    const tenant = req.auth!.user.tenant;
    const user = req.auth!.user;
    const provider = body.provider ?? (isPaymentMockMode() ? "mock" : undefined);
    if (!provider) {
      res.status(400).json({
        error: "Payment provider is required. Configure STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY in .env.",
      });
      return;
    }

    const result = await createMarketplaceCheckout({
      provider,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      customerEmail: user.email,
      selection: {
        vertical: body.vertical,
        scope: body.scope,
        includePlatformBundle: body.includePlatformBundle,
        includeVerticalBundle: body.includeVerticalBundle,
        seats: body.seats,
      },
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

addonRouter.get("/", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const addons = await listAddonsForTenant(tenantId, req.auth!.user.id);
    res.json({ addons });
  } catch (err) {
    next(err);
  }
});

addonRouter.get("/entitlements", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const slugs = await getActiveAddonSlugs(tenantId, req.auth!.user.id);
    res.json({ slugs });
  } catch (err) {
    next(err);
  }
});

addonRouter.get("/:slug/pricing-quote", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const scope = req.query.scope === "tenant" ? "tenant" : ("user" as AddonSubscriptionScope);
    const seats = req.query.seats != null ? Number(req.query.seats) : undefined;
    const addon = await prisma.addon.findFirst({
      where: { slug: String(req.params.slug), isActive: true, deletedAt: null },
    });
    if (!addon) {
      res.status(404).json({ error: "Add-on not found" });
      return;
    }
    const quote = await quoteAddonSubscription(addon, tenantId, scope, seats);
    res.json({ quote });
  } catch (err) {
    next(err);
  }
});

addonRouter.post("/:slug/checkout", async (req, res, next) => {
  try {
    const body = subscribeSchema.parse(req.body);
    const tenant = req.auth!.user.tenant;
    const user = req.auth!.user;
    const provider = body.provider ?? (isPaymentMockMode() ? "mock" : undefined);
    if (!provider) {
      res.status(400).json({ error: "Payment provider is required. Configure STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY in .env." });
      return;
    }

    const result = await createAddonSubscriptionCheckout({
      provider,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      addonSlug: String(req.params.slug),
      scope: body.scope,
      seats: body.seats,
      customerEmail: user.email,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

addonRouter.post("/:slug/subscribe", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const userId = req.auth!.user.id;
    const slug = String(req.params.slug);
    const body = subscribeSchema.parse(req.body);

    if (isPaymentMockMode()) {
      const addon = await startAddonSubscription(tenantId, userId, slug, body.scope, body.seats);
      res.status(201).json({ addon, mode: "mock" });
      return;
    }

    const provider = body.provider;
    if (!provider || provider === "mock") {
      res.status(400).json({
        error: "Paid checkout is required. Pass provider stripe or paystack, or use POST /api/addons/:slug/checkout.",
      });
      return;
    }

    const result = await createAddonSubscriptionCheckout({
      provider,
      tenantId,
      tenantSlug: req.auth!.user.tenant.slug,
      userId,
      addonSlug: slug,
      scope: body.scope,
      seats: body.seats,
      customerEmail: req.auth!.user.email,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    res.status(201).json({ ...result, mode: "checkout" });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

addonRouter.post("/:slug/trial", async (req, res, next) => {
  try {
    const tenantId = req.auth!.user.tenant.id;
    const userEmail = req.auth!.user.email;
    const slug = String(req.params.slug);
    const addon = await startAddonTrial(tenantId, slug, userEmail);
    res.status(201).json({ addon });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});
