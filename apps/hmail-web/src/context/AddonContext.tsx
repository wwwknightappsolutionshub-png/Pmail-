import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import type { AddonItem } from "../types/addon";

interface AddonContextValue {
  addons: AddonItem[];
  entitledSlugs: string[];
  loading: boolean;
  error: string;
  hasAddon: (slug: string) => boolean;
  refresh: () => Promise<void>;
  startTrial: (slug: string) => Promise<AddonItem>;
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

  const hasAddon = useCallback(
    (slug: string) => entitledSlugs.includes(slug),
    [entitledSlugs],
  );

  const value = useMemo(
    () => ({ addons, entitledSlugs, loading, error, hasAddon, refresh, startTrial }),
    [addons, entitledSlugs, loading, error, hasAddon, refresh, startTrial],
  );

  return <AddonContext.Provider value={value}>{children}</AddonContext.Provider>;
}

export function useAddons() {
  const ctx = useContext(AddonContext);
  if (!ctx) throw new Error("useAddons must be used within AddonProvider");
  return ctx;
}
