import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { usePresenceHeartbeat } from "../hooks/usePresenceHeartbeat";
import type { AuthUser } from "../types/mail";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const timeoutMs = 15_000;
    try {
      const { user: me } = await Promise.race([
        api.me(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("Auth check timed out")), timeoutMs);
        }),
      ]);
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  usePresenceHeartbeat(Boolean(user));

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      refresh,
      logout: async () => {
        try {
          await api.logout();
        } finally {
          setUser(null);
          sessionStorage.removeItem("pmail_tenant_slug");
          window.location.assign("/login");
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
