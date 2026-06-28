import type {
  AddonMarketing,
  AdminAddon,
  AdminDashboardPayload,
  AdminMailUserPresenceStats,
  AdminMailUserRecord,
  AdminMailUserSession,
  AdminPollSnapshot,
  AdminSystemStatus,
  AdminTrends,
  BillingRevenueDashboard,
  AuditLogEntry,
  HostingAccountAdmin,
  HostingPlan,
  PanelDashboard,
  PlatformAdmin,
  PlatformAdminRecord,
  PmailPlatformConfig,
  PublicSitePayload,
  SiteSection,
  TenantAdmin,
  TenantOpsPayload,
  VpsInstance,
} from "../types/site";

/** In Vite dev, use same-origin `/api` proxy so panel session cookies stay on :5174. */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL ?? "";
  if (!import.meta.env.DEV || typeof window === "undefined") return configured;
  if (!configured) return "";
  try {
    const apiUrl = new URL(configured);
    const pageHost = window.location.hostname;
    const pagePort = window.location.port;
    if (
      (apiUrl.hostname === pageHost || apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1") &&
      apiUrl.port &&
      pagePort &&
      apiUrl.port !== pagePort
    ) {
      return "";
    }
  } catch {
    return configured;
  }
  return configured;
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the platform API. Start the project with npm run dev (or npm run dev -w hmail-api) and try again.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (!res.ok) {
    let message = "Request failed";
    let code: string | undefined;
    try {
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
      };
      message = data.error ?? message;
      code = data.code;
      if (message === "Validation failed" && data.details) {
        const fieldMessages = Object.entries(data.details.fieldErrors ?? {}).flatMap(([field, messages]) =>
          (messages ?? []).map((entry) => `${field}: ${entry}`),
        );
        const formMessages = data.details.formErrors ?? [];
        const parts = [...formMessages, ...fieldMessages];
        if (parts.length > 0) message = parts.join("; ");
      }
    } catch {
      if (res.status >= 500) {
        message =
          "Platform API is unavailable. Start hmail-api (npm run dev from the project root) and try again.";
      }
    }
    if (message === "Request failed" && res.status >= 500) {
      message =
        "Platform API is unavailable. Start hmail-api (npm run dev from the project root) and try again.";
    }
    throw new ApiError(message, res.status, code);
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
  reorderSections: (order: { id: string; sortOrder: number }[]) =>
    request<{ sections: SiteSection[] }>("/api/admin/sections/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),

  adminPoll: () => request<AdminPollSnapshot>("/api/admin/poll"),
  adminMailUsers: (params?: {
    q?: string;
    tenantId?: string;
    onlineOnly?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.tenantId) search.set("tenantId", params.tenantId);
    if (params?.onlineOnly) search.set("onlineOnly", "1");
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return request<{
      users: AdminMailUserRecord[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/api/admin/mail-users${query ? `?${query}` : ""}`);
  },
  adminMailUsersOnline: () =>
    request<{ users: AdminMailUserRecord[]; asOf: string }>("/api/admin/mail-users/online"),
  adminMailUserPresence: () => request<{ stats: AdminMailUserPresenceStats }>("/api/admin/mail-users/presence"),
  adminMailUserSessions: (userId: string) =>
    request<{ sessions: AdminMailUserSession[]; asOf: string }>(`/api/admin/mail-users/${userId}/sessions`),
  adminActiveMailUserSessions: (params?: { userId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.userId) search.set("userId", params.userId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return request<{ sessions: AdminMailUserSession[]; asOf: string }>(
      `/api/admin/mail-users/sessions${query ? `?${query}` : ""}`,
    );
  },
  adminDashboard: () => request<{ dashboard: AdminDashboardPayload }>("/api/admin/dashboard"),
  adminSystemStatus: () => request<AdminSystemStatus>("/api/admin/system-status"),
  adminPmailPlatformConfig: () => request<{ config: PmailPlatformConfig }>("/api/admin/pmail-platform-config"),
  updateAdminPmailPlatformConfig: (body: {
    mailPushEnabled?: boolean;
    mailPushDefaultForUsers?: boolean;
    pwaPushAutoSubscribe?: boolean;
  }) =>
    request<{ config: PmailPlatformConfig }>("/api/admin/pmail-platform-config", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adminPmailPushStats: () =>
    request<{
      pushEnabledUsers: number;
      subscribedUsers: number;
      deviceSubscriptions: number;
      vapidConfigured: boolean;
    }>("/api/admin/pmail-push/stats"),
  broadcastAdminPmailPush: (body: { title: string; body: string; url?: string; tenantId?: string }) =>
    request<{ targetedUsers: number; delivered: number }>("/api/admin/pmail-push/broadcast", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminTrends: (days = 30) => request<{ trends: AdminTrends }>(`/api/admin/analytics/trends?days=${days}`),
  adminBillingRevenue: () => request<{ revenue: BillingRevenueDashboard }>("/api/admin/billing/revenue"),
  adminAuditLog: (limit = 50) =>
    request<{ logs: AuditLogEntry[] }>(`/api/admin/audit-log?limit=${limit}`),

  adminHostingPlans: () => request<{ hostingPlans: HostingPlan[] }>("/api/admin/hosting-plans"),
  createHostingPlan: (body: Partial<HostingPlan> & { slug: string; name: string; priceCents: number }) =>
    request<{ plan: HostingPlan }>("/api/admin/hosting-plans", { method: "POST", body: JSON.stringify(body) }),
  updateHostingPlan: (id: string, body: Partial<HostingPlan>) =>
    request<{ plan: HostingPlan }>(`/api/admin/hosting-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteHostingPlan: (id: string) => request<void>(`/api/admin/hosting-plans/${id}`, { method: "DELETE" }),

  adminAddonMarketing: () => request<{ addonMarketing: AddonMarketing[] }>("/api/admin/addon-marketing"),
  adminAddons: () => request<{ addons: AdminAddon[] }>("/api/admin/addons"),
  syncAdminAddonCatalog: () =>
    request<{ addonCount: number; marketingCount: number; addons: AdminAddon[] }>("/api/admin/addons/sync-catalog", {
      method: "POST",
    }),
  createAdminAddon: (body: Partial<AdminAddon> & { slug: string; name: string; group: string; vertical: string; description: string; features: string[] }) =>
    request<{ addon: AdminAddon }>("/api/admin/addons", { method: "POST", body: JSON.stringify(body) }),
  updateAdminAddon: (id: string, body: Partial<AdminAddon>) =>
    request<{ addon: AdminAddon }>(`/api/admin/addons/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAdminAddon: (id: string) => request<void>(`/api/admin/addons/${id}`, { method: "DELETE" }),
  updateAddonMarketing: (id: string, body: Partial<AddonMarketing>) =>
    request<{ item: AddonMarketing }>(`/api/admin/addon-marketing/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAddonMarketing: (id: string) => request<void>(`/api/admin/addon-marketing/${id}`, { method: "DELETE" }),

  adminTestimonials: () => request<{ testimonials: import("../types/site").Testimonial[] }>("/api/admin/testimonials"),
  createAdminTestimonial: (body: Partial<import("../types/site").Testimonial> & { authorName: string; body: string }) =>
    request<{ testimonial: import("../types/site").Testimonial }>("/api/admin/testimonials", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAdminTestimonial: (id: string, body: Partial<import("../types/site").Testimonial>) =>
    request<{ testimonial: import("../types/site").Testimonial }>(`/api/admin/testimonials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAdminTestimonial: (id: string) => request<void>(`/api/admin/testimonials/${id}`, { method: "DELETE" }),
  approveAdminTestimonial: (id: string) =>
    request<{ testimonial: import("../types/site").Testimonial }>(`/api/admin/testimonials/${id}/approve`, {
      method: "PATCH",
    }),
  rejectAdminTestimonial: (id: string) =>
    request<{ testimonial: import("../types/site").Testimonial }>(`/api/admin/testimonials/${id}/reject`, {
      method: "PATCH",
    }),

  uploadMarketingAsset: (body: { fileName: string; mimeType: string; dataBase64: string }) =>
    request<{ asset: { url: string; fileName: string } }>("/api/admin/marketing/upload-asset", {
      method: "POST",
      body: JSON.stringify(body),
    }),

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
  grantTenantAddonSubscription: (tenantId: string, body: { addonSlug: string; periodDays?: number }) =>
    request<{ subscription: TenantOpsPayload["subscriptions"][number] & { planSlug?: string | null } }>(
      `/api/admin/tenants/${tenantId}/addon-subscriptions`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  revokeTenantAddonSubscription: (tenantId: string, subscriptionId: string) =>
    request<void>(`/api/admin/tenants/${tenantId}/addon-subscriptions/${subscriptionId}`, {
      method: "DELETE",
    }),
  adminSetTenantGrowthPlan: (
    tenantId: string,
    body: { planSlug: "starter" | "pro" | "agency"; planTierOverride?: boolean },
  ) =>
    request<{ growth: Extract<TenantOpsPayload["growth"], { hasWorkspace: true }> }>(
      `/api/admin/tenants/${tenantId}/growth-plan`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

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
    request<{ path: string; entries: Array<{ id: string; name: string; type: string; size: number | null }> }>(
      "/api/panel/files",
    ),
  panelDatabases: () =>
    request<{ databases: Array<{ id: string; name: string; sizeMb: number }> }>("/api/panel/databases"),
  panelDomains: () =>
    request<{ domains: Array<{ domain: string; documentRoot: string; ssl: boolean; primary?: boolean }> }>(
      "/api/panel/domains",
    ),
  panelEmail: () =>
    request<{ accounts: Array<{ id: string; address: string; quotaMb: number; usedMb: number }>; hmailUrl: string }>(
      "/api/panel/email",
    ),
  createPanelFile: (body: { parentPath?: string; name: string; type?: "file" | "dir"; content?: string }) =>
    request<{ entry: { id: string; name: string; type: string; size: number | null } }>("/api/panel/files", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deletePanelFile: (id: string) => request<void>(`/api/panel/files/${id}`, { method: "DELETE" }),
  createPanelDatabase: (name: string) =>
    request<{ database: { id: string; name: string; sizeMb: number } }>("/api/panel/databases", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deletePanelDatabase: (id: string) => request<void>(`/api/panel/databases/${id}`, { method: "DELETE" }),
  createPanelDomain: (domain: string) =>
    request<{ domain: { domain: string; documentRoot: string; ssl: boolean } }>("/api/panel/domains", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
  createPanelMailbox: (body: { address: string; quotaMb?: number }) =>
    request<{ mailbox: { id: string; address: string; quotaMb: number; usedMb: number } }>("/api/panel/email", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deletePanelMailbox: (id: string) => request<void>(`/api/panel/email/${id}`, { method: "DELETE" }),
  submitLead: (body: {
    fullName: string;
    email: string;
    company: string;
    teamSize?: string;
    message?: string;
    consentPrivacy?: boolean;
    consentContact?: boolean;
  }) =>
    request<{ lead: { id: string } }>("/api/public/leads", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  paymentProviders: () =>
    request<{ providers: import("../types/site").PaymentProviderInfo[]; currency: string; mockMode: boolean }>(
      "/api/payments/providers",
    ),
  createPaymentCheckout: (body: {
    provider: "stripe" | "paystack" | "mock";
    productType: "hosting_plan" | "addon";
    productSlug: string;
    tenantSlug?: string;
    customerEmail: string;
    successUrl?: string;
    cancelUrl?: string;
    provision?: {
      orgName: string;
      domain?: string;
    };
  }) =>
    request<{ checkout: import("../types/site").PaymentCheckout }>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPaymentCheckout: (id: string) =>
    request<{ checkout: import("../types/site").PaymentCheckout }>(`/api/payments/checkout/${id}`),
  mockCompletePayment: (id: string) =>
    request<{
      checkout: import("../types/site").PaymentCheckout;
      provisioning?: {
        tenantSlug: string;
        panelLoginId: string;
        panelPassword: string;
        pmailUserEmail: string;
      };
    }>(`/api/payments/mock/complete/${id}`, {
      method: "POST",
    }),

  adminLeads: (params?: { status?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ leads: import("../types/site").MarketingLead[] }>(`/api/admin/leads${qs ? `?${qs}` : ""}`);
  },
  adminLeadStats: () => request<{ stats: import("../types/site").MarketingLeadStats }>("/api/admin/leads/stats"),
  adminReferralLeads: (params?: { emailStatus?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.emailStatus) search.set("emailStatus", params.emailStatus);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ leads: import("../pages/admin/AdminReferralLeadsPanel").PmailReferralLead[] }>(
      `/api/admin/referral-leads${qs ? `?${qs}` : ""}`,
    );
  },
  adminReferralLeadStats: () =>
    request<{
      stats: { total: number; delivered: number; read: number; bounced: number; pending: number; converted: number };
    }>("/api/admin/referral-leads/stats"),
  adminPmailProspects: (params?: { status?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ prospects: import("../pages/admin/AdminPmailProspectsPanel").PmailProspectRow[] }>(
      `/api/admin/pmail-prospects${qs ? `?${qs}` : ""}`,
    );
  },
  adminPmailProspectStats: () =>
    request<{
      stats: {
        total: number;
        funnel: Record<string, number>;
        newThisWeek: number;
        unconverted: number;
      };
    }>("/api/admin/pmail-prospects/stats"),
  updateAdminLead: (id: string, body: { status?: import("../types/site").MarketingLead["status"]; notes?: string | null }) =>
    request<{ lead: import("../types/site").MarketingLead }>(`/api/admin/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  convertAdminLead: (id: string) =>
    request<{
      tenant: { id: string; slug: string; name: string };
      panelLoginId: string;
      panelPassword: string;
      pmailUserEmail: string;
    }>(`/api/admin/leads/${id}/convert`, { method: "POST" }),

  publicForms: () => request<{ forms: import("../types/site").PublicFormDefinition[] }>("/api/public/forms"),
  publicTestimonials: () => request<{ testimonials: import("../types/site").Testimonial[] }>("/api/public/testimonials"),
  submitTestimonial: (body: {
    authorName: string;
    authorRole?: string;
    company?: string;
    body: string;
    rating: number;
    captchaToken: string;
  }) =>
    request<{ testimonial: { id: string }; message: string }>("/api/public/testimonials", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitMembership: (body: {
    payload: Record<string, string>;
    consentPrivacy: boolean;
    captchaToken: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
    referralRef?: string;
  }) =>
    request<{ application: { id: string; status: string } }>("/api/public/membership/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  submitInquiry: (body: {
    payload: Record<string, string>;
    captchaToken: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer?: string;
  }) =>
    request<{ inquiry: { id: string; status: string } }>("/api/public/inquiries", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  adminSalesOverview: () =>
    request<{ overview: import("../types/site").SalesPipelineOverview }>("/api/admin/sales/pipeline/overview"),
  adminSalesTrends: (days = 30) =>
    request<{ trends: { days: number; series: Array<{ date: string; membership: number; inquiries: number; leads: number }>; hostingScaleMix: Record<string, number> } }>(
      `/api/admin/sales/pipeline/trends?days=${days}`,
    ),
  adminMembership: (params?: { status?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ applications: import("../types/site").MembershipApplication[] }>(
      `/api/admin/sales/membership${qs ? `?${qs}` : ""}`,
    );
  },
  updateAdminMembership: (id: string, body: Partial<import("../types/site").MembershipApplication>) =>
    request<{ application: import("../types/site").MembershipApplication }>(`/api/admin/sales/membership/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAdminMembership: (id: string) => request<void>(`/api/admin/sales/membership/${id}`, { method: "DELETE" }),
  pushMembershipToLeads: (id: string) =>
    request<{ application: import("../types/site").MembershipApplication; leadId: string }>(
      `/api/admin/sales/membership/${id}/push-to-leads`,
      { method: "POST" },
    ),
  adminInquiries: (params?: { status?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<{ inquiries: import("../types/site").InquirySubmission[] }>(
      `/api/admin/sales/inquiries${qs ? `?${qs}` : ""}`,
    );
  },
  updateAdminInquiry: (id: string, body: Partial<import("../types/site").InquirySubmission>) =>
    request<{ inquiry: import("../types/site").InquirySubmission }>(`/api/admin/sales/inquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAdminInquiry: (id: string) => request<void>(`/api/admin/sales/inquiries/${id}`, { method: "DELETE" }),
  pushInquiryToLeads: (id: string) =>
    request<{ inquiry: import("../types/site").InquirySubmission; leadId: string }>(
      `/api/admin/sales/inquiries/${id}/push-to-leads`,
      { method: "POST" },
    ),
  adminFormDefinitions: () =>
    request<{ forms: import("../types/site").PublicFormDefinition[] }>("/api/admin/sales/forms"),
  updateAdminFormDefinition: (
    id: string,
    body: Partial<{ title: string; description: string | null; fields: import("../types/site").FormFieldDefinition[]; isActive: boolean }>,
  ) =>
    request<{ form: import("../types/site").PublicFormDefinition }>(`/api/admin/sales/forms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createAdminFormDefinition: (body: {
    formKey: string;
    title: string;
    description?: string | null;
    fields?: import("../types/site").FormFieldDefinition[];
    isActive?: boolean;
  }) =>
    request<{ form: import("../types/site").PublicFormDefinition }>("/api/admin/sales/forms", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteAdminFormDefinition: (id: string) =>
    request<void>(`/api/admin/sales/forms/${id}`, { method: "DELETE" }),

  adminEmailTemplates: () =>
    request<{ templates: import("../types/site").EmailTemplate[] }>("/api/admin/marketing/email-templates"),
  adminEmailTemplate: (id: string) =>
    request<{ template: import("../types/site").EmailTemplate }>(`/api/admin/marketing/email-templates/${id}`),
  createAdminEmailTemplate: (body: Omit<import("../types/site").EmailTemplate, "id" | "createdAt" | "updatedAt">) =>
    request<{ template: import("../types/site").EmailTemplate }>("/api/admin/marketing/email-templates", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAdminEmailTemplate: (id: string, body: Partial<import("../types/site").EmailTemplate>) =>
    request<{ template: import("../types/site").EmailTemplate }>(`/api/admin/marketing/email-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAdminEmailTemplate: (id: string) =>
    request<void>(`/api/admin/marketing/email-templates/${id}`, { method: "DELETE" }),
  previewAdminEmailTemplate: (id: string, variables: Record<string, string>) =>
    request<{ preview: { subject: string; html: string; text?: string } }>(
      `/api/admin/marketing/email-templates/${id}/preview`,
      { method: "POST", body: JSON.stringify({ variables }) },
    ),
  sendTestAdminEmailTemplate: (id: string, to: string, variables: Record<string, string>) =>
    request<{ ok: boolean }>(`/api/admin/marketing/email-templates/${id}/send-test`, {
      method: "POST",
      body: JSON.stringify({ to, variables }),
    }),

  adminMarketingConfig: () =>
    request<{ config: import("../types/site").MarketingPlatformConfig }>("/api/admin/marketing/config"),
  updateAdminMarketingConfig: (body: Partial<{
    aiProvider: import("../types/site").MarketingPlatformConfig["aiProvider"];
    aiModel: string | null;
    aiApiKey: string | null;
    aiBaseUrl: string | null;
    settings: Record<string, unknown>;
  }>) =>
    request<{ config: import("../types/site").MarketingPlatformConfig }>("/api/admin/marketing/config", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  adminMarketingPlaybooks: () =>
    request<{ playbooks: import("../types/site").MarketingPlaybook[] }>("/api/admin/marketing/playbooks"),
  adminMarketingAssistant: (body: { prompt: string; sessionId?: string; context?: Record<string, unknown> }) =>
    request<{ sessionId: string; title: string; reply: string; recommendations: string[]; updatedAt: string }>(
      "/api/admin/marketing/assistant",
      { method: "POST", body: JSON.stringify(body) },
    ),
  adminMarketingSessions: () =>
    request<{ sessions: import("../types/site").MarketingAiSessionSummary[] }>("/api/admin/marketing/sessions"),
  adminMarketingSession: (id: string) =>
    request<{ session: { id: string; title: string; messages: Array<{ role: string; content: string }>; recommendations: string[]; updatedAt: string } }>(
      `/api/admin/marketing/sessions/${id}`,
    ),
  deleteAdminMarketingSession: (id: string) =>
    request<void>(`/api/admin/marketing/sessions/${id}`, { method: "DELETE" }),

  growthWorkspace: () => request<{ workspace: import("../types/growth").GrowthWorkspace }>("/api/growth/workspace"),
  growthWizardMeta: () => request<import("../types/growth").GrowthWizardMeta>("/api/growth/wizard/meta"),
  growthSaveWizardStep: (step: number, data: Record<string, unknown>) =>
    request<{ workspace: import("../types/growth").GrowthWorkspace }>(`/api/growth/wizard/step/${step}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  growthCompleteWizard: () =>
    request<{ workspace: import("../types/growth").GrowthWorkspace; job: import("../types/growth").GrowthJob }>(
      "/api/growth/wizard/complete",
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthJobs: () => request<{ jobs: import("../types/growth").GrowthJob[] }>("/api/growth/jobs"),
  growthAgentRuns: () => request<{ runs: import("../types/growth").GrowthAgentRun[] }>("/api/growth/agent-runs"),
  growthAgents: () =>
    request<{ agents: import("../types/growth").GrowthAgentMeta[] }>("/api/growth/agents"),
  growthUploadAsset: (body: { fileName: string; mimeType: string; dataBase64: string }) =>
    request<{ asset: { url: string; fileName: string } }>("/api/growth/assets/upload", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthContentBundle: () =>
    request<{ summary: import("../types/growth").GrowthContentBundleSummary; workspaceStatus: string }>(
      "/api/growth/content/bundle",
    ),
  growthContentAssets: (type?: string) =>
    request<{ assets: import("../types/growth").GrowthContentAsset[] }>(
      `/api/growth/content/assets${type ? `?type=${encodeURIComponent(type)}` : ""}`,
    ),
  growthContentAsset: (id: string) =>
    request<{ asset: import("../types/growth").GrowthContentAsset }>(`/api/growth/content/assets/${id}`),
  growthContentRegenerate: () =>
    request<{ job: import("../types/growth").GrowthJob; message: string }>("/api/growth/content/regenerate", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthContentPublishAll: () =>
    request<{ publishedCount: number; published: Array<Record<string, unknown>> }>("/api/growth/content/publish", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthContentPublishAsset: (id: string) =>
    request<{ published: Record<string, unknown> }>(`/api/growth/content/assets/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthPipelineStages: () =>
    request<{ stages: import("../types/growth").GrowthPipelineStage[] }>("/api/growth/pipeline/stages"),
  growthPipelineBoard: () => request<import("../types/growth").GrowthPipelineBoard>("/api/growth/pipeline/board"),
  growthLeadStats: () =>
    request<{ stats: import("../types/growth").GrowthLeadStats }>("/api/growth/leads/stats"),
  growthLeads: (stage?: string) =>
    request<{ leads: import("../types/growth").GrowthLead[] }>(
      `/api/growth/leads${stage ? `?stage=${encodeURIComponent(stage)}` : ""}`,
    ),
  growthCreateLead: (body: {
    fullName: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    stageSlug?: string;
  }) =>
    request<{ lead: import("../types/growth").GrowthLead }>("/api/growth/leads", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthLead: (id: string) =>
    request<{
      lead: import("../types/growth").GrowthLead;
      activities: import("../types/growth").GrowthLeadActivity[];
      chatSession: import("../types/growth").GrowthChatSession | null;
    }>(`/api/growth/leads/${id}`),
  growthUpdateLeadStage: (id: string, stageSlug: string) =>
    request<{ lead: import("../types/growth").GrowthLead }>(`/api/growth/leads/${id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stageSlug }),
    }),
  growthUpdateLead: (
    id: string,
    body: {
      fullName?: string;
      email?: string;
      phone?: string | null;
      company?: string | null;
      message?: string | null;
    },
  ) =>
    request<{ lead: import("../types/growth").GrowthLead }>(`/api/growth/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  growthForms: () =>
    request<{ forms: import("../types/growth").GrowthFormDefinition[] }>("/api/growth/forms"),
  growthCaptureBootstrap: () =>
    request<{ workspaceStatus: string; stagesCreated: boolean; formCreated: boolean }>(
      "/api/growth/capture/bootstrap",
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthChatbot: () =>
    request<{ configs: import("../types/growth").GrowthChatbotConfig[] }>("/api/growth/chatbot"),
  growthChatSessions: () =>
    request<{ sessions: import("../types/growth").GrowthChatSessionSummary[] }>("/api/growth/chatbot/sessions"),
  growthChatSession: (id: string) =>
    request<{ session: import("../types/growth").GrowthChatSession }>(`/api/growth/chatbot/sessions/${id}`),
  growthChatbotBootstrap: () =>
    request<{ config: import("../types/growth").GrowthChatbotConfig }>("/api/growth/chatbot/bootstrap", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthAnalyticsDashboard: (days = 30) =>
    request<{ dashboard: import("../types/growth").GrowthAnalyticsDashboard }>(
      `/api/growth/analytics/dashboard?days=${days}`,
    ),
  growthAnalyticsBootstrap: () =>
    request<{ workspaceStatus: string }>("/api/growth/analytics/bootstrap", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthAutomations: () =>
    request<{ automations: import("../types/growth").GrowthAutomation[] }>("/api/growth/automations"),
  growthAutomationRuns: () =>
    request<{ runs: import("../types/growth").GrowthAutomationRun[] }>("/api/growth/automations/runs"),
  growthAutomationCreate: (body: {
    name: string;
    triggerType: string;
    actionType: string;
    triggerFilter?: Record<string, unknown>;
    actionConfig?: Record<string, unknown>;
  }) =>
    request<{ automation: import("../types/growth").GrowthAutomation }>("/api/growth/automations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthAutomationUpdate: (id: string, body: { name?: string; isActive?: boolean }) =>
    request<{ automation: import("../types/growth").GrowthAutomation }>(`/api/growth/automations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  growthAutomationsBootstrap: () =>
    request<{ workspaceStatus: string; automations: import("../types/growth").GrowthAutomation[] }>(
      "/api/growth/automations/bootstrap",
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthPlan: () =>
    request<{ plan: import("../types/growth").GrowthPlanSnapshot; role: import("../types/growth").GrowthTeamRole | null }>(
      "/api/growth/plan",
    ),
  growthSettings: () =>
    request<import("../types/growth").GrowthSettingsPayload>("/api/growth/settings"),
  growthSettingsUpdate: (body: { notifyEmail?: string | null; planSlug?: string }) =>
    request<{ settings: import("../types/growth").GrowthWorkspaceSettings }>("/api/growth/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  growthTeamInvite: (body: { email: string; role?: "marketer" }) =>
    request<{ member: import("../types/growth").GrowthTeamMember }>("/api/growth/team", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthTeamRemove: (memberId: string) =>
    request<void>(`/api/growth/team/${memberId}`, { method: "DELETE" }),
  growthPackagingBootstrap: () =>
    request<{ workspaceStatus: string }>("/api/growth/packaging/bootstrap", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthPlanOptions: () =>
    request<{ plans: import("../types/growth").GrowthPlanOption[] }>("/api/growth/plan/options"),
  growthPlanCheckout: (body: {
    planSlug: import("../types/growth").GrowthPlanSlug;
    provider: "mock" | "stripe" | "paystack";
    customerEmail: string;
  }) =>
    request<{ checkout: { id: string; checkoutUrl?: string | null } }>("/api/growth/plan/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthOptimization: () =>
    request<{
      insights: import("../types/growth").GrowthOptimizationInsight[];
      insightCount: number;
      highPriorityCount: number;
      aiInsightCount?: number;
      weeklyBrief: import("../types/growth").GrowthWeeklyBrief | null;
    }>("/api/growth/optimization"),
  growthOptimizationRefresh: () =>
    request<{
      insights: import("../types/growth").GrowthOptimizationInsight[];
      weeklyBrief: import("../types/growth").GrowthWeeklyBrief | null;
    }>("/api/growth/optimization/refresh", { method: "POST", body: JSON.stringify({}) }),
  growthOptimizationBriefEmail: () =>
    request<{ sent: boolean }>("/api/growth/optimization/brief/email", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthOptimizationDismiss: (id: string) =>
    request<{ insight: import("../types/growth").GrowthOptimizationInsight }>(
      `/api/growth/optimization/${id}`,
      { method: "PATCH", body: JSON.stringify({ status: "dismissed" }) },
    ),
  growthOptimizationBootstrap: () =>
    request<{ workspaceStatus: string; insights: import("../types/growth").GrowthOptimizationInsight[] }>(
      "/api/growth/optimization/bootstrap",
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthLlmStatus: () => request<{ configured: boolean }>("/api/growth/agents/llm-status"),
  growthChannelAssets: () =>
    request<{ assets: import("../types/growth").GrowthChannelAsset[] }>("/api/growth/channels/assets"),
  growthChannelDeliveries: () =>
    request<{ deliveries: import("../types/growth").GrowthChannelDelivery[] }>("/api/growth/channels/deliveries"),
  growthChannelSocialSend: (assetId: string) =>
    request<{ delivery: import("../types/growth").GrowthChannelDelivery }>(
      `/api/growth/channels/social/${assetId}/send`,
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthChannelEmailBroadcast: (body: { emailStep: number; leadIds?: string[] }) =>
    request<{ sentCount: number; delivery: import("../types/growth").GrowthChannelDelivery }>(
      "/api/growth/channels/email/broadcast",
      { method: "POST", body: JSON.stringify(body) },
    ),
  growthChannelsProcessDue: () =>
    request<{ processed: import("../types/growth").GrowthChannelDelivery[] }>(
      "/api/growth/channels/process-due",
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthChannelIntegrations: () =>
    request<{ integrations: import("../types/growth").GrowthChannelIntegration[] }>(
      "/api/growth/channels/integrations",
    ),
  growthChannelIntegrationConnect: (body: {
    provider: import("../types/growth").GrowthChannelIntegration["provider"];
    credentials: Record<string, string>;
    accountLabel?: string;
  }) =>
    request<{ integration: import("../types/growth").GrowthChannelIntegration }>(
      "/api/growth/channels/integrations",
      { method: "POST", body: JSON.stringify(body) },
    ),
  growthChannelIntegrationDisconnect: (provider: string) =>
    request<void>(`/api/growth/channels/integrations/${provider}`, { method: "DELETE" }),
  growthAdsSeo: () =>
    request<{
      campaigns: import("../types/growth").GrowthAdCampaign[];
      keywords: import("../types/growth").GrowthSeoKeyword[];
      campaignCount: number;
      activeCampaigns: number;
      avgRank: number | null;
    }>("/api/growth/ads-seo"),
  growthAdsSeoUpdateCampaign: (
    id: string,
    body: { dailyBudgetCents: number; status?: "draft" | "active" | "paused" },
  ) =>
    request<{ campaign: import("../types/growth").GrowthAdCampaign }>(`/api/growth/ads-seo/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  growthAdsSeoSyncCampaign: (id: string) =>
    request<{ campaign: import("../types/growth").GrowthAdCampaign }>(
      `/api/growth/ads-seo/campaigns/${id}/sync`,
      { method: "POST", body: JSON.stringify({}) },
    ),
  growthAdsSeoRefreshPacing: () =>
    request<{ campaigns: import("../types/growth").GrowthAdCampaign[] }>("/api/growth/ads-seo/pacing/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthAdsSeoRefreshRanks: () =>
    request<{ keywords: import("../types/growth").GrowthSeoKeyword[] }>("/api/growth/ads-seo/ranks/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  growthAdsSeoLinkAccount: (body: {
    platform: "google_ads" | "meta";
    credentials: Record<string, string>;
    accountLabel?: string;
  }) =>
    request<{ integration: import("../types/growth").GrowthChannelIntegration }>("/api/growth/ads-seo/link-account", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  growthContentLlmStatus: () => request<{ configured: boolean }>("/api/growth/content/llm-status"),
};

export function formatPrice(cents: number, period = "monthly"): string {
  if (cents === 0) return "Free";
  const dollars = (cents / 100).toFixed(2).replace(/\.00$/, "");
  return `$${dollars}/${period === "yearly" ? "yr" : "mo"}`;
}
