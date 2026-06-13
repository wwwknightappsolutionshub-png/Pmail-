import type { AuthUser, MailFolder, MailListResult, MailMessageDetail, MailSortField, MailSortOrder, TenantBranding } from "../types/mail";
import type { MailContact, MailContactCollection } from "../types/contact";

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
  getTenant: (slug: string) =>
    request<{ slug: string; name: string; branding: TenantBranding | null }>(`/api/auth/tenant/${slug}`),
  login: (body: { tenantSlug: string; email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: AuthUser }>("/api/auth/me"),
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
    if (options?.page) params.set("page", String(options.page));
    if (options?.pageSize) params.set("pageSize", String(options.pageSize));
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
  send: (body: {
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
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  }) =>
    request<{ messageId: string; sentFolder?: string }>("/api/mail/send", {
      method: "POST",
      body: JSON.stringify(body),
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
  addonEntitlements: () => request<{ slugs: string[] }>("/api/addons/entitlements"),
  startAddonTrial: (slug: string) =>
    request<{ addon: import("../types/addon").AddonItem }>(`/api/addons/${slug}/trial`, {
      method: "POST",
    }),
  featureTemplates: () =>
    request<{ templates: Array<{ id: string; name: string; subject: string; bodyHtml: string; description: string }> }>(
      "/api/features/templates",
    ),
  featureScheduled: () =>
    request<{ messages: Array<{ id: string; to: string; subject: string; scheduledFor: string; status: string }> }>(
      "/api/features/scheduled",
    ),
  createScheduled: (body: { to: string; subject: string; html?: string; scheduledFor: string }) =>
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
};
