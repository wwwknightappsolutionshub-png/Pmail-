import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "../../api/client";
import type { GrowthPlanSnapshot, GrowthTeamRole } from "../../types/growth";

type GrowthContextValue = {
  plan: GrowthPlanSnapshot | null;
  role: GrowthTeamRole | null;
  isOwner: boolean;
  loading: boolean;
  reload: () => Promise<void>;
};

const GrowthContext = createContext<GrowthContextValue | null>(null);

export function GrowthProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<GrowthPlanSnapshot | null>(null);
  const [role, setRole] = useState<GrowthTeamRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const res = await api.growthPlan();
    setPlan(res.plan);
    setRole(res.role);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reload();
      } catch {
        if (!cancelled) {
          setPlan(null);
          setRole(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      plan,
      role,
      isOwner: role === "owner",
      loading,
      reload,
    }),
    [plan, role, loading],
  );

  return <GrowthContext.Provider value={value}>{children}</GrowthContext.Provider>;
}

export function useGrowthContext() {
  const ctx = useContext(GrowthContext);
  if (!ctx) throw new Error("useGrowthContext must be used within GrowthProvider");
  return ctx;
}

export function isGrowthLimitError(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.status === 402 || err.status === 403);
}

export function isUpgradeableError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === "limit_reached";
}
