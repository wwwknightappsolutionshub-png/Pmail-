export const GROWTH_ADDON_SLUG = "prohost-growth";

export type GrowthPlanSlug = "starter" | "pro" | "agency";
export type GrowthTeamRole = "owner" | "marketer";

/** Checkout product slugs mapped to workspace plan tiers. */
export const GROWTH_PLAN_CHECKOUT_SLUGS: Record<GrowthPlanSlug, string> = {
  starter: "prohost-growth",
  pro: "prohost-growth-pro",
  agency: "prohost-growth-agency",
};

const CHECKOUT_SLUG_TO_PLAN = Object.fromEntries(
  Object.entries(GROWTH_PLAN_CHECKOUT_SLUGS).map(([plan, slug]) => [slug, plan]),
) as Record<string, GrowthPlanSlug>;

export function resolveGrowthPlanFromCheckoutSlug(productSlug: string): GrowthPlanSlug | null {
  return CHECKOUT_SLUG_TO_PLAN[productSlug] ?? null;
}

export function getGrowthCheckoutSlug(planSlug: GrowthPlanSlug): string {
  return GROWTH_PLAN_CHECKOUT_SLUGS[planSlug];
}

export type GrowthPlanLimits = {
  leadsPerMonth: number;
  automations: number;
  publishedPages: number;
  analytics: boolean;
  chatbot: boolean;
};

export type GrowthPlanDefinition = {
  slug: GrowthPlanSlug;
  name: string;
  priceCents: number;
  limits: GrowthPlanLimits;
};

export const GROWTH_PLAN_CATALOG: Record<GrowthPlanSlug, GrowthPlanDefinition> = {
  starter: {
    slug: "starter",
    name: "Starter",
    priceCents: 4900,
    limits: {
      leadsPerMonth: 50,
      automations: 5,
      publishedPages: 5,
      analytics: false,
      chatbot: true,
    },
  },
  pro: {
    slug: "pro",
    name: "Pro",
    priceCents: 14900,
    limits: {
      leadsPerMonth: 500,
      automations: 15,
      publishedPages: 20,
      analytics: true,
      chatbot: true,
    },
  },
  agency: {
    slug: "agency",
    name: "Agency",
    priceCents: 39900,
    limits: {
      leadsPerMonth: 5000,
      automations: 50,
      publishedPages: 100,
      analytics: true,
      chatbot: true,
    },
  },
};

export function isGrowthPlanSlug(value: string): value is GrowthPlanSlug {
  return value === "starter" || value === "pro" || value === "agency";
}

export function isGrowthTeamRole(value: string): value is GrowthTeamRole {
  return value === "owner" || value === "marketer";
}
