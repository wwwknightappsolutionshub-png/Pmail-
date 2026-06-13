export type SiteSection = {
  id: string;
  sectionKey: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  bulletPoints: string[];
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
};

export type HostingPlan = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  priceCents: number;
  billingPeriod: string;
  diskGb: number;
  bandwidthGb: number;
  websites: number;
  emailAccounts: number;
  databases: number;
  features: string[];
  isFeatured: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type AddonMarketing = {
  id: string;
  addonId: string;
  slug: string;
  name: string;
  group: string;
  groupLabel: string;
  description: string;
  features: string[];
  marketingTitle: string;
  marketingSubtitle: string | null;
  longDescription: string | null;
  badge: string | null;
  displayPriceCents: number;
  trialDays: number;
  ctaLabel: string;
  landingFeatured: boolean;
  sortOrder: number;
  isPublished: boolean;
  isActive: boolean;
};

export type PublicPanelPreview = {
  accountLabel: string;
  planName: string | null;
  diskPercent: number;
  bandwidthPercent: number;
  diskUsedMb: number;
  diskQuotaMb: number;
  bandwidthUsedMb: number;
  bandwidthMb: number;
  domains: number;
  emailBoxes: number;
  databases: number;
  sslActive: boolean;
  uptime: string;
};

export type PublicSitePayload = {
  sections: SiteSection[];
  hostingPlans: HostingPlan[];
  addonMarketing: AddonMarketing[];
  panelPreview: PublicPanelPreview;
};

export type PlatformAdmin = {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin";
  isActive: boolean;
  lastLoginAt?: string | null;
};

export type AdminDashboardSummary = {
  tenants: { total: number; active: number; createdThisWeek: number };
  mailUsers: { total: number; active: number };
  hosting: {
    accounts: number;
    suspended: number;
    plans: number;
    createdThisWeek: number;
  };
  addons: { catalog: number; activeTrials: number; activeSubscriptions: number };
  vps: { total: number; running: number };
  platformAdmins: number;
};

export type AdminDashboardPayload = {
  summary: AdminDashboardSummary;
  recentTenants: Array<{
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    createdAt: string;
  }>;
  recentHostingAccounts: Array<{
    id: string;
    loginId: string;
    isSuspended: boolean;
    tenant: { slug: string; name: string };
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
    admin: { email: string; name: string } | null;
  }>;
};

export type VpsInstance = {
  id: string;
  tenantId: string | null;
  label: string;
  hostname: string;
  ipAddress: string | null;
  region: string;
  planSlug: string;
  cpuCores: number;
  ramMb: number;
  diskGb: number;
  status: "provisioning" | "running" | "stopped" | "suspended";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant: Pick<TenantAdmin, "id" | "slug" | "name"> | null;
};

export type PlatformAdminRecord = PlatformAdmin & { createdAt: string };

export type TenantMailUser = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type TenantOpsPayload = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    counts: {
      users: number;
      hostingAccounts: number;
      addonTrials: number;
      addonSubscriptions: number;
      vpsInstances: number;
    };
  };
  branding: {
    productName: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    loginTagline: string;
  } | null;
  mail: {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
  } | null;
  users: TenantMailUser[];
  hostingAccounts: Array<{
    id: string;
    loginId: string;
    isSuspended: boolean;
    plan: { name: string; slug: string } | null;
  }>;
  vpsInstances: Array<{
    id: string;
    label: string;
    hostname: string;
    status: string;
    ipAddress: string | null;
  }>;
  addons: Array<{
    id: string;
    slug: string;
    name: string;
    accessStatus: string;
    canStartTrial: boolean;
  }>;
  trials: Array<{
    id: string;
    addonSlug: string;
    addonName: string;
    status: string;
    startedAt: string;
    endsAt: string;
  }>;
  subscriptions: Array<{
    id: string;
    addonSlug: string;
    addonName: string;
    status: string;
    currentPeriodEnd: string | null;
  }>;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { id: string; email: string; name: string } | null;
};

export type PaymentProviderInfo = {
  id: "stripe" | "paystack" | "mock";
  label: string;
  publishableKey: string | null;
};

export type PaymentCheckout = {
  id: string;
  provider: string;
  productType: "hosting_plan" | "addon";
  productSlug: string;
  productName: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  status: string;
  checkoutUrl: string | null;
  successUrl: string;
  cancelUrl: string;
  createdAt: string;
  completedAt: string | null;
};

export type TenantAdmin = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  hostingAccountCount: number;
  userCount: number;
};

export type HostingAccountAdmin = {
  id: string;
  tenantId: string;
  planId: string | null;
  username: string;
  domain: string;
  homePath: string;
  diskQuotaMb: number;
  diskUsedMb: number;
  bandwidthMb: number;
  bandwidthUsedMb: number;
  emailAccounts: number;
  databases: number;
  isSuspended: boolean;
  loginId: string;
  tenant: Pick<TenantAdmin, "id" | "slug" | "name" | "isActive">;
  plan: Pick<HostingPlan, "id" | "slug" | "name"> | null;
};

export type PanelAccount = {
  id: string;
  username: string;
  domain: string;
  homePath: string;
  diskQuotaMb: number;
  diskUsedMb: number;
  bandwidthMb: number;
  bandwidthUsedMb: number;
  emailAccounts: number;
  databases: number;
  isSuspended: boolean;
  tenant: { id: string; slug: string; name: string };
  plan: { id: string; slug: string; name: string } | null;
};

export type PanelDashboard = {
  account: PanelAccount;
  stats: {
    diskPercent: number;
    bandwidthPercent: number;
    domains: number;
    subdomains: number;
    emailBoxes: number;
    databases: number;
    sslActive: boolean;
  };
  quickLinks: Array<{ label: string; path: string; icon: string }>;
};

export type PanelView = "dashboard" | "files" | "email" | "databases" | "domains";
