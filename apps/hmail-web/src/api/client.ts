import type { AuthUser, MailFolder, MailListResult, MailMessageDetail, MailSortField, MailSortOrder, TenantBranding } from "../types/mail";
import type { MailContact, MailContactCollection } from "../types/contact";

function resolveApiBase(): string {
  return import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL ?? "") : "";
}

const API_BASE = resolveApiBase();

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type WorkspaceUser = {
  id: string;
  email: string;
  displayName: string;
};

export type CvRatingResult = {
  overallScore: number;
  categories: {
    ats: { score: number; notes: string };
    format: { score: number; notes: string };
    keywords: { score: number; notes: string };
    sections: { score: number; notes: string };
  };
  regionNotes: string;
  improvements: string[];
  targetRole: string | null;
  region: string;
  fileName: string;
};

export type JobApplicationRow = {
  id: string;
  company: string;
  roleTitle: string;
  appliedAt: string;
  status: string;
  source: string;
  mailAccountId: string | null;
  imapFolder: string | null;
  messageUid: number | null;
  messageMessageId: string | null;
  threadHint: string | null;
  hasMailLink: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobHunterCvContent = {
  fullName: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
    details?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
};

export type JobHunterCvDocumentRow = {
  id: string;
  title: string;
  region: string;
  role: string | null;
  industry: string | null;
  content: JobHunterCvContent;
  pdfStoragePath: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type JobHunterCvTemplateMeta = {
  id: string;
  region: string;
  roleCategory: string;
  industry: string;
  experienceLevel?: "entry" | "mid" | "senior";
  title: string;
  description: string;
};

export type UserDocumentRow = {
  id: string;
  filename: string;
  mimeType: string;
  source: string;
  isPinned: boolean;
  isCareerCv: boolean;
  jobHunterCvDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobSiteLinkRow = {
  id: string;
  label: string;
  url: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type InterviewPrepQuestion = {
  question: string;
  answerOutline: string[];
  tips: string[];
};

export type InterviewPrepResult = {
  targetRole: string | null;
  region: string;
  source: "job_description" | "application";
  questions: InterviewPrepQuestion[];
  generalTips: string[];
};

export type ApplyAssistPrefilledPayload = {
  channel: "email_apply" | "linkedin_assist" | "indeed_assist";
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  toEmail?: string;
  company?: string;
  coverBlurb?: string;
  checklist?: string[];
  openUrl?: string;
  assistDisclaimer?: string;
};

export type ApplyAssistQueueItem = {
  id: string;
  channel: string;
  status: string;
  jobUrl: string | null;
  careersEmail: string | null;
  company: string | null;
  targetRole: string;
  region: string;
  userDocumentId: string | null;
  prefilled: ApplyAssistPrefilledPayload | null;
  applicationId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplyAssistWallet = {
  balance: number;
  creditPackPriceCents: number;
  creditsPerPack: number;
  creditCostPerAssist: number;
  dailyCap: number;
  confirmedToday: number;
  remainingToday: number;
  ledger: Array<{
    id: string;
    delta: number;
    reason: string;
    applicationId: string | null;
    queueId: string | null;
    createdAt: string;
  }>;
};

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
      "Cannot reach the mail service. From the project root run: npm run dev -w hmail-api",
      0,
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text) as { error?: string; message?: string };
          message = data.error ?? data.message ?? message;
        } catch {
          message = text.length > 180 ? `${text.slice(0, 180)}…` : text;
        }
      } else if (res.status >= 500) {
        message =
          "Mail service error — the API may be restarting. Wait a few seconds, then try again. For local testing use /login/pmail-tester.";
      } else if (res.status === 0) {
        message = "Cannot reach the mail service. From the project root run: npm run dev -w hmail-api";
      }
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getTenant: (slug: string) =>
    request<{
      slug: string;
      name: string;
      branding: TenantBranding | null;
      mailOnboardingComplete?: boolean;
      mail?: {
        imapHost: string;
        imapPort: number;
        imapSecure: boolean;
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
      } | null;
    }>(`/api/auth/tenant/${slug}`),
  completeMailOnboarding: (
    tenantSlug: string,
    body: {
      imapHost: string;
      imapPort: number;
      imapSecure: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      testEmail: string;
      testPassword: string;
    },
  ) =>
    request<{ ok: boolean; mailOnboardingComplete: boolean }>(`/api/public/onboarding/${tenantSlug}/mail`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  registerPmailProspect: (body: {
    tenantSlug: string;
    fullName: string;
    email: string;
    company?: string;
    referrerEmail?: string;
    consentPrivacy: boolean;
  }) =>
    request<{
      prospect: {
        id: string;
        fullName: string;
        email: string;
        company: string | null;
        status: string;
      };
    }>("/api/public/prospects/register", { method: "POST", body: JSON.stringify(body) }),
  loginPreflight: (tenantSlug: string, email: string) =>
    request<{
      needsProviderSetup: boolean;
      displayName: string | null;
      testerBypass?: boolean;
      suggestedTenantSlug?: string | null;
      suggestedMailConfig?: {
        providerPreset: string;
        imapHost: string;
        imapPort: number;
        imapSecure: boolean;
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
      } | null;
    }>(`/api/auth/login-preflight?tenantSlug=${encodeURIComponent(tenantSlug)}&email=${encodeURIComponent(email)}`),
  testerLogin: (body: { email: string; password: string }) =>
    request<{ token: string; user: import("../types/mail").AuthUser }>("/api/auth/tester/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: {
    tenantSlug: string;
    email: string;
    password: string;
    providerPreset?: string;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    referrerEmail?: string;
  }) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getUserMailConfig: () =>
    request<{
      mail: {
        providerPreset: string;
        imapHost: string;
        imapPort: number;
        imapSecure: boolean;
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
        configuredAt: string;
      } | null;
    }>("/api/auth/mail-config"),
  updateUserMailConfig: (body: {
    providerPreset: string;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    testPassword?: string;
  }) =>
    request<{ mail: NonNullable<Awaited<ReturnType<typeof api.getUserMailConfig>>["mail"]> }>("/api/auth/mail-config", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  presenceHeartbeat: () =>
    request<{ ok: boolean; lastActiveAt: string }>("/api/auth/presence/heartbeat", { method: "POST" }),
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
  organizationUsers: () => request<{ users: WorkspaceUser[] }>("/api/auth/organization-users"),
  selectBusinessVertical: (businessVertical: AuthUser["businessVertical"]) =>
    request<{ user: AuthUser }>("/api/auth/business-vertical", {
      method: "POST",
      body: JSON.stringify({ businessVertical }),
    }),
  folders: () => request<{ folders: MailFolder[] }>("/api/mail/folders"),
  createFolder: (name: string, parentPath?: string) =>
    request<{ folder: MailFolder }>("/api/mail/folders", {
      method: "POST",
      body: JSON.stringify({ name, parentPath }),
    }),
  messages: (
    folder: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      searchField?: "date" | "sender" | "subject" | "recipient" | "body";
      searchQuery?: string;
      filter?: "all" | "unread" | "read" | "starred";
      sortBy?: MailSortField;
      sortOrder?: MailSortOrder;
    },
  ) => {
    const params = new URLSearchParams({ folder });
    if (options?.page != null) params.set("page", String(options.page));
    if (options?.pageSize != null) params.set("pageSize", String(options.pageSize));
    if (options?.search) params.set("search", options.search);
    if (options?.searchField) params.set("searchField", options.searchField);
    if (options?.searchQuery) params.set("searchQuery", options.searchQuery);
    if (options?.filter) params.set("filter", options.filter);
    if (options?.sortBy) params.set("sortBy", options.sortBy);
    if (options?.sortOrder) params.set("sortOrder", options.sortOrder);
    return request<MailListResult>(`/api/mail/messages?${params}`);
  },
  message: (folder: string, uid: number) =>
    request<{ message: MailMessageDetail }>(`/api/mail/messages/${uid}?folder=${encodeURIComponent(folder)}`),
  send: async (body: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    priority?: "normal" | "high";
    requestReadReceipt?: boolean;
    trackingEnabled?: boolean;
    vaultFileIds?: string[];
    userDocumentIds?: string[];
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }) => {
    const res = await fetch(`${API_BASE}/api/mail/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    const data = (await res.json()) as Record<string, unknown>;
    if (res.status === 202) {
      return {
        queued: true as const,
        pendingId: String(data.pendingId),
        undoSeconds: Number(data.undoSeconds),
        undoUntil: String(data.undoUntil),
        subject: String(data.subject),
        to: String(data.to),
      };
    }
    return {
      queued: false as const,
      messageId: String(data.messageId),
      sentFolder: data.sentFolder ? String(data.sentFolder) : undefined,
      trackingId: data.trackingId ? String(data.trackingId) : undefined,
    };
  },
  undoPendingSend: (pendingId: string) =>
    request<{ ok: boolean; cancelled: boolean }>(`/api/mail/send/${encodeURIComponent(pendingId)}/undo`, {
      method: "POST",
    }),
  deleteMessage: (folder: string, uid: number) =>
    request<{ ok: boolean }>(`/api/mail/messages/${uid}?folder=${encodeURIComponent(folder)}`, { method: "DELETE" }),
  moveMessage: (folder: string, uid: number, targetFolder: string) =>
    request<{ ok: boolean }>(`/api/mail/messages/${uid}/move?folder=${encodeURIComponent(folder)}`, {
      method: "POST",
      body: JSON.stringify({ targetFolder }),
    }),
  setFlags: (folder: string, uid: number, flags: { seen?: boolean; flagged?: boolean }) =>
    request<{ ok: boolean }>(`/api/mail/messages/${uid}/flags?folder=${encodeURIComponent(folder)}`, {
      method: "PATCH",
      body: JSON.stringify(flags),
    }),
  bulkAction: (
    folder: string,
    uids: number[],
    action: "markRead" | "markUnread" | "delete" | "move" | "reportSpam",
    targetFolder?: string,
  ) =>
    request<{ ok: boolean }>("/api/mail/messages/bulk", {
      method: "POST",
      body: JSON.stringify({ folder, uids, action, targetFolder }),
    }),
  addons: () => request<{ addons: import("../types/addon").AddonItem[] }>("/api/addons"),
  addonEntitlements: () =>
    request<{
      slugs: string[];
      jobHunter: import("../types/addon").JobHunterEntitlement;
      panelWorkspaceTrial: import("../types/addon").PanelWorkspaceTrialStatus;
    }>("/api/addons/entitlements"),
  startAddonTrial: (slug: string) =>
    request<{ addon: import("../types/addon").AddonItem }>(`/api/addons/${slug}/trial`, {
      method: "POST",
    }),
  startAddonSubscription: (
    slug: string,
    body: {
      scope: "user" | "tenant";
      seats?: number;
      provider?: "stripe" | "paystack" | "mock";
      successUrl?: string;
      cancelUrl?: string;
    },
  ) =>
    request<{
      addon?: import("../types/addon").AddonItem;
      checkout?: {
        id: string;
        checkoutUrl: string | null;
        amountCents: number;
        productName: string;
      };
      quote?: {
        scope: "user" | "tenant";
        seats: number;
        unitPriceCents: number;
        amountCents: number;
        label: string;
      };
      mode: "mock" | "checkout";
    }>(`/api/addons/${slug}/subscribe`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addonPricingQuote: (slug: string, scope: "user" | "tenant", seats?: number) =>
    request<{
      quote: {
        scope: "user" | "tenant";
        seats: number;
        unitPriceCents: number;
        amountCents: number;
        tenantMemberCount: number;
        minTenantSeats: number;
        label: string;
      };
    }>(`/api/addons/${slug}/pricing-quote?scope=${scope}${seats != null ? `&seats=${seats}` : ""}`),
  marketplaceQuote: (body: {
    vertical: import("../types/addon").MarketplaceBrowseVertical;
    scope: "user" | "tenant";
    includePlatformBundle: boolean;
    includeVerticalBundle: boolean;
    includeJobHunterStandalone?: boolean;
    seats?: number;
  }) =>
    request<{
      quote: {
        vertical: import("../types/addon").MarketplaceBrowseVertical;
        scope: "user" | "tenant";
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
      };
    }>("/api/addons/marketplace/quote", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  marketplaceCheckout: (
    body: {
      vertical: import("../types/addon").MarketplaceBrowseVertical;
      scope: "user" | "tenant";
      includePlatformBundle: boolean;
      includeVerticalBundle: boolean;
      includeJobHunterStandalone?: boolean;
      seats?: number;
      provider?: "stripe" | "paystack" | "mock";
      successUrl?: string;
      cancelUrl?: string;
    },
  ) =>
    request<{
      mode: "checkout" | "activated";
      checkout?: {
        id: string;
        checkoutUrl: string | null;
        amountCents: number;
        productName: string;
      };
      quote: {
        vertical: import("../types/addon").MarketplaceBrowseVertical;
        scope: "user" | "tenant";
        seats: number;
        amountCents: number;
        label: string;
        lines: Array<{
          bundle: "platform" | "vertical";
          label: string;
          amountCents: number;
          isFree: boolean;
        }>;
      };
    }>("/api/addons/marketplace/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  referralCompose: () =>
    request<{
      compose: {
        subject: string;
        body: string;
        bodyHtml: string;
        bcc: string;
        recipientCount: number;
        inboxCount: number;
        sentCount: number;
      };
    }>("/api/referrals/compose"),
  referralInvite: () =>
    request<{
      ok: boolean;
      sentCount: number;
      bouncedCount: number;
      inboxCount: number;
      sentMailboxCount: number;
      rewardToast: string | null;
      message: string;
    }>("/api/referrals/invite", { method: "POST" }),
  referralSend: (body: { subject: string; text?: string; html?: string; bcc: string }) =>
    request<{
      ok: boolean;
      sentCount: number;
      bouncedCount: number;
      rewardToast: string | null;
    }>("/api/referrals/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  paymentProviders: () =>
    request<{
      providers: Array<{ id: string; label: string; publishableKey: string | null }>;
      currency: string;
      mockMode: boolean;
    }>("/api/payments/providers"),
  sendWhatsapp: (body: { toPhone: string; body: string; subject?: string }) =>
    request<{ ok: boolean; messageId: string; provider: string }>("/api/platform/whatsapp/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  async mail2pdf(body: {
    subject: string;
    from: string;
    to: string;
    date?: string;
    body: string;
    cc?: string;
    attachments?: string[];
  }) {
    const res = await fetch(`${API_BASE}/api/platform/mail2pdf`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let message = "Mail 2 PDF export failed";
      try {
        const data = (await res.json()) as { error?: string };
        message = data.error ?? message;
      } catch {
        // ignore
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const filename =
      res.headers.get("X-Mail2Pdf-Filename") ??
      `${body.subject.replace(/[^\w\s-]/g, "").trim() || "mail-trail"}.pdf`;
    return { blob, filename };
  },
  updateTheme: (uiThemeVersion: "dark" | "light") =>
    request<{ user: import("../types/mail").AuthUser }>("/api/auth/me/theme", {
      method: "PATCH",
      body: JSON.stringify({ uiThemeVersion }),
    }),
  updateMailPushPreference: (enabled: boolean) =>
    request<{ user: import("../types/mail").AuthUser }>("/api/auth/me/mail-push", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  pwaPushPolicy: () =>
    request<{
      mailPushEnabled: boolean;
      platformMailPushEnabled: boolean;
      userMailPushEnabled: boolean;
      autoSubscribe: boolean;
      vapidConfigured: boolean;
    }>("/api/pwa/push-policy"),
  featureTemplates: () =>
    request<{ templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }> }>(
      "/api/features/templates",
    ),
  featureScheduled: () =>
    request<{ messages: Array<{ id: string; to: string; subject: string; scheduledFor: string; status: string }> }>(
      "/api/features/scheduled",
    ),
  createScheduled: (body: { to: string; cc?: string; bcc?: string; subject: string; text?: string; html?: string; scheduledFor: string }) =>
    request<{ message: unknown }>("/api/features/scheduled", { method: "POST", body: JSON.stringify(body) }),
  featureMatters: () =>
    request<{ matters: Array<{ id: string; title: string; uci: string | null; program: string; status: string; clientName: string }> }>(
      "/api/features/desk/matters",
    ),
  createClient: (body: { firstName: string; lastName: string; email?: string }) =>
    request<{ client: unknown }>("/api/features/desk/clients", { method: "POST", body: JSON.stringify(body) }),
  createMatter: (body: { clientId: string; title: string; uci?: string; program?: string }) =>
    request<{ matter: unknown }>("/api/features/desk/matters", { method: "POST", body: JSON.stringify(body) }),
  featureChecklist: (matterId: string) =>
    request<{ matter: unknown; items: Array<{ id: string; label: string; isComplete: boolean }> }>(
      `/api/features/checklists/${matterId}`,
    ),
  toggleChecklistItem: (matterId: string, itemId: string, isComplete: boolean) =>
    request<{ item: unknown }>(`/api/features/checklists/${matterId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ isComplete }),
    }),
  featureCompliance: () =>
    request<{ logs: Array<{ id: string; action: string; userEmail: string | null; createdAt: string }> }>(
      "/api/features/compliance/audit",
    ),
  featureIrccClassifications: () =>
    request<{ classifications: Array<{ id: string; classification: string; priority: string; subject: string | null }> }>(
      "/api/features/ircc/classifications",
    ),
  classifyIrccMessage: (body: { folder: string; messageUid: number; sender: string; subject: string }) =>
    request<{ classification: unknown }>("/api/features/ircc/classify", { method: "POST", body: JSON.stringify(body) }),
  featureMailLinks: () =>
    request<{ links: Array<{ id: string; subject: string | null; messageUid: number; matter: { title: string } }> }>(
      "/api/features/mail-links",
    ),
  linkMailToMatter: (body: { matterId: string; folder: string; messageUid: number; subject?: string }) =>
    request<{ link: unknown }>("/api/features/mail-links", { method: "POST", body: JSON.stringify(body) }),
  featureDeadlines: () =>
    request<{ deadlines: Array<{ id: string; title: string; dueAt: string; clientName: string }> }>(
      "/api/features/deadlines",
    ),
  createDeadline: (body: { matterId: string; title: string; dueAt: string }) =>
    request<{ deadline: unknown }>("/api/features/deadlines", { method: "POST", body: JSON.stringify(body) }),
  createPortalAccess: (matterId: string) =>
    request<{ access: { portalUrl: string } }>(`/api/features/portal/${matterId}/access`, { method: "POST" }),
  featurePortalDocuments: (matterId: string) =>
    request<{ documents: Array<{ id: string; label: string; status: string }> }>(
      `/api/features/portal/${matterId}/documents`,
    ),
  createPortalDocument: (matterId: string, label: string) =>
    request<{ document: unknown }>(`/api/features/portal/${matterId}/documents`, {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  reContacts: (role?: string) =>
    request<{
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        role: string;
      }>;
    }>(`/api/features/real-estate/contacts${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  createReContact: (body: { firstName: string; lastName: string; email?: string; phone?: string; role?: string }) =>
    request<{ contact: unknown }>("/api/features/real-estate/contacts", { method: "POST", body: JSON.stringify(body) }),
  reListings: (status?: string) =>
    request<{
      listings: Array<{
        id: string;
        address: string;
        city: string;
        mlsNumber: string | null;
        listPriceCents: number | null;
        status: string;
        sellerName: string | null;
        showingCount: number;
        dealCount: number;
      }>;
    }>(`/api/features/real-estate/listings${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createReListing: (body: {
    address: string;
    city: string;
    province?: string;
    postalCode?: string;
    mlsNumber?: string;
    listPriceCents?: number;
    sellerContactId?: string;
  }) => request<{ listing: unknown }>("/api/features/real-estate/listings", { method: "POST", body: JSON.stringify(body) }),
  updateReListingStatus: (id: string, status: string) =>
    request<{ listing: unknown }>(`/api/features/real-estate/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  reShowings: (status?: string) =>
    request<{
      showings: Array<{
        id: string;
        scheduledAt: string;
        status: string;
        contactName: string;
        listing: { id: string; address: string; city: string };
      }>;
    }>(`/api/features/real-estate/showings${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createReShowing: (body: {
    listingId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    notes?: string;
  }) => request<{ showing: unknown }>("/api/features/real-estate/showings", { method: "POST", body: JSON.stringify(body) }),
  updateReShowingStatus: (id: string, status: string) =>
    request<{ showing: unknown }>(`/api/features/real-estate/showings/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  reTemplates: () =>
    request<{
      templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }>;
    }>("/api/features/real-estate/templates"),
  reDeals: (status?: string) =>
    request<{
      deals: Array<{
        id: string;
        title: string;
        status: string;
        offerAmountCents: number | null;
        noteCount: number;
        listing: { id: string; address: string; city: string };
      }>;
    }>(`/api/features/real-estate/deals${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createReDeal: (body: {
    listingId: string;
    title: string;
    offerAmountCents?: number;
    buyerContactId?: string;
  }) => request<{ deal: unknown }>("/api/features/real-estate/deals", { method: "POST", body: JSON.stringify(body) }),
  updateReDealStatus: (id: string, status: string) =>
    request<{ deal: unknown }>(`/api/features/real-estate/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  reDealNotes: (dealId: string) =>
    request<{
      notes: Array<{
        id: string;
        body: string;
        createdAt: string;
        author: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/real-estate/deals/${dealId}/notes`),
  createReDealNote: (dealId: string, body: string) =>
    request<{ note: unknown }>(`/api/features/real-estate/deals/${dealId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  acContacts: (role?: string) =>
    request<{
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        role: string;
      }>;
    }>(`/api/features/accounting/contacts${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  createAcContact: (body: { firstName: string; lastName: string; email?: string; phone?: string; role?: string }) =>
    request<{ contact: unknown }>("/api/features/accounting/contacts", { method: "POST", body: JSON.stringify(body) }),
  acDocumentRequests: (status?: string) =>
    request<{
      requests: Array<{
        id: string;
        title: string;
        description: string | null;
        referenceCode: string | null;
        status: string;
        category: string;
        vaultStatus: string;
        fiscalYear: string | null;
        periodStart: string | null;
        periodEnd: string | null;
        dueAt: string | null;
        reminderAt: string | null;
        receivedAt: string | null;
        clientName: string | null;
      }>;
    }>(`/api/features/accounting/document-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createAcDocumentRequest: (body: {
    title: string;
    description?: string;
    referenceCode?: string;
    category?: string;
    vaultStatus?: string;
    fiscalYear?: string;
    periodStart?: string;
    periodEnd?: string;
    dueAt?: string;
    reminderAt?: string;
    clientContactId?: string;
  }) => request<{ request: unknown }>("/api/features/accounting/document-requests", { method: "POST", body: JSON.stringify(body) }),
  updateAcDocumentRequestStatus: (id: string, status: string) =>
    request<{ request: unknown }>(`/api/features/accounting/document-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  acFilingDeadlines: (status?: string) =>
    request<{
      deadlines: Array<{
        id: string;
        dueAt: string;
        status: string;
        filingType: string;
        taxPeriod: string;
        periodStart: string | null;
        periodEnd: string | null;
        reminderAt: string | null;
        filedAt: string | null;
        notes: string | null;
        contactName: string;
        clientEntity: { id: string; name: string; entityType: string };
      }>;
    }>(`/api/features/accounting/filing-deadlines${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createAcFilingDeadline: (body: {
    clientEntityId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    dueAt: string;
    filingType?: string;
    taxPeriod?: string;
    periodStart?: string;
    periodEnd?: string;
    reminderAt?: string;
    status?: string;
    notes?: string;
  }) => request<{ deadline: unknown }>("/api/features/accounting/filing-deadlines", { method: "POST", body: JSON.stringify(body) }),
  updateAcFilingDeadlineStatus: (id: string, status: string) =>
    request<{ deadline: unknown }>(`/api/features/accounting/filing-deadlines/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  acClientEntities: (status?: string) =>
    request<{
      entities: Array<{
        id: string;
        name: string;
        entityType: string;
        taxId: string | null;
        taxIdentifierType: string;
        taxIdentifier: string | null;
        jurisdiction: string | null;
        fiscalYearEnd: string | null;
        engagementType: string;
        status: string;
        primaryContactName: string | null;
        parentEntity: { id: string; name: string } | null;
        noteCount: number;
        filingDeadlineCount: number;
        childEntityCount: number;
        exchangeRecordCount: number;
      }>;
    }>(`/api/features/accounting/client-entities${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createAcClientEntity: (body: {
    name: string;
    entityType: string;
    taxId?: string;
    taxIdentifierType?: string;
    taxIdentifier?: string;
    jurisdiction?: string;
    fiscalYearEnd?: string;
    engagementType?: string;
    primaryContactId?: string;
    parentEntityId?: string;
  }) => request<{ entity: unknown }>("/api/features/accounting/client-entities", { method: "POST", body: JSON.stringify(body) }),
  acEntityNotes: (entityId: string) =>
    request<{
      notes: Array<{
        id: string;
        body: string;
        createdAt: string;
        author: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/accounting/client-entities/${entityId}/notes`),
  createAcEntityNote: (entityId: string, body: string) =>
    request<{ note: unknown }>(`/api/features/accounting/client-entities/${entityId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  acTemplates: () =>
    request<{
      templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }>;
    }>("/api/features/accounting/templates"),
  acExchangeRecords: (filter?: { status?: string; documentRequestId?: string; clientEntityId?: string }) => {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.documentRequestId) params.set("documentRequestId", filter.documentRequestId);
    if (filter?.clientEntityId) params.set("clientEntityId", filter.clientEntityId);
    const query = params.toString();
    return request<{
      exchangeRecords: Array<{
        id: string;
        direction: string;
        action: string;
        channel: string;
        documentName: string;
        category: string;
        status: string;
        notes: string | null;
        occurredAt: string;
        documentRequest: { id: string; title: string; referenceCode: string | null } | null;
        clientEntity: { id: string; name: string; entityType: string } | null;
        contactName: string | null;
        user: { id: string; email: string; displayName: string | null } | null;
        hasFile?: boolean;
        fileSizeBytes?: number | null;
        mimeType?: string | null;
      }>;
    }>(`/api/features/accounting/exchange-records${query ? `?${query}` : ""}`);
  },
  createAcExchangeRecord: (body: {
    documentRequestId?: string;
    clientEntityId?: string;
    contactId?: string;
    direction?: string;
    action?: string;
    channel?: string;
    documentName: string;
    category?: string;
    status?: string;
    notes?: string;
  }) => request<{ exchangeRecord: unknown }>("/api/features/accounting/exchange-records", { method: "POST", body: JSON.stringify(body) }),
  uploadAcExchangeDocument: (recordId: string, body: { fileName: string; mimeType: string; dataBase64: string }) =>
    request<{ exchangeRecord: unknown }>(`/api/features/accounting/exchange-records/${recordId}/upload`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  downloadAcExchangeDocument: (recordId: string) =>
    fetch(`/api/features/accounting/exchange-records/${recordId}/download`, { credentials: "include" }),
  rcContacts: (role?: string) =>
    request<{
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        role: string;
        source: string | null;
        currentCompany: string | null;
        desiredRole: string | null;
        salaryExpectationCents: number | null;
        availabilityDate: string | null;
        candidateStage: string;
      }>;
    }>(`/api/features/recruitment/contacts${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  createRcContact: (body: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    source?: string;
    currentCompany?: string;
    desiredRole?: string;
    salaryExpectationCents?: number;
    availabilityDate?: string;
    candidateStage?: string;
  }) =>
    request<{ contact: unknown }>("/api/features/recruitment/contacts", { method: "POST", body: JSON.stringify(body) }),
  rcRoles: (status?: string) =>
    request<{
      roles: Array<{
        id: string;
        title: string;
        clientCompany: string | null;
        requisitionCode: string | null;
        status: string;
        priority: string;
        employmentType: string;
        location: string | null;
        remotePolicy: string;
        salaryMinCents: number | null;
        salaryMaxCents: number | null;
        targetStartDate: string | null;
        pipelineStage: string;
        clientName: string | null;
        interviewCount: number;
        placementCount: number;
        submissionCount: number;
        campaignCount: number;
      }>;
    }>(`/api/features/recruitment/roles${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createRcRole: (body: {
    title: string;
    clientCompany?: string;
    requisitionCode?: string;
    priority?: string;
    employmentType?: string;
    location?: string;
    remotePolicy?: string;
    salaryMinCents?: number;
    salaryMaxCents?: number;
    targetStartDate?: string;
    pipelineStage?: string;
    clientContactId?: string;
  }) => request<{ role: unknown }>("/api/features/recruitment/roles", { method: "POST", body: JSON.stringify(body) }),
  updateRcRoleStatus: (
    id: string,
    body: string | Partial<{ status: string; priority: string; pipelineStage: string; targetStartDate: string }>,
  ) =>
    request<{ role: unknown }>(`/api/features/recruitment/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  rcInterviews: (status?: string) =>
    request<{
      interviews: Array<{
        id: string;
        scheduledAt: string;
        status: string;
        interviewType: string;
        roundNumber: number;
        interviewerName: string | null;
        feedbackStatus: string;
        score: number | null;
        outcomeReason: string | null;
        contactName: string;
        role: { id: string; title: string; clientCompany: string | null };
      }>;
    }>(`/api/features/recruitment/interviews${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createRcInterview: (body: {
    roleId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    interviewType?: string;
    roundNumber?: number;
    interviewerName?: string;
    feedbackStatus?: string;
    score?: number;
    outcomeReason?: string;
    notes?: string;
  }) => request<{ interview: unknown }>("/api/features/recruitment/interviews", { method: "POST", body: JSON.stringify(body) }),
  updateRcInterviewStatus: (
    id: string,
    body: string | Partial<{ status: string; feedbackStatus: string; score: number; outcomeReason: string }>,
  ) =>
    request<{ interview: unknown }>(`/api/features/recruitment/interviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  rcSubmissions: (stage?: string) =>
    request<{
      submissions: Array<{
        id: string;
        stage: string;
        source: string | null;
        score: number | null;
        submittedAt: string;
        notes: string | null;
        candidateName: string;
        candidateEmail: string | null;
        role: { id: string; title: string; clientCompany: string | null };
      }>;
    }>(`/api/features/recruitment/submissions${stage ? `?stage=${encodeURIComponent(stage)}` : ""}`),
  createRcSubmission: (body: {
    roleId: string;
    contactId: string;
    stage?: string;
    source?: string;
    score?: number;
    notes?: string;
  }) => request<{ submission: unknown }>("/api/features/recruitment/submissions", { method: "POST", body: JSON.stringify(body) }),
  updateRcSubmissionStage: (id: string, stage: string) =>
    request<{ submission: unknown }>(`/api/features/recruitment/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    }),
  rcCampaigns: (status?: string) =>
    request<{
      campaigns: Array<{
        id: string;
        name: string;
        channel: string;
        status: string;
        audience: string;
        sentCount: number;
        replyCount: number;
        launchedAt: string | null;
        subject: string | null;
        bodyHtml: string | null;
        scheduledFor: string | null;
        role: { id: string; title: string; clientCompany: string | null } | null;
      }>;
    }>(`/api/features/recruitment/campaigns${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createRcCampaign: (body: {
    name: string;
    roleId?: string;
    channel?: string;
    status?: string;
    audience?: string;
    subject?: string;
    bodyHtml?: string;
    scheduledFor?: string;
  }) => request<{ campaign: unknown }>("/api/features/recruitment/campaigns", { method: "POST", body: JSON.stringify(body) }),
  updateRcCampaignStatus: (
    id: string,
    status: string,
    body?: { subject?: string; bodyHtml?: string; scheduledFor?: string },
  ) =>
    request<{ campaign: unknown }>(`/api/features/recruitment/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...body }),
    }),
  launchRcCampaign: (id: string) =>
    request<{ sent: number }>(`/api/features/recruitment/campaigns/${id}/launch`, { method: "POST" }),
  rcTalentMailSearch: (q?: string) =>
    request<{
      results: Array<{ uid: number; subject: string; from: string; date: string; snippet: string }>;
    }>(`/api/features/recruitment/talent-search/mail${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  rcPlacements: (status?: string) =>
    request<{
      placements: Array<{
        id: string;
        title: string;
        status: string;
        compensationCents: number | null;
        startDate: string | null;
        offerAcceptedAt: string | null;
        recruiterFeeCents: number | null;
        guaranteeEndDate: string | null;
        onboardingStatus: string;
        noteCount: number;
        referenceCheckCount: number;
        candidateName: string | null;
        role: { id: string; title: string; clientCompany: string | null };
      }>;
    }>(`/api/features/recruitment/placements${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createRcPlacement: (body: {
    roleId: string;
    title: string;
    compensationCents?: number;
    candidateContactId?: string;
    startDate?: string;
    recruiterFeeCents?: number;
    guaranteeEndDate?: string;
    onboardingStatus?: string;
  }) => request<{ placement: unknown }>("/api/features/recruitment/placements", { method: "POST", body: JSON.stringify(body) }),
  updateRcPlacementStatus: (
    id: string,
    body: string | Partial<{ status: string; onboardingStatus: string; startDate: string }>,
  ) =>
    request<{ placement: unknown }>(`/api/features/recruitment/placements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  rcPlacementNotes: (placementId: string) =>
    request<{
      notes: Array<{
        id: string;
        body: string;
        createdAt: string;
        author: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/recruitment/placements/${placementId}/notes`),
  createRcPlacementNote: (placementId: string, body: string) =>
    request<{ note: unknown }>(`/api/features/recruitment/placements/${placementId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  rcReferenceChecks: (status?: string) =>
    request<{
      referenceChecks: Array<{
        id: string;
        refereeName: string;
        refereeEmail: string | null;
        relationship: string | null;
        status: string;
        completedAt: string | null;
        notes: string | null;
        candidateName: string;
        candidateEmail: string | null;
        placement: { id: string; title: string } | null;
      }>;
    }>(`/api/features/recruitment/reference-checks${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createRcReferenceCheck: (body: {
    contactId: string;
    placementId?: string;
    refereeName: string;
    refereeEmail?: string;
    relationship?: string;
    status?: string;
    notes?: string;
  }) => request<{ referenceCheck: unknown }>("/api/features/recruitment/reference-checks", { method: "POST", body: JSON.stringify(body) }),
  updateRcReferenceCheckStatus: (id: string, status: string) =>
    request<{ referenceCheck: unknown }>(`/api/features/recruitment/reference-checks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  rcTemplates: () =>
    request<{
      templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }>;
    }>("/api/features/recruitment/templates"),
  b2bContacts: (role?: string) =>
    request<{
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        role: string;
        company: string | null;
        title: string | null;
        decisionRole: string | null;
      }>;
    }>(`/api/features/b2b/contacts${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  createB2bContact: (body: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    company?: string;
    title?: string;
    decisionRole?: string;
  }) =>
    request<{ contact: unknown }>("/api/features/b2b/contacts", { method: "POST", body: JSON.stringify(body) }),
  b2bWorkspaces: (status?: string) =>
    request<{
      workspaces: Array<{
        id: string;
        name: string;
        clientDomain: string | null;
        status: string;
        accountTier: string;
        arrCents: number | null;
        healthScore: number;
        brandColor: string | null;
        routingDomain: string | null;
        routingStatus?: string;
        routingMailbox?: string | null;
        routingActivatedAt?: string | null;
        onboardingStage: string;
        renewalDate: string | null;
        clientName: string | null;
        milestoneCount: number;
        deliverableCount: number;
        proposalCount: number;
        slaCaseCount: number;
      }>;
    }>(`/api/features/b2b/workspaces${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createB2bWorkspace: (body: {
    name: string;
    clientDomain?: string;
    accountTier?: string;
    arrCents?: number;
    healthScore?: number;
    brandColor?: string;
    routingDomain?: string;
    onboardingStage?: string;
    renewalDate?: string;
    clientContactId?: string;
  }) => request<{ workspace: unknown }>("/api/features/b2b/workspaces", { method: "POST", body: JSON.stringify(body) }),
  updateB2bWorkspaceStatus: (
    id: string,
    body: string | Partial<{ status: string; accountTier: string; healthScore: number; onboardingStage: string; renewalDate: string }>,
  ) =>
    request<{ workspace: unknown }>(`/api/features/b2b/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  b2bMilestones: (status?: string) =>
    request<{
      milestones: Array<{
        id: string;
        title: string;
        scheduledAt: string;
        status: string;
        milestoneType: string;
        phase: string;
        ownerRole: string | null;
        deliverableUrl: string | null;
        contactName: string;
        workspace: { id: string; name: string; clientDomain: string | null };
      }>;
    }>(`/api/features/b2b/milestones${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createB2bMilestone: (body: {
    workspaceId: string;
    title: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    milestoneType?: string;
    phase?: string;
    ownerRole?: string;
    deliverableUrl?: string;
    notes?: string;
  }) => request<{ milestone: unknown }>("/api/features/b2b/milestones", { method: "POST", body: JSON.stringify(body) }),
  updateB2bMilestoneStatus: (id: string, status: string) =>
    request<{ milestone: unknown }>(`/api/features/b2b/milestones/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  b2bDeliverables: (status?: string) =>
    request<{
      deliverables: Array<{
        id: string;
        title: string;
        kind: string;
        status: string;
        dueAt: string | null;
        url: string | null;
        approvedAt: string | null;
        workspace: { id: string; name: string; clientDomain: string | null };
      }>;
    }>(`/api/features/b2b/deliverables${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createB2bDeliverable: (body: {
    workspaceId: string;
    title: string;
    kind?: string;
    status?: string;
    dueAt?: string;
    url?: string;
  }) => request<{ deliverable: unknown }>("/api/features/b2b/deliverables", { method: "POST", body: JSON.stringify(body) }),
  updateB2bDeliverableStatus: (id: string, status: string) =>
    request<{ deliverable: unknown }>(`/api/features/b2b/deliverables/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  b2bProposals: (status?: string) =>
    request<{
      proposals: Array<{
        id: string;
        title: string;
        version: number;
        status: string;
        sowUrl: string | null;
        amountCents: number | null;
        validUntil: string | null;
        approvedAt: string | null;
        workspace: { id: string; name: string; clientDomain: string | null };
      }>;
    }>(`/api/features/b2b/proposals${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createB2bProposal: (body: {
    workspaceId: string;
    title: string;
    version?: number;
    status?: string;
    sowUrl?: string;
    amountCents?: number;
    validUntil?: string;
  }) => request<{ proposal: unknown }>("/api/features/b2b/proposals", { method: "POST", body: JSON.stringify(body) }),
  updateB2bProposalStatus: (id: string, status: string) =>
    request<{ proposal: unknown }>(`/api/features/b2b/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  b2bSlaCases: (status?: string) =>
    request<{
      slaCases: Array<{
        id: string;
        title: string;
        status: string;
        severity: string;
        category: string;
        responseTargetMinutes: number;
        resolutionTargetMinutes: number;
        responseDueAt: string | null;
        breachAt: string | null;
        escalatedAt: string | null;
        resolvedAt: string | null;
        noteCount: number;
        eventCount: number;
        workspace: { id: string; name: string; clientDomain: string | null };
      }>;
    }>(`/api/features/b2b/sla-cases${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createB2bSlaCase: (body: {
    workspaceId: string;
    title: string;
    status?: string;
    severity?: string;
    category?: string;
    responseTargetMinutes?: number;
    resolutionTargetMinutes?: number;
    responseDueAt?: string;
    breachAt?: string;
  }) => request<{ slaCase: unknown }>("/api/features/b2b/sla-cases", { method: "POST", body: JSON.stringify(body) }),
  updateB2bSlaCaseStatus: (
    id: string,
    body: string | Partial<{ status: string; escalated: boolean; resolved: boolean }>,
  ) =>
    request<{ slaCase: unknown }>(`/api/features/b2b/sla-cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  b2bSlaNotes: (caseId: string) =>
    request<{
      notes: Array<{
        id: string;
        body: string;
        createdAt: string;
        author: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/b2b/sla-cases/${caseId}/notes`),
  createB2bSlaNote: (caseId: string, body: string) =>
    request<{ note: unknown }>(`/api/features/b2b/sla-cases/${caseId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  b2bSlaEvents: (caseId: string) =>
    request<{
      events: Array<{
        id: string;
        eventType: string;
        message: string;
        createdAt: string;
        user: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/b2b/sla-cases/${caseId}/events`),
  createB2bSlaEvent: (caseId: string, body: { eventType: string; message: string }) =>
    request<{ event: unknown }>(`/api/features/b2b/sla-cases/${caseId}/events`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  b2bTemplates: () =>
    request<{
      templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }>;
    }>("/api/features/b2b/templates"),
  hcContacts: (role?: string) =>
    request<{
      contacts: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        role: string;
        dateOfBirth: string | null;
        medicalRecordNumber: string | null;
        preferredProvider: string | null;
      }>;
    }>(`/api/features/healthcare/contacts${role ? `?role=${encodeURIComponent(role)}` : ""}`),
  createHcContact: (body: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    dateOfBirth?: string;
    medicalRecordNumber?: string;
    preferredProvider?: string;
  }) =>
    request<{ contact: unknown }>("/api/features/healthcare/contacts", { method: "POST", body: JSON.stringify(body) }),
  hcPatientCharts: (status?: string) =>
    request<{
      charts: Array<{
        id: string;
        chartNumber: string;
        status: string;
        careStage: string;
        referralStatus: string;
        authorizationStatus: string;
        lastContactAt: string | null;
        callbackRequired: boolean;
        patientName: string | null;
        appointmentCount: number;
        referralCount: number;
        auditCaseCount: number;
        accessLogCount: number;
      }>;
    }>(`/api/features/healthcare/patient-charts${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createHcPatientChart: (body: {
    chartNumber: string;
    patientContactId?: string;
    careStage?: string;
    referralStatus?: string;
    authorizationStatus?: string;
    callbackRequired?: boolean;
  }) => request<{ chart: unknown }>("/api/features/healthcare/patient-charts", { method: "POST", body: JSON.stringify(body) }),
  updateHcPatientChartStatus: (
    id: string,
    body: string | Partial<{
      status: string;
      careStage: string;
      referralStatus: string;
      authorizationStatus: string;
      callbackRequired: boolean;
      lastContactAt: string;
    }>,
  ) =>
    request<{ chart: unknown }>(`/api/features/healthcare/patient-charts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  hcAppointments: (status?: string) =>
    request<{
      appointments: Array<{
        id: string;
        scheduledAt: string;
        status: string;
        appointmentType: string;
        callbackStatus: string;
        noShowReason: string | null;
        contactName: string;
        chart: { id: string; chartNumber: string };
      }>;
    }>(`/api/features/healthcare/appointments${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createHcAppointment: (body: {
    chartId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    appointmentType?: string;
    callbackStatus?: string;
    noShowReason?: string;
    notes?: string;
  }) => request<{ appointment: unknown }>("/api/features/healthcare/appointments", { method: "POST", body: JSON.stringify(body) }),
  updateHcAppointmentStatus: (id: string, body: string | { status?: string; callbackStatus?: string; noShowReason?: string }) =>
    request<{ appointment: unknown }>(`/api/features/healthcare/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  hcReferrals: (status?: string) =>
    request<{
      referrals: Array<{
        id: string;
        direction: string;
        referralType: string;
        specialty: string | null;
        status: string;
        priority: string;
        receivedAt: string;
        dueAt: string | null;
        patientName: string | null;
        providerName: string | null;
        chart: { id: string; chartNumber: string };
      }>;
    }>(`/api/features/healthcare/referrals${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createHcReferral: (body: {
    chartId: string;
    patientContactId?: string;
    providerContactId?: string;
    direction?: string;
    referralType?: string;
    specialty?: string;
    status?: string;
    priority?: string;
    dueAt?: string;
    notes?: string;
  }) => request<{ referral: unknown }>("/api/features/healthcare/referrals", { method: "POST", body: JSON.stringify(body) }),
  updateHcReferralStatus: (id: string, status: string) =>
    request<{ referral: unknown }>(`/api/features/healthcare/referrals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  hcAuditCases: (status?: string) =>
    request<{
      cases: Array<{
        id: string;
        title: string;
        status: string;
        severity: string | null;
        accessReason: string | null;
        roleScope: string | null;
        exportRequestedAt: string | null;
        resolvedAt: string | null;
        noteCount: number;
        chart: { id: string; chartNumber: string };
      }>;
    }>(`/api/features/healthcare/audit-cases${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  createHcAuditCase: (body: {
    chartId: string;
    title: string;
    severity?: string;
    accessReason?: string;
    roleScope?: string;
  }) => request<{ auditCase: unknown }>("/api/features/healthcare/audit-cases", { method: "POST", body: JSON.stringify(body) }),
  updateHcAuditCaseStatus: (id: string, body: string | { status?: string; exportRequested?: boolean; resolved?: boolean }) =>
    request<{ auditCase: unknown }>(`/api/features/healthcare/audit-cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(typeof body === "string" ? { status: body } : body),
    }),
  hcAuditNotes: (caseId: string) =>
    request<{
      notes: Array<{
        id: string;
        body: string;
        createdAt: string;
        author: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/healthcare/audit-cases/${caseId}/notes`),
  createHcAuditNote: (caseId: string, body: string) =>
    request<{ note: unknown }>(`/api/features/healthcare/audit-cases/${caseId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  hcAccessLogs: (chartId?: string) =>
    request<{
      logs: Array<{
        id: string;
        action: string;
        reason: string;
        roleScope: string;
        ipAddress: string | null;
        exportedAt: string | null;
        createdAt: string;
        chart: { id: string; chartNumber: string };
        user: { id: string; email: string; displayName: string | null };
      }>;
    }>(`/api/features/healthcare/access-logs${chartId ? `?chartId=${encodeURIComponent(chartId)}` : ""}`),
  createHcAccessLog: (body: { chartId: string; action: string; reason: string; roleScope: string }) =>
    request<{ log: unknown }>("/api/features/healthcare/access-logs", { method: "POST", body: JSON.stringify(body) }),
  hcTemplates: () =>
    request<{
      templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }>;
    }>("/api/features/healthcare/templates"),
  attachmentUrl: (folder: string, uid: number, partId: string) =>
    `${API_BASE}/api/mail/messages/${uid}/attachments/${partId}?folder=${encodeURIComponent(folder)}`,
  contacts: () => request<{ contacts: MailContact[] }>("/api/contacts"),
  createContact: (body: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    notes?: string;
  }) => request<{ contact: MailContact }>("/api/contacts", { method: "POST", body: JSON.stringify(body) }),
  updateContact: (
    id: string,
    body: Partial<{
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      company: string | null;
      notes: string | null;
    }>,
  ) => request<{ contact: MailContact }>(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContact: (id: string) => request<void>(`/api/contacts/${id}`, { method: "DELETE" }),
  suggestContacts: (emails: string[]) =>
    request<{ suggestions: string[] }>("/api/contacts/suggest", {
      method: "POST",
      body: JSON.stringify({ emails }),
    }),
  syncInboxContacts: (options?: { force?: boolean }) =>
    request<{ addedCount: number; addedEmails: string[]; skippedReason?: string }>("/api/contacts/sync-inbox", {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    }),
  contactLists: () => request<{ lists: MailContactCollection[] }>("/api/contacts/lists"),
  createContactList: (body: { name: string; description?: string | null }) =>
    request<{ list: MailContactCollection }>("/api/contacts/lists", { method: "POST", body: JSON.stringify(body) }),
  updateContactList: (id: string, body: Partial<{ name: string; description: string | null }>) =>
    request<{ list: MailContactCollection }>(`/api/contacts/lists/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContactList: (id: string) => request<void>(`/api/contacts/lists/${id}`, { method: "DELETE" }),
  addContactToList: (listId: string, contactId: string) =>
    request<{ ok: boolean }>(`/api/contacts/lists/${listId}/members`, {
      method: "POST",
      body: JSON.stringify({ contactId }),
    }),
  contactGroups: () => request<{ groups: MailContactCollection[] }>("/api/contacts/groups"),
  createContactGroup: (body: { name: string; description?: string | null }) =>
    request<{ group: MailContactCollection }>("/api/contacts/groups", { method: "POST", body: JSON.stringify(body) }),
  updateContactGroup: (id: string, body: Partial<{ name: string; description: string | null }>) =>
    request<{ group: MailContactCollection }>(`/api/contacts/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteContactGroup: (id: string) => request<void>(`/api/contacts/groups/${id}`, { method: "DELETE" }),
  addContactToGroup: (groupId: string, contactId: string) =>
    request<{ ok: boolean }>(`/api/contacts/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ contactId }),
    }),

  composeSettings: () =>
    request<{
      settings: {
        displayName: string | null;
        autoReplyEnabled: boolean;
        activeSignatureId: string | null;
        activeAutoReplyId: string | null;
        signatures: Array<{ id: string; name: string; body: string; avatarUrl: string | null; isDefault: boolean }>;
        autoReplies: Array<{ id: string; name: string; subject: string; body: string; enabled: boolean }>;
        undoSendSeconds: number;
        defaultBrandedSignature: { html: string; text: string } | null;
        autoReplyEntitlement: {
          entitled: boolean;
          gated: boolean;
          complimentaryActive: boolean;
          subscribed: boolean;
          daysLeft: number;
          complimentaryEndsAt: string | null;
          upsellDue: boolean;
        };
      };
    }>("/api/mail/compose-settings"),
  updateComposeSettings: (body: {
    displayName?: string;
    autoReplyEnabled?: boolean;
    activeSignatureId?: string;
    activeAutoReplyId?: string;
    undoSendSeconds?: number;
  }) =>
    request<{ settings: unknown }>("/api/mail/compose-settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  educationPreferences: () =>
    request<{ preferences: { optOut: boolean } }>("/api/mail/education-preferences"),
  updateEducationPreferences: (body: { optOut: boolean }) =>
    request<{ preferences: { optOut: boolean } }>("/api/mail/education-preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createSignature: (body: { name: string; body: string; avatarUrl?: string; isDefault?: boolean }) =>
    request<{ signature: unknown }>("/api/mail/signatures", { method: "POST", body: JSON.stringify(body) }),
  updateSignature: (id: string, body: Partial<{ name: string; body: string; avatarUrl: string; isDefault: boolean }>) =>
    request<{ signature: unknown }>(`/api/mail/signatures/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteSignature: (id: string) => request<void>(`/api/mail/signatures/${id}`, { method: "DELETE" }),
  createAutoReply: (body: { name: string; subject: string; body: string; enabled?: boolean }) =>
    request<{ autoReply: unknown }>("/api/mail/auto-replies", { method: "POST", body: JSON.stringify(body) }),
  updateAutoReply: (id: string, body: Partial<{ name: string; subject: string; body: string; enabled: boolean }>) =>
    request<{ autoReply: unknown }>(`/api/mail/auto-replies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAutoReply: (id: string) => request<void>(`/api/mail/auto-replies/${id}`, { method: "DELETE" }),
  mailTracking: () =>
    request<{
      tracking: Array<{
        id: string;
        toEmail: string;
        subject: string;
        openCount: number;
        firstOpenedAt: string | null;
        lastOpenedAt: string | null;
        createdAt: string;
        linkCount: number;
        totalLinkClicks: number;
      }>;
    }>("/api/mail/tracking"),
  mailTrackingDetail: (id: string) =>
    request<{
      tracking: {
        id: string;
        toEmail: string;
        subject: string;
        openCount: number;
        firstOpenedAt: string | null;
        lastOpenedAt: string | null;
        createdAt: string;
        linkCount: number;
        totalLinkClicks: number;
        links: Array<{
          id: string;
          originalUrl: string;
          clickCount: number;
          firstClickedAt: string | null;
          lastClickedAt: string | null;
          linkOrder: number;
        }>;
      };
    }>(`/api/mail/tracking/${id}`),
  listVaultFiles: () =>
    request<{
      files: Array<{
        id: string;
        originalName: string;
        mimeType: string;
        fileSizeBytes: number;
        downloadCount: number;
        expiresAt: string;
        lastDownloadAt: string | null;
        createdAt: string;
        downloadUrl: string;
      }>;
    }>("/api/mail/vault"),
  uploadVaultFile: (body: { fileName: string; mimeType: string; dataBase64: string }) =>
    request<{
      file: {
        id: string;
        originalName: string;
        mimeType: string;
        fileSizeBytes: number;
        downloadCount: number;
        expiresAt: string;
        lastDownloadAt: string | null;
        createdAt: string;
        downloadUrl: string;
      };
    }>("/api/mail/vault", { method: "POST", body: JSON.stringify(body) }),
  deleteVaultFile: (id: string) => request<void>(`/api/mail/vault/${id}`, { method: "DELETE" }),

  listMailAccounts: () =>
    request<{
      accounts: Array<{
        id: string;
        email: string;
        label: string | null;
        providerPreset: string;
        isPrimary: boolean;
        sortOrder: number;
        isActive: boolean;
        createdAt: string;
      }>;
      activeMailAccountId: string | null;
    }>("/api/mail/accounts"),
  mailAccountsUnreadSummary: () =>
    request<{
      accounts: Array<{
        id: string;
        email: string;
        label: string | null;
        unread: number;
        isActive: boolean;
        isPrimary: boolean;
      }>;
      activeMailAccountId: string | null;
    }>("/api/mail/accounts/unread-summary"),
  recipientSuggestions: (q = "", limit = 20) =>
    request<{
      suggestions: Array<{
        email: string;
        label: string | null;
        source: "contact" | "inbox" | "sent";
      }>;
    }>(`/api/mail/recipient-suggestions?q=${encodeURIComponent(q)}&limit=${limit}`),
  createMailAccount: (body: {
    email: string;
    password: string;
    label?: string;
    providerPreset: string;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
  }) =>
    request<{
      account: {
        id: string;
        email: string;
        label: string | null;
        isPrimary: boolean;
        isActive: boolean;
      } | undefined;
      activeMailAccountId: string | null;
    }>("/api/mail/accounts", { method: "POST", body: JSON.stringify(body) }),
  activateMailAccount: (id: string) =>
    request<{
      accounts: Array<{
        id: string;
        email: string;
        label: string | null;
        isPrimary: boolean;
        isActive: boolean;
      }>;
      activeMailAccountId: string | null;
    }>(`/api/mail/accounts/${id}/activate`, { method: "POST" }),
  deleteMailAccount: (id: string) => request<void>(`/api/mail/accounts/${id}`, { method: "DELETE" }),

  listCleanupSenders: (folder = "INBOX") =>
    request<{
      folder: string;
      scannedCount: number;
      senders: Array<{
        senderKey: string;
        senderEmail: string;
        displayFrom: string;
        messageCount: number;
        unreadCount: number;
        oldestDate: string | null;
        newestDate: string | null;
        hasUnsubscribe: boolean;
      }>;
    }>(`/api/mail/cleanup/senders?folder=${encodeURIComponent(folder)}`),
  runSenderCleanup: (body: { folder: string; senderKey: string; action: "delete" | "archive" | "markRead" }) =>
    request<{ processedCount: number; action: string; senderEmail: string }>("/api/mail/cleanup/senders/action", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getMessageUnsubscribeInfo: (folder: string, uid: number) =>
    request<{
      folder: string;
      uid: number;
      senderEmail: string | null;
      options: Array<{ url: string; method: "get" | "post" }>;
    }>(`/api/mail/cleanup/unsubscribe?folder=${encodeURIComponent(folder)}&uid=${uid}`),
  unsubscribeFromMessage: (body: { folder: string; uid: number; preferredUrl?: string }) =>
    request<{ ok: boolean; log: { id: string; status: string; senderEmail: string } }>("/api/mail/cleanup/unsubscribe", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listUnsubscribeLogs: () =>
    request<{
      logs: Array<{
        id: string;
        senderEmail: string;
        folder: string;
        messageUid: number;
        unsubscribeUrl: string;
        method: string;
        status: string;
        httpStatus: number | null;
        errorMessage: string | null;
        createdAt: string;
      }>;
    }>("/api/mail/cleanup/logs"),

  listAttachmentCategories: () =>
    request<{ categories: Array<{ category: string; label: string; count: number }> }>(
      "/api/mail/attachments/categories",
    ),
  listCategorizedAttachments: (params?: { category?: string; folder?: string }) => {
    const search = new URLSearchParams();
    if (params?.category) search.set("category", params.category);
    if (params?.folder) search.set("folder", params.folder);
    const query = search.toString();
    return request<{
      attachments: Array<{
        id: string;
        folder: string;
        messageUid: number;
        partId: string;
        filename: string;
        mimeType: string;
        fileSizeBytes: number;
        category: string;
        categoryLabel: string;
        categorySource: string;
        messageSubject: string;
        messageFrom: string;
        messageDate: string;
        vaultFileId: string | null;
      }>;
    }>(`/api/mail/attachments/categorized${query ? `?${query}` : ""}`);
  },
  scanAttachmentCategories: (folder = "INBOX") =>
    request<{ folder: string; scannedMessages: number; upsertedAttachments: number }>(
      "/api/mail/attachments/scan",
      { method: "POST", body: JSON.stringify({ folder }) },
    ),
  categorizeMessageAttachments: (folder: string, uid: number) =>
    request<{
      folder: string;
      uid: number;
      attachments: Array<{
        id: string;
        partId: string;
        category: string;
        categoryLabel: string;
        vaultFileId: string | null;
      }>;
    }>(`/api/mail/attachments/message?folder=${encodeURIComponent(folder)}&uid=${uid}`),
  updateAttachmentCategory: (id: string, category: string) =>
    request<{ attachment: { id: string; category: string; categorySource: string } }>(
      `/api/mail/attachments/${id}/category`,
      { method: "PATCH", body: JSON.stringify({ category }) },
    ),
  exportCategorizedAttachmentToVault: (id: string) =>
    request<{ vaultFileId: string; reused: boolean; record: { id: string; vaultFileId: string | null } }>(
      `/api/mail/attachments/${id}/vault`,
      { method: "POST" },
    ),

  listEsignRequests: () =>
    request<{
      requests: Array<{
        id: string;
        documentName: string;
        status: string;
        signerEmail: string;
        signerName: string;
        signingUrl: string | null;
        documentDownloadUrl: string | null;
        createdAt: string;
      }>;
    }>("/api/mail/esign"),
  createEsignUpload: (body: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
    signerEmail: string;
    signerName: string;
    subject: string;
    message: string;
  }) =>
    request<{ request: { id: string; documentName: string; status: string } }>("/api/mail/esign/upload", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createEsignFromAttachment: (body: {
    folder: string;
    messageUid: number;
    partId: string;
    signerEmail: string;
    signerName: string;
    subject: string;
    message: string;
    messageSubjectSnapshot?: string;
  }) =>
    request<{ request: { id: string; documentName: string; status: string } }>("/api/mail/esign/from-attachment", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  refreshEsignRequest: (id: string) =>
    request<{ request: { id: string; status: string } }>(`/api/mail/esign/${id}/refresh`, { method: "POST" }),
  getEsignComposeHandoff: (id: string) =>
    request<{ compose: { to: string; subject: string; html: string; text: string } }>(
      `/api/mail/esign/${id}/compose-handoff`,
    ),

  getEmailSlaSettings: () =>
    request<{
      settings: { responseHours: number; atRiskRatio: number; scanFolder: string; enabled: boolean; updatedAt: string };
    }>("/api/mail/sla/settings"),
  updateEmailSlaSettings: (body: {
    responseHours?: number;
    atRiskRatio?: number;
    scanFolder?: string;
    enabled?: boolean;
  }) =>
    request<{ settings: { responseHours: number; atRiskRatio: number; scanFolder: string; enabled: boolean } }>(
      "/api/mail/sla/settings",
      { method: "PUT", body: JSON.stringify(body) },
    ),
  listEmailSlaThreads: (status?: string) =>
    request<{
      threads: Array<{
        id: string;
        subject: string;
        fromEmail: string;
        fromDisplay: string;
        status: string;
        remainingLabel: string | null;
        deadlineAt: string;
        folder: string;
        messageUid: number;
      }>;
    }>(`/api/mail/sla/threads${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  listEmailSlaAlerts: () =>
    request<{
      alerts: Array<{
        id: string;
        alertType: string;
        createdAt: string;
        thread: {
          id: string;
          subject: string;
          fromDisplay: string;
          remainingLabel: string | null;
        };
      }>;
    }>("/api/mail/sla/alerts"),
  scanEmailSlaThreads: (folder = "INBOX") =>
    request<{ folder: string; scannedMessages: number; createdThreads: number; updatedThreads: number }>(
      "/api/mail/sla/scan",
      { method: "POST", body: JSON.stringify({ folder }) },
    ),
  dismissEmailSlaThread: (id: string) =>
    request<{ thread: { id: string; status: string } }>(`/api/mail/sla/threads/${id}/dismiss`, { method: "POST" }),
  acknowledgeEmailSlaAlert: (id: string) =>
    request<{ alert: { id: string; acknowledgedAt: string | null } }>(`/api/mail/sla/alerts/${id}/acknowledge`, {
      method: "POST",
    }),
  getEmailSlaComposeHandoff: (id: string) =>
    request<{
      compose: {
        mode?: "reply";
        to: string;
        subject: string;
        inReplyTo?: string;
        references?: string;
      };
    }>(`/api/mail/sla/threads/${id}/compose-handoff`),
  exportEmailSlaReport: () =>
    request<{ report: { id: string; rowCount: number; downloadUrl: string; expiresAt: string } }>(
      "/api/mail/sla/reports/export",
      { method: "POST" },
    ),

  getJobHunterSettings: () =>
    request<{
      settings: {
        regionCode: string;
        enabled: boolean;
        pausedUntil: string | null;
        paused: boolean;
        manualJobHuntingOverride: boolean;
        careerScore: number;
        careerNavUnlocked: boolean;
        careerNavScoreThreshold: number;
        careerUnlockedAt: string | null;
        tierBDisclosureVersion: string | null;
        tierBDisclosureAcceptedAt: string | null;
        needsTierBDisclosure: boolean;
        inferencesDeletedAt: string | null;
        entitlement: import("../types/addon").JobHunterEntitlement;
        mailAccounts: Array<{
          id: string;
          email: string;
          label: string | null;
          isPrimary: boolean;
          domainKind: string;
          scanEnabled: boolean;
          canScan: boolean;
        }>;
      };
    }>("/api/mail/job-hunter/settings"),
  getJobHunterConsent: () =>
    request<{
      consent: {
        needsDisclosure: boolean;
        tierBDisclosureVersion: string;
        acceptedAt: string | null;
        recordedVersion: string | null;
      };
    }>("/api/mail/job-hunter/consent"),
  acceptJobHunterConsent: () =>
    request<{ settings: unknown }>("/api/mail/job-hunter/consent", { method: "POST" }),
  updateJobHunterSettings: (body: {
    regionCode?: "US" | "CA" | "UK" | "ME" | "INTL";
    enabled?: boolean;
    pause90Days?: boolean;
    clearPause?: boolean;
    manualJobHuntingOverride?: boolean;
    mailAccountScan?: Array<{ mailAccountId: string; scanEnabled: boolean }>;
  }) =>
    request<{ settings: unknown }>("/api/mail/job-hunter/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteJobHunterInferences: () =>
    request<{ settings: unknown }>("/api/mail/job-hunter/inferences/delete", { method: "POST" }),

  getJobHunterScannerRegions: () =>
    request<{ regions: Array<{ code: string; label: string }> }>("/api/job-hunter/scanner/regions"),

  rateJobHunterCv: (body: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
    region: string;
    targetRole?: string;
    fromToastOptIn?: boolean;
  }) => request<{ rating: CvRatingResult }>("/api/job-hunter/scanner/rate", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  listJobApplications: (status?: string) => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ applications: JobApplicationRow[] }>(`/api/job-hunter/applications${query}`);
  },

  syncJobApplications: () =>
    request<{ result: { scannedMessages: number; upsertedApplications: number; skipped: string | null } }>(
      "/api/job-hunter/applications/sync",
      { method: "POST" },
    ),

  getJobApplication: (id: string) =>
    request<{ application: JobApplicationRow }>(`/api/job-hunter/applications/${id}`),

  createJobApplication: (body: {
    company: string;
    roleTitle: string;
    appliedAt?: string;
    status?: JobApplicationRow["status"];
  }) =>
    request<{ application: JobApplicationRow }>("/api/job-hunter/applications", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateJobApplication: (
    id: string,
    body: Partial<Pick<JobApplicationRow, "company" | "roleTitle" | "status">> & { appliedAt?: string },
  ) =>
    request<{ application: JobApplicationRow }>(`/api/job-hunter/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listJobHunterCvTemplates: (query = "") =>
    request<{
      templates: JobHunterCvTemplateMeta[];
      groupedByProfession: Array<{
        profession: string;
        label: string;
        templates: JobHunterCvTemplateMeta[];
      }>;
      filters: {
        roleCategories: string[];
        industries: string[];
        experienceLevels: string[];
        professions: Array<{ code: string; label: string }>;
      };
    }>(`/api/job-hunter/cv/templates${query}`),

  listJobHunterCvDocuments: () =>
    request<{ documents: JobHunterCvDocumentRow[] }>("/api/job-hunter/cv/documents"),

  getJobHunterCvDocument: (id: string) =>
    request<{ document: JobHunterCvDocumentRow }>(`/api/job-hunter/cv/documents/${id}`),

  createJobHunterCvDocument: (body: {
    title?: string;
    region?: string;
    role?: string;
    industry?: string;
    templateId?: string;
    content?: JobHunterCvContent;
  }) =>
    request<{ document: JobHunterCvDocumentRow }>("/api/job-hunter/cv/documents", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateJobHunterCvDocument: (
    id: string,
    body: {
      title?: string;
      region?: string;
      role?: string;
      industry?: string;
      content?: JobHunterCvContent;
    },
  ) =>
    request<{ document: JobHunterCvDocumentRow }>(`/api/job-hunter/cv/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  async exportJobHunterCvPdf(id: string) {
    const res = await fetch(`${API_BASE}/api/job-hunter/cv/documents/${encodeURIComponent(id)}/export-pdf`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      let message = "CV PDF export failed";
      try {
        const data = (await res.json()) as { error?: string };
        message = data.error ?? message;
      } catch {
        // ignore
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "cv.pdf";
    return { blob, filename };
  },

  publishJobHunterDocument: (body: {
    cvDocumentId?: string;
    fileName?: string;
    mimeType?: string;
    dataBase64?: string;
    source?: "job_hunter_cv" | "job_hunter_scanner";
    isPinned?: boolean;
  }) =>
    request<{ document: UserDocumentRow }>("/api/job-hunter/documents/publish", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listUserDocuments: () => request<{ documents: UserDocumentRow[] }>("/api/mail/documents"),

  listAttachableCareerDocuments: () =>
    request<{ documents: UserDocumentRow[] }>("/api/mail/documents/attachable/career"),

  pinUserDocument: (id: string, isPinned: boolean) =>
    request<{ document: UserDocumentRow }>(`/api/mail/documents/${id}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned }),
    }),

  async downloadUserDocument(id: string) {
    const res = await fetch(`${API_BASE}/api/mail/documents/${encodeURIComponent(id)}/download`, {
      credentials: "include",
    });
    if (!res.ok) {
      let message = "Document download failed";
      try {
        const data = (await res.json()) as { error?: string };
        message = data.error ?? message;
      } catch {
        // ignore
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "document";
    return { blob, filename };
  },

  listJobSiteLinks: () => request<{ links: JobSiteLinkRow[] }>("/api/job-hunter/job-sites"),

  createJobSiteLink: (body: { label: string; url: string; sortOrder?: number }) =>
    request<{ link: JobSiteLinkRow }>("/api/job-hunter/job-sites", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateJobSiteLink: (id: string, body: { label?: string; url?: string; sortOrder?: number }) =>
    request<{ link: JobSiteLinkRow }>(`/api/job-hunter/job-sites/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteJobSiteLink: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/job-hunter/job-sites/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok && res.status !== 204) {
      let message = "Could not delete job site link";
      try {
        const data = (await res.json()) as { error?: string };
        message = data.error ?? message;
      } catch {
        // ignore
      }
      throw new ApiError(message, res.status);
    }
  },

  generateInterviewPrep: (body: {
    jobDescription?: string;
    applicationId?: string;
    targetRole?: string;
    region?: string;
  }) =>
    request<{ prep: InterviewPrepResult }>("/api/job-hunter/interview-prep", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getApplyAssistWallet: () => request<{ wallet: ApplyAssistWallet }>("/api/job-hunter/apply-assist/wallet"),

  getApplyAssistSetup: () =>
    request<{
      setup: {
        channels: string[];
        regions: Array<{ code: string; label: string }>;
        documents: Array<{ id: string; filename: string }>;
        creditPackPriceCents: number;
        creditsPerPack: number;
        dailyCap: number;
        linkedInIndeedCopy: string;
      };
    }>("/api/job-hunter/apply-assist/setup"),

  purchaseApplyAssistCredits: (body: { provider?: "stripe" | "paystack" | "mock"; successUrl?: string; cancelUrl?: string }) =>
    request<{ checkout: { id: string; checkoutUrl: string | null; amountCents: number; productName: string; credits: number } }>(
      "/api/job-hunter/apply-assist/purchase",
      { method: "POST", body: JSON.stringify(body) },
    ),

  listApplyAssistQueue: () => request<{ items: ApplyAssistQueueItem[] }>("/api/job-hunter/apply-assist/queue"),

  createApplyAssistQueueItem: (body: {
    channel: "email_apply" | "linkedin_assist" | "indeed_assist";
    targetRole: string;
    region: string;
    jobUrl?: string;
    careersEmail?: string;
    company?: string;
    userDocumentId?: string;
  }) =>
    request<{ item: ApplyAssistQueueItem }>("/api/job-hunter/apply-assist/queue", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  prefillApplyAssistQueueItem: (id: string) =>
    request<{ item: ApplyAssistQueueItem }>(`/api/job-hunter/apply-assist/queue/${id}/prefill`, { method: "POST" }),

  confirmApplyAssistQueueItem: (
    id: string,
    body: {
      userSubmitted?: boolean;
      subjectOverride?: string;
      bodyTextOverride?: string;
      bodyHtmlOverride?: string;
    },
  ) =>
    request<{ queue: ApplyAssistQueueItem; application: JobApplicationRow; wallet: ApplyAssistWallet }>(
      `/api/job-hunter/apply-assist/queue/${id}/confirm`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  workspaceStages: () =>
    request<{ stages: Array<{ slug: string; label: string; sortOrder: number }> }>("/api/features/workspace/stages"),
  workspaceCrm: (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{
      records: Array<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        organization: string | null;
        stage: string;
        notes: string | null;
        lastActivity: string | null;
      }>;
    }>(`/api/features/workspace/crm${params}`);
  },
  createCrmRecord: (body: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    stage?: string;
    notes?: string;
  }) => request<{ record: unknown }>("/api/features/workspace/crm", { method: "POST", body: JSON.stringify(body) }),
  updateCrmRecord: (id: string, body: Partial<{ name: string; phone: string; stage: string; organization: string; notes: string }>) =>
    request<{ record: unknown }>(`/api/features/workspace/crm/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCrmRecord: (id: string) => request<void>(`/api/features/workspace/crm/${id}`, { method: "DELETE" }),
  workspaceReminders: (status?: "pending" | "done" | "all") => {
    const params = status ? `?status=${status}` : "";
    return request<{
      reminders: Array<{
        id: string;
        title: string;
        dueAt: string;
        status: string;
        channel: string;
        crmRecord: { id: string; name: string; email: string } | null;
      }>;
    }>(`/api/features/workspace/reminders${params}`);
  },
  createWorkspaceReminder: (body: { title: string; dueAt: string; crmRecordId?: string; channel?: string }) =>
    request<{ reminder: unknown }>("/api/features/workspace/reminders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateWorkspaceReminder: (id: string, body: Partial<{ title: string; dueAt: string; status: string; channel: string }>) =>
    request<{ reminder: unknown }>(`/api/features/workspace/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteWorkspaceReminder: (id: string) =>
    request<void>(`/api/features/workspace/reminders/${id}`, { method: "DELETE" }),
  workspaceCalendar: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString();
    return request<{
      events: Array<{
        id: string;
        title: string;
        startAt: string;
        endAt: string | null;
        allDay: boolean;
        location: string | null;
        notes: string | null;
        syncSource?: string;
      }>;
    }>(`/api/features/workspace/calendar${query ? `?${query}` : ""}`);
  },
  createCalendarEvent: (body: {
    title: string;
    startAt: string;
    endAt?: string;
    allDay?: boolean;
    location?: string;
    notes?: string;
  }) =>
    request<{ event: unknown }>("/api/features/workspace/calendar", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCalendarEvent: (
    id: string,
    body: Partial<{
      title: string;
      startAt: string;
      endAt: string | null;
      allDay: boolean;
      location: string;
      notes: string;
    }>,
  ) =>
    request<{ event: unknown }>(`/api/features/workspace/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCalendarEvent: (id: string) =>
    request<void>(`/api/features/workspace/calendar/${id}`, { method: "DELETE" }),
  workspaceCalendarSettings: () =>
    request<{
      settings: {
        googleConnected: boolean;
        microsoftConnected: boolean;
        lastSyncAt: string | null;
        capacityHoursPerWeek: number;
        reminderSequences: Array<{
          id: string;
          name: string;
          crmRecordId?: string | null;
          active: boolean;
          triggers: Array<{
            id: string;
            label: string;
            daysBefore: number;
            hoursBefore: number;
            channel: "email" | "in-app";
          }>;
        }>;
      };
    }>("/api/features/workspace/calendar/settings"),
  updateCalendarSettings: (body: { capacityHoursPerWeek?: number }) =>
    request<{ ok: boolean }>("/api/features/workspace/calendar/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  connectCalendarProvider: (provider: "google" | "microsoft") =>
    request<{ settings: unknown }>(`/api/features/workspace/calendar/providers/${provider}/connect`, {
      method: "POST",
    }),
  disconnectCalendarProvider: (provider: "google" | "microsoft") =>
    request<{ settings: unknown }>(`/api/features/workspace/calendar/providers/${provider}/disconnect`, {
      method: "POST",
    }),
  syncCalendarProviders: () =>
    request<{ settings: unknown }>("/api/features/workspace/calendar/sync", { method: "POST" }),
  updateCalendarReminderSequences: (
    sequences: Array<{
      id: string;
      name: string;
      crmRecordId?: string | null;
      active: boolean;
      triggers: Array<{
        id: string;
        label: string;
        daysBefore: number;
        hoursBefore: number;
        channel: "email" | "in-app";
      }>;
    }>,
  ) =>
    request<{ settings: unknown }>("/api/features/workspace/calendar/reminder-sequences", {
      method: "PUT",
      body: JSON.stringify({ sequences }),
    }),
  workspaceCalendarCapacity: (weekStart?: string) => {
    const params = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
    return request<{
      weekStart: string;
      members: Array<{
        userId: string;
        displayName: string;
        email: string;
        eventCount: number;
        hoursBooked: number;
        hoursAvailable: number;
        utilization: number;
        coverage: "ok" | "medium" | "high";
      }>;
    }>(`/api/features/workspace/calendar/capacity${params}`);
  },
  industryToolState: (toolSlug: string) =>
    request<{ state: Record<string, unknown> }>(`/api/features/workspace/industry/${toolSlug}`),
  industryToolAction: (toolSlug: string, action: string, payload?: Record<string, unknown>) =>
    request<{ state: Record<string, unknown> }>(`/api/features/workspace/industry/${toolSlug}/actions/${action}`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),
  pwaVapidPublicKey: () => request<{ publicKey: string }>("/api/pwa/vapid-public-key"),
  savePwaPushSubscription: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<{ ok: boolean }>("/api/pwa/push-subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
  removePwaPushSubscription: (endpoint: string) =>
    request<{ ok: boolean }>("/api/pwa/push-subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint }) }),
  triggerPwaMailSync: () => request<{ notified: number }>("/api/pwa/mail-sync/trigger", { method: "POST" }),
  provisionB2bRouting: (workspaceId: string) =>
    request<{ workspace: unknown }>(`/api/features/b2b/workspaces/${workspaceId}/provision-routing`, { method: "POST" }),
};
