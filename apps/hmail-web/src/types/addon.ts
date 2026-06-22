export type AddonGroup =
  | "ircc_inbox"
  | "ai_tools"
  | "client_work"
  | "communications"
  | "compliance"
  | "industry_tools"
  | "growth";

export type AddonVertical =
  | "legal"
  | "real-estate"
  | "accounting"
  | "recruitment"
  | "b2b-services"
  | "healthcare"
  | "platform";
export type WorkspaceVertical = AddonVertical | "free-basic" | "standard";

export function isBasicMailingWorkspace(vertical: WorkspaceVertical | null | undefined): boolean {
  return vertical === "free-basic" || vertical === "standard";
}

export type AddonReleasePhase = 1 | 2 | 3;

export type AddonAccessStatus = "none" | "trial" | "active" | "expired";

export interface AddonItem {
  id: string;
  slug: string;
  name: string;
  group: AddonGroup;
  vertical: AddonVertical;
  description: string;
  features: string[];
  sortOrder: number;
  priceCents: number;
  tenantPriceCents: number;
  minTenantSeats: number;
  isPaid: boolean;
  addonKind: "vertical" | "platform" | "system" | string;
  releasePhase: AddonReleasePhase;
  comingSoon: boolean;
  accessStatus: AddonAccessStatus;
  trialEndsAt?: string;
  trialDaysLeft?: number;
  canStartTrial: boolean;
}

export const ADDON_GROUP_LABELS: Record<AddonGroup, string> = {
  ircc_inbox: "IRCC Inbox",
  ai_tools: "AI Tools",
  client_work: "Client Work",
  communications: "Communications",
  compliance: "Compliance",
  industry_tools: "Industry tools",
  growth: "Prohost Growth",
};

export const ADDON_GROUP_ORDER: AddonGroup[] = [
  "ircc_inbox",
  "ai_tools",
  "client_work",
  "communications",
  "compliance",
  "industry_tools",
  "growth",
];

export type MarketplaceLicenseScope = "user" | "tenant";

export type MarketplaceBrowseVertical = Exclude<AddonVertical, "platform">;

export const MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS = 1500;
export const MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS = 3000;
export const MARKETPLACE_VERTICAL_BUNDLE_TENANT_SEAT_PRICE_CENTS = 2000;
export const MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS = 5;

export const MARKETPLACE_PLATFORM_BUNDLE_SLUGS = [
  "whatsapp-functionality",
  "mail2pdf-functionality",
  "full-calendar-functionality",
  "scheduled-send",
  "open-tracking",
  "auto-reply-functionality",
] as const;

export const MARKETPLACE_VERTICAL_BUNDLE_SLUGS: Record<MarketplaceBrowseVertical, readonly string[]> = {
  legal: ["immigration-desk", "immigration-templates", "program-checklists", "compliance-pack"],
  accounting: ["ac-document-intake", "ac-filing-calendar", "ac-secure-exchange", "ac-client-entities"],
  "real-estate": ["re-listing-board", "re-showing-scheduler", "re-quick-replies", "re-deal-room"],
  recruitment: ["rc-role-pipeline", "rc-interview-desk", "rc-bulk-outreach", "rc-talent-search"],
  "b2b-services": ["b2b-client-workspaces", "b2b-project-tracker", "b2b-proposal-desk", "b2b-sla-monitor"],
  healthcare: ["hc-patient-registry", "hc-appointment-desk", "hc-referral-tracker", "hc-hipaa-audit"],
};

export const MARKETPLACE_VERTICAL_ORDER: MarketplaceBrowseVertical[] = [
  "legal",
  "accounting",
  "real-estate",
  "recruitment",
  "b2b-services",
  "healthcare",
];

export const MARKETPLACE_VERTICAL_LABELS: Record<MarketplaceBrowseVertical, string> = {
  legal: "Legal & Immigration",
  accounting: "Accounting",
  "real-estate": "Real Estate",
  recruitment: "Recruitment",
  "b2b-services": "B2B Services",
  healthcare: "Healthcare",
};

export function isPlatformWorkspaceAddon(addon: Pick<AddonItem, "addonKind" | "vertical" | "slug">): boolean {
  return (
    MARKETPLACE_PLATFORM_BUNDLE_SLUGS.includes(addon.slug as (typeof MARKETPLACE_PLATFORM_BUNDLE_SLUGS)[number]) ||
    addon.slug === "bespoke-workspace"
  );
}

export function isVerticalBundleAddon(addon: Pick<AddonItem, "slug">, vertical: MarketplaceBrowseVertical): boolean {
  return MARKETPLACE_VERTICAL_BUNDLE_SLUGS[vertical].includes(addon.slug);
}

export function isVerticalWorkspaceAddon(
  addon: Pick<AddonItem, "addonKind" | "vertical" | "slug">,
  vertical: MarketplaceBrowseVertical,
): boolean {
  return addon.addonKind === "vertical" && addon.vertical === vertical && isVerticalBundleAddon(addon, vertical);
}

export function formatMarketplaceBundlePrice(scope: MarketplaceLicenseScope, bundle: "platform" | "vertical", seats = 5): string {
  if (bundle === "platform") {
    return scope === "tenant" ? "Free for tenant" : `$${(MARKETPLACE_PLATFORM_BUNDLE_USER_PRICE_CENTS / 100).toFixed(2)}/mo for all 6 tools`;
  }
  if (scope === "tenant") {
    const unit = MARKETPLACE_VERTICAL_BUNDLE_TENANT_SEAT_PRICE_CENTS / 100;
    return `$${unit.toFixed(2)}/mo per seat · min ${MARKETPLACE_VERTICAL_BUNDLE_MIN_TENANT_SEATS} seats (${seats} billed)`;
  }
  return `$${(MARKETPLACE_VERTICAL_BUNDLE_USER_PRICE_CENTS / 100).toFixed(2)}/mo for all 4 tools`;
}

export function formatMarketplaceAddonPrice(addon: AddonItem, scope: MarketplaceLicenseScope): string {
  if (!addon.isPaid) return "Included in bundle";
  if (addon.addonKind === "platform") {
    return formatMarketplaceBundlePrice(scope, "platform");
  }
  if (addon.addonKind === "vertical") {
    return formatMarketplaceBundlePrice(scope, "vertical");
  }
  const cents = scope === "user" ? addon.priceCents : addon.tenantPriceCents;
  const amount = `$${(cents / 100).toFixed(2)}/mo`;
  if (scope === "tenant") {
    return addon.addonKind === "vertical"
      ? `${amount} per seat · min ${addon.minTenantSeats} seats`
      : `${amount} per seat`;
  }
  return `${amount} per user`;
}
