import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { startAddonCheckout, startMarketplaceCheckout } from "../utils/addonCheckout";
import { useAuth } from "./AuthContext";
import type { AddonItem, JobHunterEntitlement, MarketplaceBrowseVertical, MarketplaceLicenseScope, PanelWorkspaceTrialStatus } from "../types/addon";

interface AddonContextValue {
  addons: AddonItem[];
  entitledSlugs: string[];
  jobHunterEntitlement: JobHunterEntitlement | null;
  panelWorkspaceTrial: PanelWorkspaceTrialStatus | null;
  loading: boolean;
  error: string;
  hasAddon: (slug: string) => boolean;
  hasJobHunterAccess: () => boolean;
  jobHunterCanWrite: () => boolean;
  jobHunterReadOnly: () => boolean;
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
    includeJobHunterStandalone?: boolean;
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
      bundle: "platform" | "vertical" | "job-hunter";
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
    includeJobHunterStandalone?: boolean;
    seats?: number;
  }) => Promise<{ mode: "checkout" | "activated" }>;
}

const AddonContext = createContext<AddonContextValue | null>(null);

export function AddonProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [entitledSlugs, setEntitledSlugs] = useState<string[]>([]);
  const [jobHunterEntitlement, setJobHunterEntitlement] = useState<JobHunterEntitlement | null>(null);
  const [panelWorkspaceTrial, setPanelWorkspaceTrial] = useState<PanelWorkspaceTrialStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!user) {
      setAddons([]);
      setEntitledSlugs([]);
      setJobHunterEntitlement(null);
      setPanelWorkspaceTrial(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [addonRes, entRes] = await Promise.all([api.addons(), api.addonEntitlements()]);
      setAddons(addonRes.addons);
      setEntitledSlugs(entRes.slugs);
      setJobHunterEntitlement(entRes.jobHunter ?? null);
      setPanelWorkspaceTrial(entRes.panelWorkspaceTrial ?? null);
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

  const hasJobHunterAccess = useCallback(
    () => hasAddon("job-hunter-functionality") || Boolean(jobHunterEntitlement?.hasAccess),
    [hasAddon, jobHunterEntitlement],
  );

  const jobHunterCanWrite = useCallback(
    () => jobHunterEntitlement?.canWrite ?? hasAddon("job-hunter-functionality"),
    [jobHunterEntitlement, hasAddon],
  );

  const jobHunterReadOnly = useCallback(
    () => Boolean(jobHunterEntitlement?.readOnly),
    [jobHunterEntitlement],
  );

  const quoteMarketplace = useCallback(
    async (input: {
      vertical: MarketplaceBrowseVertical;
      scope: MarketplaceLicenseScope;
      includePlatformBundle: boolean;
      includeVerticalBundle: boolean;
      includeJobHunterStandalone?: boolean;
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
      includeJobHunterStandalone?: boolean;
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
      jobHunterEntitlement,
      panelWorkspaceTrial,
      loading,
      error,
      hasAddon,
      hasJobHunterAccess,
      jobHunterCanWrite,
      jobHunterReadOnly,
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
      jobHunterEntitlement,
      panelWorkspaceTrial,
      loading,
      error,
      hasAddon,
      hasJobHunterAccess,
      jobHunterCanWrite,
      jobHunterReadOnly,
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
