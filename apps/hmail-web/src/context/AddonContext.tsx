import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { startAddonCheckout, startMarketplaceCheckout } from "../utils/addonCheckout";
import { useAuth } from "./AuthContext";
import type { AddonItem, MarketplaceBrowseVertical, MarketplaceLicenseScope } from "../types/addon";

interface AddonContextValue {
  addons: AddonItem[];
  entitledSlugs: string[];
  loading: boolean;
  error: string;
  hasAddon: (slug: string) => boolean;
  refresh: () => Promise<void>;
  startTrial: (slug: string) => Promise<AddonItem>;
  startSubscription: (slug: string, scope: "user" | "tenant", seats?: number) => Promise<AddonItem | undefined>;
  quoteSubscription: (slug: string, scope: "user" | "tenant", seats?: number) => Promise<{
    scope: "user" | "tenant";
    seats: number;
    unitPriceCents: number;
    amountCents: number;
    tenantMemberCount: number;
    minTenantSeats: number;
    label: string;
  }>;
  quoteMarketplace: (input: {
    vertical: MarketplaceBrowseVertical;
    scope: MarketplaceLicenseScope;
    includePlatformBundle: boolean;
    includeVerticalBundle: boolean;
    seats?: number;
  }) => Promise<{
    vertical: MarketplaceBrowseVertical;
    scope: MarketplaceLicenseScope;
    seats: number;
    tenantMemberCount: number;
    minTenantSeats: number;
    amountCents: number;
    label: string;
    lines: Array<{
      bundle: "platform" | "vertical";
      label: string;
      addonSlugs: string[];
      anchorSlug: string;
      unitPriceCents: number;
      amountCents: number;
      isFree: boolean;
    }>;
  }>;
  startMarketplaceCheckout: (input: {
    vertical: MarketplaceBrowseVertical;
    scope: MarketplaceLicenseScope;
    includePlatformBundle: boolean;
    includeVerticalBundle: boolean;
    seats?: number;
  }) => Promise<{ mode: "checkout" | "activated" }>;
}

const AddonContext = createContext<AddonContextValue | null>(null);

export function AddonProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [entitledSlugs, setEntitledSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setAddons([]);
      setEntitledSlugs([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [addonRes, entRes] = await Promise.all([api.addons(), api.addonEntitlements()]);
      setAddons(addonRes.addons);
      setEntitledSlugs(entRes.slugs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startTrial = useCallback(
    async (slug: string) => {
      const { addon } = await api.startAddonTrial(slug);
      await refresh();
      return addon;
    },
    [refresh],
  );

  const startSubscription = useCallback(
    async (slug: string, scope: "user" | "tenant", seats?: number) => {
      const result = await startAddonCheckout({ slug, scope, seats, returnPath: "/addons" });
      if (result.addon) {
        await refresh();
        return result.addon;
      }
      return undefined;
    },
    [refresh],
  );

  const quoteSubscription = useCallback(async (slug: string, scope: "user" | "tenant", seats?: number) => {
    const { quote } = await api.addonPricingQuote(slug, scope, seats);
    return quote;
  }, []);

  const hasAddon = useCallback(
    (slug: string) => entitledSlugs.includes(slug),
    [entitledSlugs],
  );

  const quoteMarketplace = useCallback(
    async (input: {
      vertical: MarketplaceBrowseVertical;
      scope: MarketplaceLicenseScope;
      includePlatformBundle: boolean;
      includeVerticalBundle: boolean;
      seats?: number;
    }) => {
      const { quote } = await api.marketplaceQuote(input);
      return quote;
    },
    [],
  );

  const startMarketplaceCheckoutFn = useCallback(
    async (input: {
      vertical: MarketplaceBrowseVertical;
      scope: MarketplaceLicenseScope;
      includePlatformBundle: boolean;
      includeVerticalBundle: boolean;
      seats?: number;
    }) => {
      const result = await startMarketplaceCheckout({ ...input, returnPath: "/addons" });
      if (result.mode === "activated") {
        await refresh();
      }
      return { mode: result.mode };
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      addons,
      entitledSlugs,
      loading,
      error,
      hasAddon,
      refresh,
      startTrial,
      startSubscription,
      quoteSubscription,
      quoteMarketplace,
      startMarketplaceCheckout: startMarketplaceCheckoutFn,
    }),
    [
      addons,
      entitledSlugs,
      loading,
      error,
      hasAddon,
      refresh,
      startTrial,
      startSubscription,
      quoteSubscription,
      quoteMarketplace,
      startMarketplaceCheckoutFn,
    ],
  );

  return <AddonContext.Provider value={value}>{children}</AddonContext.Provider>;
}

export function useAddons() {
  const ctx = useContext(AddonContext);
  if (!ctx) throw new Error("useAddons must be used within AddonProvider");
  return ctx;
}
