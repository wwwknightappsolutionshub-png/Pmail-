import type {
  AddonMarketing,
  AdminDashboardPayload,
  AuditLogEntry,
  HostingAccountAdmin,
  HostingPlan,
  PanelDashboard,
  PlatformAdmin,
  PlatformAdminRecord,
  PublicSitePayload,
  SiteSection,
  TenantAdmin,
  TenantOpsPayload,
  VpsInstance,
} from "../types/site";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = (await res.json()) as { error?: string };
      message = data.error ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  publicSite: () => request<PublicSitePayload>("/api/public/site"),

  adminLogin: (body: { email: string; password: string }) =>
    request<{ token: string; admin: PlatformAdmin }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminLogout: () => request<{ ok: boolean }>("/api/admin/auth/logout", { method: "POST" }),
  adminMe: () => request<{ admin: PlatformAdmin }>("/api/admin/auth/me"),

  adminSections: () => request<{ sections: SiteSection[] }>("/api/admin/sections"),
  createSection: (body: Partial<SiteSection> & { sectionKey: string; title: string }) =>
    request<{ section: SiteSection }>("/api/admin/sections", { method: "POST", body: JSON.stringify(body) }),
  updateSection: (id: string, body: Partial<SiteSection>) =>
    request<{ section: SiteSection }>(`/api/admin/sections/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSection: (id: string) => request<void>(`/api/admin/sections/${id}`, { method: "DELETE" }),

  adminDashboard: () => request<{ dashboard: AdminDashboardPayload }>("/api/admin/dashboard"),
  adminAuditLog: (limit = 50) =>
    request<{ logs: AuditLogEntry[] }>(`/api/admin/audit-log?limit=${limit}`),

  adminHostingPlans: () => request<{ hostingPlans: HostingPlan[] }>("/api/admin/hosting-plans"),
  createHostingPlan: (body: Partial<HostingPlan> & { slug: string; name: string; priceCents: number }) =>
    request<{ plan: HostingPlan }>("/api/admin/hosting-plans", { method: "POST", body: JSON.stringify(body) }),
  updateHostingPlan: (id: string, body: Partial<HostingPlan>) =>
    request<{ plan: HostingPlan }>(`/api/admin/hosting-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteHostingPlan: (id: string) => request<void>(`/api/admin/hosting-plans/${id}`, { method: "DELETE" }),

  adminAddonMarketing: () => request<{ addonMarketing: AddonMarketing[] }>("/api/admin/addon-marketing"),
  updateAddonMarketing: (id: string, body: Partial<AddonMarketing>) =>
    request<{ item: AddonMarketing }>(`/api/admin/addon-marketing/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAddonMarketing: (id: string) => request<void>(`/api/admin/addon-marketing/${id}`, { method: "DELETE" }),

  adminTenants: () => request<{ tenants: TenantAdmin[] }>("/api/admin/tenants"),
  createTenant: (body: { slug: string; name: string }) =>
    request<{ tenant: TenantAdmin }>("/api/admin/tenants", { method: "POST", body: JSON.stringify(body) }),
  updateTenant: (id: string, body: Partial<{ slug: string; name: string; isActive: boolean }>) =>
    request<{ tenant: TenantAdmin }>(`/api/admin/tenants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTenant: (id: string) => request<void>(`/api/admin/tenants/${id}`, { method: "DELETE" }),
  adminTenantOps: (id: string) => request<{ ops: TenantOpsPayload }>(`/api/admin/tenants/${id}/ops`),
  updateTenantBranding: (
    id: string,
    body: Partial<{
      productName: string;
      logoUrl: string | null;
      primaryColor: string;
      accentColor: string;
      backgroundColor: string;
      loginTagline: string;
    }>,
  ) =>
    request<{ branding: TenantOpsPayload["branding"] }>(`/api/admin/tenants/${id}/branding`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateTenantMail: (
    id: string,
    body: Partial<{
      imapHost: string;
      imapPort: number;
      imapSecure: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
    }>,
  ) =>
    request<{ mail: TenantOpsPayload["mail"] }>(`/api/admin/tenants/${id}/mail`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createTenantMailUser: (tenantId: string, body: { email: string; displayName?: string | null }) =>
    request<{ user: TenantOpsPayload["users"][number] }>(`/api/admin/tenants/${tenantId}/mail-users`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateTenantMailUser: (
    tenantId: string,
    userId: string,
    body: Partial<{ displayName: string | null; isActive: boolean }>,
  ) =>
    request<{ user: TenantOpsPayload["users"][number] }>(
      `/api/admin/tenants/${tenantId}/mail-users/${userId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  deleteTenantMailUser: (tenantId: string, userId: string) =>
    request<void>(`/api/admin/tenants/${tenantId}/mail-users/${userId}`, { method: "DELETE" }),
  grantTenantAddonTrial: (tenantId: string, body: { addonSlug: string; trialDays?: number }) =>
    request<{ trial: TenantOpsPayload["trials"][number] }>(`/api/admin/tenants/${tenantId}/addon-trials`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeTenantAddonTrial: (tenantId: string, trialId: string) =>
    request<void>(`/api/admin/tenants/${tenantId}/addon-trials/${trialId}`, { method: "DELETE" }),

  adminHostingAccounts: () => request<{ hostingAccounts: HostingAccountAdmin[] }>("/api/admin/hosting-accounts"),
  createHostingAccount: (body: {
    tenantId: string;
    username: string;
    domain: string;
    password: string;
    planId?: string | null;
  }) =>
    request<{ account: HostingAccountAdmin }>("/api/admin/hosting-accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateHostingAccount: (
    id: string,
    body: Partial<{
      planId: string | null;
      password: string;
      diskQuotaMb: number;
      isSuspended: boolean;
    }>,
  ) =>
    request<{ account: HostingAccountAdmin }>(`/api/admin/hosting-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteHostingAccount: (id: string) => request<void>(`/api/admin/hosting-accounts/${id}`, { method: "DELETE" }),

  adminVps: () => request<{ vpsInstances: VpsInstance[] }>("/api/admin/vps"),
  createVps: (body: Partial<VpsInstance> & { label: string; hostname: string }) =>
    request<{ vps: VpsInstance }>("/api/admin/vps", { method: "POST", body: JSON.stringify(body) }),
  updateVps: (id: string, body: Partial<VpsInstance>) =>
    request<{ vps: VpsInstance }>(`/api/admin/vps/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteVps: (id: string) => request<void>(`/api/admin/vps/${id}`, { method: "DELETE" }),

  adminPlatformAdmins: () => request<{ platformAdmins: PlatformAdminRecord[] }>("/api/admin/platform-admins"),
  createPlatformAdmin: (body: {
    email: string;
    name: string;
    password: string;
    role?: "super_admin" | "admin";
  }) =>
    request<{ admin: PlatformAdminRecord }>("/api/admin/platform-admins", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updatePlatformAdmin: (
    id: string,
    body: Partial<{
      email: string;
      name: string;
      password: string;
      role: "super_admin" | "admin";
      isActive: boolean;
    }>,
  ) =>
    request<{ admin: PlatformAdminRecord }>(`/api/admin/platform-admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deletePlatformAdmin: (id: string) => request<void>(`/api/admin/platform-admins/${id}`, { method: "DELETE" }),

  panelLogin: (body: { username: string; domain: string; password: string }) =>
    request<{ token: string; account: import("../types/site").PanelAccount }>("/api/panel/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  panelLogout: () => request<{ ok: boolean }>("/api/panel/auth/logout", { method: "POST" }),
  panelMe: () => request<{ account: import("../types/site").PanelAccount }>("/api/panel/auth/me"),
  panelDashboard: () => request<PanelDashboard>("/api/panel/dashboard"),
  panelFiles: () =>
    request<{ path: string; entries: Array<{ name: string; type: string; size: number | null }> }>(
      "/api/panel/files",
    ),
  panelDatabases: () =>
    request<{ databases: Array<{ id: string; name: string; sizeMb: number }> }>("/api/panel/databases"),
  panelDomains: () =>
    request<{ domains: Array<{ domain: string; documentRoot: string; ssl: boolean; primary?: boolean }> }>(
      "/api/panel/domains",
    ),
  panelEmail: () =>
    request<{ accounts: Array<{ address: string; quotaMb: number; usedMb: number }>; hmailUrl: string }>(
      "/api/panel/email",
    ),

  paymentProviders: () =>
    request<{ providers: import("../types/site").PaymentProviderInfo[]; currency: string; mockMode: boolean }>(
      "/api/payments/providers",
    ),
  createPaymentCheckout: (body: {
    provider: "stripe" | "paystack" | "mock";
    productType: "hosting_plan" | "addon";
    productSlug: string;
    tenantSlug: string;
    customerEmail: string;
    successUrl?: string;
    cancelUrl?: string;
  }) =>
    request<{ checkout: import("../types/site").PaymentCheckout }>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPaymentCheckout: (id: string) =>
    request<{ checkout: import("../types/site").PaymentCheckout }>(`/api/payments/checkout/${id}`),
  mockCompletePayment: (id: string) =>
    request<{ checkout: import("../types/site").PaymentCheckout }>(`/api/payments/mock/complete/${id}`, {
      method: "POST",
    }),
};

export function formatPrice(cents: number, period = "monthly"): string {
  if (cents === 0) return "Free";
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, "");
  return `$${dollars}/${period === "yearly" ? "yr" : "mo"}`;
}
