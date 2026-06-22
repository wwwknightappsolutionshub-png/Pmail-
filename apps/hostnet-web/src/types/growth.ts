export type GrowthWorkspace = {
  id: string;
  tenantId: string;
  status: string;
  wizardStep: number;
  wizardCompletedAt: string | null;
  hostingAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  wizard: {
    currentStep: number;
    completed: boolean;
    steps: {
      step1: Record<string, unknown> | null;
      step2: Record<string, unknown> | null;
      step3: Record<string, unknown> | null;
      step4: Record<string, unknown> | null;
      step5: Record<string, unknown> | null;
      step6: Record<string, unknown> | null;
    };
  };
};

export type GrowthJob = {
  id: string;
  jobType: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
};

export type GrowthAgentRun = {
  id: string;
  agentKey: string;
  status: string;
  output: Record<string, unknown> | null;
  completedAt: string | null;
};

export type GrowthAgentMeta = {
  key: string;
  label: string;
  description: string;
  order: number;
};

export type GrowthWizardMeta = {
  stepCount: number;
  steps: Array<{ step: number; title: string; key: string }>;
};

export type GrowthContentAsset = {
  id: string;
  assetType: string;
  title: string;
  slug: string | null;
  body: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GrowthContentBundleSummary = {
  totalAssets: number;
  counts: Record<string, number>;
  hasBundle: boolean;
  contentMode?: "greenfield" | "existing_site" | null;
};

export type GrowthPipelineStage = {
  id: string;
  tenantId: string;
  workspaceId: string;
  slug: string;
  label: string;
  sortOrder: number;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GrowthLeadSummary = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  sourcePage: string | null;
  score: number;
  status: string;
  stageSlug: string;
  createdAt: string;
  updatedAt: string;
};

export type GrowthLead = GrowthLeadSummary & {
  tenantId: string;
  workspaceId: string;
  formData: Record<string, string>;
  attribution: Record<string, unknown>;
};

export type GrowthLeadActivity = {
  id: string;
  activityType: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type GrowthLeadStats = {
  totalLeads: number;
  openLeads: number;
  last7Days: number;
  averageScore: number;
  byStage: Record<string, number>;
};

export type GrowthFormField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  sortOrder?: number;
  placeholder?: string;
};

export type GrowthFormDefinition = {
  id: string;
  tenantId: string;
  workspaceId: string;
  formKey: string;
  title: string;
  description: string | null;
  fields: GrowthFormField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GrowthPipelineBoard = {
  stages: GrowthPipelineStage[];
  leadsByStage: Record<string, GrowthLeadSummary[]>;
};

export type GrowthChatbotStep = {
  id: string;
  kind: "say" | "ask";
  message: string;
  field?: string;
  inputType?: "text" | "email" | "tel" | "textarea" | "choice";
  choices?: string[];
  required?: boolean;
  placeholder?: string;
};

export type GrowthChatbotConfig = {
  id: string;
  tenantId: string;
  workspaceId: string;
  botKey: string;
  title: string;
  welcomeMessage: string;
  steps: GrowthChatbotStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GrowthChatMessage = {
  id: string;
  role: "bot" | "user";
  content: string;
  stepKey: string | null;
  createdAt: string;
};

export type GrowthChatSession = {
  id: string;
  status: string;
  leadId: string | null;
  sourcePage: string | null;
  collectedData: Record<string, string>;
  currentStepIndex: number;
  createdAt: string;
  updatedAt: string;
  messages: GrowthChatMessage[];
};

export type GrowthChatSessionSummary = {
  id: string;
  status: string;
  leadId: string | null;
  sourcePage: string | null;
  createdAt: string;
};

export type GrowthAnalyticsDashboard = {
  rangeDays: number;
  since: string;
  totals: {
    pageViews: number;
    formSubmits: number;
    chatOpens: number;
    chatCompletes: number;
    leads: number;
  };
  funnel: {
    pageViews: number;
    formSubmits: number;
    chatCompletes: number;
    leads: number;
    conversionRate: number;
  };
  bySourcePage: Record<string, { pageViews: number; leads: number }>;
  byUtmSource: Record<string, number>;
  daily: Array<{ date: string; pageViews: number; leads: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  leadsBySource: Record<string, number>;
};

export type GrowthAutomation = {
  id: string;
  name: string;
  triggerType: string;
  triggerFilter: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  triggerLabel: string;
  actionLabel: string;
  createdAt: string;
  updatedAt: string;
};

export type GrowthAutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  leadId: string | null;
  status: string;
  triggerEvent: string;
  result: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
};

export type GrowthTeamRole = "owner" | "marketer";

export type GrowthTeamMember = {
  id: string;
  email: string;
  role: GrowthTeamRole;
  hostingAccountId: string | null;
  invitedAt: string;
};

export type GrowthWorkspaceSettings = {
  id: string;
  planSlug: string;
  notifyEmail: string | null;
  settings: Record<string, unknown>;
};

export type GrowthPlanSnapshot = {
  addonSlug: string;
  hasAccess: boolean;
  planSlug: string;
  planName: string;
  priceCents: number;
  planTierOverride?: boolean;
  limits: {
    leadsPerMonth: number;
    automations: number;
    publishedPages: number;
    analytics: boolean;
    chatbot: boolean;
  };
  usage: {
    leadsThisMonth: number;
    automationCount: number;
    publishedPages: number;
    periodStart: string;
  };
};

export type GrowthSettingsPayload = {
  settings: GrowthWorkspaceSettings;
  team: GrowthTeamMember[];
  role: GrowthTeamRole | null;
};

export type GrowthPlanSlug = "starter" | "pro" | "agency";

export const GROWTH_PLAN_LABELS: Record<GrowthPlanSlug, string> = {
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export type GrowthPlanOption = {
  slug: GrowthPlanSlug;
  name: string;
  priceCents: number;
  checkoutSlug: string;
  limits: GrowthPlanSnapshot["limits"];
};

export type GrowthChannelAsset = {
  id: string;
  assetType: string;
  title: string;
  slug: string | null;
  body: Record<string, unknown>;
  sortOrder: number;
};

export type GrowthChannelDelivery = {
  id: string;
  channelType: string;
  assetId: string | null;
  status: string;
  platform: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientEmail: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GrowthOptimizationInsight = {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  title: string;
  summary: string;
  actionLabel: string | null;
  actionTarget: string | null;
  metrics: Record<string, unknown>;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GrowthWeeklyBrief = {
  id: string;
  weekStart: string;
  briefMarkdown: string;
  insightCount: number;
  emailedAt: string | null;
  createdAt: string;
};

export type GrowthChannelIntegration = {
  provider: "mailchimp" | "meta" | "google_ads";
  status: string;
  connected: boolean;
  accountLabel: string | null;
  lastSyncAt: string | null;
  metadata: Record<string, unknown>;
};

export type GrowthAdCampaign = {
  id: string;
  platform: string;
  name: string;
  status: string;
  dailyBudgetCents: number;
  spentCents: number;
  externalId: string | null;
  adCopyAssetId: string | null;
  pacing: {
    pacePercent: number;
    expectedSpendCents: number;
    onTrack: boolean;
    daysInPeriod: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type GrowthSeoKeyword = {
  id: string;
  keyword: string;
  targetUrl: string | null;
  currentRank: number | null;
  previousRank: number | null;
  searchVolume: number | null;
  rankDelta: number | null;
  lastCheckedAt: string | null;
};
