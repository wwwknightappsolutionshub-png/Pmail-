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
  updatedAt?: string;
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
  updatedAt?: string;
};

export type AdminAddon = {
  id: string;
  slug: string;
  name: string;
  group: string;
  groupLabel: string;
  vertical: string;
  verticalLabel: string;
  description: string;
  features: string[];
  priceCents: number;
  tenantPriceCents: number;
  minTenantSeats: number;
  isPaid: boolean;
  addonKind: string;
  sortOrder: number;
  isActive: boolean;
  releasePhase: 1 | 2 | 3;
  comingSoon: boolean;
  deletedAt: string | null;
  marketingId: string | null;
  hasMarketing: boolean;
  marketing: AddonMarketing | null;
  subscribers: Array<{
    tenantName: string;
    tenantSlug: string;
    userEmail?: string;
    userName?: string | null;
    scope: "trial" | "user" | "tenant";
    status: "trial" | "active";
    subscriptionDate: string;
    expiryDate: string | null;
    seats?: number;
    priceCents?: number;
  }>;
  subscriberCount: number;
};

export type Testimonial = {
  id: string;
  authorName: string;
  authorRole: string | null;
  company: string | null;
  body: string;
  rating: number;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
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
  backupsEnabled: boolean;
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
  mailUsers: { total: number; active: number; onlineNow: number; activeSessions: number };
  hosting: {
    accounts: number;
    suspended: number;
    plans: number;
    createdThisWeek: number;
  };
  addons: { catalog: number; activeTrials: number; activeSubscriptions: number };
  vps: { total: number; running: number };
  platformAdmins: number;
  leads: {
    total: number;
    newThisWeek: number;
    qualifiedUnconverted: number;
    conversionRate: number;
    funnel: Record<MarketingLead["status"], number>;
  };
};

export type AdminDashboardAlert = {
  level: "info" | "warning" | "error";
  message: string;
};

export type AdminDashboardPayload = {
  summary: AdminDashboardSummary;
  health: {
    status: "ready" | "degraded";
    uptimeSeconds: number;
    databaseOk: boolean;
  };
  alerts: AdminDashboardAlert[];
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

export type MailUserPresence = {
  isOnline: boolean;
  activeSessionCount: number;
  lastActiveAt: string | null;
};

export type TenantMailUser = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  presence: MailUserPresence;
};

export type AdminMailUserRecord = TenantMailUser & {
  tenant: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
  };
  addonEducationOptOut?: boolean;
  addonEducationSuppressed?: boolean;
};

export type AddonEducationCampaignStep = {
  id: string;
  campaignType: string;
  stepKey: string;
  templateSlug: string;
  sortOrder: number;
  isActive: boolean;
  intervalHours: number;
  resendIntervalHours: number;
  maxResends: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminMailUserSession = {
  id: string;
  userId: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isOnline: boolean;
  user?: {
    email: string;
    displayName: string | null;
    tenant: { id: string; slug: string; name: string };
  } | null;
};

export type AdminMailUserPresenceStats = {
  totalUsers: number;
  activeUsers: number;
  onlineNow: number;
  activeSessions: number;
  onlineWindowMinutes: number;
  asOf: string;
};

export type TenantOpsPayload = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    addonEducationSuppressed?: boolean;
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
  growth:
    | { hasWorkspace: false }
    | {
        hasWorkspace: true;
        workspaceId: string;
        workspaceStatus: string;
        planSlug: string;
        planTierOverride: boolean;
        effectivePlanSlug: string;
      };
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
  tenantSlug?: string | null;
  provisioning?: {
    status: string;
    tenantSlug: string;
    panelLoginId?: string;
    pmailUserEmail?: string;
    completedAt?: string;
  } | null;
};

export type MarketingLead = {
  id: string;
  fullName: string;
  email: string;
  company: string;
  teamSize: string | null;
  message: string | null;
  status: "new" | "contacted" | "qualified" | "converted" | "closed";
  notes: string | null;
  consentPrivacy: boolean;
  consentContact: boolean;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingLeadStats = {
  total: number;
  funnel: Record<MarketingLead["status"], number>;
  newThisWeek: number;
  qualifiedUnconverted: number;
  conversionRate: number;
};

export type AdminSystemStatus = {
  readiness: { status: string; uptimeSeconds: number; checks: Record<string, { ok: boolean; detail?: string }> };
  billing: {
    graceDays: number;
    hosting: { active: number; pastDue: number; canceled: number };
    addons: { active: number; pastDue: number; canceled: number };
  };
  counts: { tenants: number; leads: number; completedCheckouts: number; webhookEvents: number };
  payments: { mockMode: boolean; providers: string[] };
  config: { nodeEnv: string; cookieSecure: boolean; auditAdminActions: boolean; publicApiUrl: string | null };
  push: {
    vapidConfigured: boolean;
    mailPushEnabled: boolean;
    mailPushDefaultForUsers: boolean;
    pwaPushAutoSubscribe: boolean;
  };
  platformEmail: {
    configured: boolean;
    host: string;
    port: number;
    secure: boolean;
    from: string;
    membershipNotifyEmail: string | null;
    inquiryNotifyEmail: string | null;
    inquiryReplyEmail: string | null;
  };
};

export type PmailPlatformConfig = {
  mailPushEnabled: boolean;
  mailPushDefaultForUsers: boolean;
  pwaPushAutoSubscribe: boolean;
  inboxAddonUpsellEnabled: boolean;
  vapidConfigured: boolean;
  clientRefreshAt: string;
  updatedAt: string;
};

export type AdminPollSnapshot = {
  polledAt: string;
  health: { status: "ready" | "degraded"; uptimeSeconds: number; databaseOk: boolean };
  leads: {
    newCount: number;
    total: number;
    funnel: Record<MarketingLead["status"], number>;
    newThisWeek: number;
  };
  salesPipeline: {
    pendingCount: number;
    leads: { newCount: number };
    membership: { demoSent: number; newCount: number };
    inquiries: { open: number };
  };
  presence: AdminMailUserPresenceStats;
};

export type AdminTrendPoint = { date: string; count: number };
export type AdminRevenuePoint = { date: string; revenueCents: number };

export type AdminTrends = {
  days: number;
  tenants: AdminTrendPoint[];
  leads: AdminTrendPoint[];
  hostingAccounts: AdminTrendPoint[];
  revenue: AdminRevenuePoint[];
};

export type BillingRevenueDashboard = {
  mrrCents: number;
  hostingMrrCents: number;
  addonMrrCents: number;
  activeHostingSubscriptions: number;
  activeAddonSubscriptions: number;
  lifetimeRevenueCents: number;
  lifetimeOrders: number;
  last30RevenueCents: number;
  last30Orders: number;
  billing: AdminSystemStatus["billing"] & { graceDays: number };
  topHostingPlans: Array<{ slug: string; name: string; count: number; mrrCents: number }>;
  topAddons: Array<{ slug: string; name: string; count: number; mrrCents: number }>;
  recentPayments: Array<{
    id: string;
    productName: string;
    productSlug: string;
    amountCents: number;
    currency: string;
    customerEmail: string;
    completedAt: string | null;
    provider: string;
  }>;
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
  isSampleDemo?: boolean;
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

export type FormFieldDefinition = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select";
  placeholder?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  sortOrder: number;
  helpText?: string;
};

export type PublicFormDefinition = {
  id: string;
  formKey: string;
  title: string;
  description: string | null;
  fields: FormFieldDefinition[];
  isActive: boolean;
  updatedAt: string;
};

export type MembershipApplication = {
  id: string;
  fullName: string;
  workEmail: string;
  phone: string;
  teamType: string;
  deployIntent: string;
  hostingScale: string;
  emailService: string;
  status: "new" | "demo_sent" | "provisioned" | "pushed_to_leads" | "closed";
  notes: string | null;
  tenantId: string | null;
  hostingAccountId: string | null;
  marketingLeadId: string | null;
  demoUsername: string | null;
  demoDomain: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InquirySubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  membershipInterest: string;
  inquiringAbout: string;
  status: "new" | "in_progress" | "resolved" | "pushed_to_leads";
  notes: string | null;
  marketingLeadId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketingPlatformConfig = {
  aiProvider: "openai" | "anthropic" | "google" | "custom";
  aiModel: string | null;
  hasApiKey: boolean;
  aiBaseUrl: string | null;
  settings: Record<string, unknown>;
  updatedAt: string;
};

export type SalesPipelineOverview = {
  leads: MarketingLeadStats;
  membership: { total: number; newCount: number; demoSent: number; pushed: number };
  inquiries: { total: number; open: number };
  recent: {
    membership: Array<{ id: string; fullName: string; workEmail: string; status: string; createdAt: string }>;
    inquiries: Array<{ id: string; name: string; email: string; status: string; createdAt: string }>;
    leads: Array<{ id: string; fullName: string; email: string; status: string; createdAt: string }>;
  };
};

export type MarketingPlaybook = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

export type MarketingAiSessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};
