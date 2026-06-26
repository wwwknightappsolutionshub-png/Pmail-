import type { DemoAutoReply, DemoSignature } from "../data/bespokeMailComposeSettings";
import type { DemoCrmContact, DemoMessage, DemoReminder } from "../data/bespokeMailDemoData";
import type { ComposeMailDraft, DemoOutboundMail, DemoTrashItem } from "../data/demoMailClient";

const SESSION_KEY = "bespoke-demo-session-id";
const STORAGE_PREFIX = "bespoke-demo-workspace:";

export type BespokeDemoPersistedState = {
  version: 1;
  messages: DemoMessage[];
  crmContacts: DemoCrmContact[];
  reminders: DemoReminder[];
  calendarEvents?: DemoCalendarEvent[];
  calendarEnterprise?: DemoCalendarEnterpriseState;
  messagingThreads?: DemoMessagingThread[];
  drafts: DemoOutboundMail[];
  outbox: DemoOutboundMail[];
  scheduled: DemoOutboundMail[];
  trash: DemoTrashItem[];
  senderName: string;
  autoReplyOn: boolean;
  activeAutoReplyId: string;
  activeSignatureId: string;
  autoReplies: DemoAutoReply[];
  signatures: DemoSignature[];
  autoReplyComplimentaryStartedAt?: string;
};

export type DemoCalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  contactId: string;
  status: "scheduled" | "done";
  syncSource?: "google" | "microsoft" | "local";
};

export type DemoReminderSequenceTrigger = {
  id: string;
  label: string;
  daysBefore: number;
  hoursBefore: number;
  channel: DemoReminder["channel"];
};

export type DemoReminderSequence = {
  id: string;
  name: string;
  contactId: string;
  active: boolean;
  triggers: DemoReminderSequenceTrigger[];
};

export type DemoCalendarEnterpriseState = {
  googleConnected: boolean;
  microsoftConnected: boolean;
  lastSyncAt: string | null;
  reminderSequences: DemoReminderSequence[];
};

export type DemoMessagingMessage = {
  id: string;
  author: string;
  channel: "internal" | "whatsapp";
  body: string;
  createdAt: string;
  documentName?: string;
};

export type DemoMessagingThread = {
  id: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  participantType: "organization" | "contact";
  lastActiveAt: string;
  messages: DemoMessagingMessage[];
};

export function getDemoSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `demo-${Date.now().toString(36)}`;
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "offline-session";
  }
}

function storageKey(useCaseId: string): string {
  return `${STORAGE_PREFIX}${useCaseId}`;
}

export function loadDemoWorkspaceLocal(useCaseId: string): BespokeDemoPersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(useCaseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BespokeDemoPersistedState;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDemoWorkspaceLocal(useCaseId: string, state: BespokeDemoPersistedState): void {
  try {
    localStorage.setItem(storageKey(useCaseId), JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode — demo still works in-memory.
  }
}

const API_BASE = import.meta.env.PROD ? (import.meta.env.VITE_API_BASE_URL ?? "") : "";

const REMOTE_FETCH_TIMEOUT_MS = 4_000;

export async function loadDemoWorkspaceRemote(
  useCaseId: string,
  sessionId: string,
): Promise<BespokeDemoPersistedState | null> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
    const res = await fetch(`${API_BASE}/api/public/bespoke-demo/${useCaseId}/workspace`, {
      headers: { "X-Demo-Session": sessionId },
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { state: BespokeDemoPersistedState | null };
    return data.state ?? null;
  } catch {
    return null;
  }
}

export async function saveDemoWorkspaceRemote(
  useCaseId: string,
  sessionId: string,
  state: BespokeDemoPersistedState,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/public/bespoke-demo/${useCaseId}/workspace`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Demo-Session": sessionId,
      },
      body: JSON.stringify({ state }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function hydrateDemoWorkspace(
  useCaseId: string,
  buildSeed: () => BespokeDemoPersistedState,
): Promise<BespokeDemoPersistedState> {
  const sessionId = getDemoSessionId();
  const remote = await loadDemoWorkspaceRemote(useCaseId, sessionId);
  if (remote) {
    saveDemoWorkspaceLocal(useCaseId, remote);
    return remote;
  }
  const local = loadDemoWorkspaceLocal(useCaseId);
  if (local) return local;
  return buildSeed();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function queueDemoWorkspaceSave(useCaseId: string, state: BespokeDemoPersistedState): void {
  saveDemoWorkspaceLocal(useCaseId, state);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveDemoWorkspaceRemote(useCaseId, getDemoSessionId(), state);
  }, 800);
}

export const AUTO_REPLY_COMPLIMENTARY_DAYS = 14;

export function resolveDemoAutoReplyEntitlement(startedAt?: string | null): { entitled: boolean; daysLeft: number } {
  const start = startedAt ? new Date(startedAt) : new Date();
  const endsAt = new Date(start);
  endsAt.setDate(endsAt.getDate() + AUTO_REPLY_COMPLIMENTARY_DAYS);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return { entitled: endsAt.getTime() > Date.now(), daysLeft };
}

export function buildPersistedState(input: {
  messages: DemoMessage[];
  crmContacts: DemoCrmContact[];
  reminders: DemoReminder[];
  calendarEvents?: DemoCalendarEvent[];
  calendarEnterprise?: DemoCalendarEnterpriseState;
  messagingThreads?: DemoMessagingThread[];
  drafts: DemoOutboundMail[];
  outbox: DemoOutboundMail[];
  scheduled: DemoOutboundMail[];
  trash: DemoTrashItem[];
  senderName: string;
  autoReplyOn: boolean;
  activeAutoReplyId: string;
  activeSignatureId: string;
  autoReplies: DemoAutoReply[];
  signatures: DemoSignature[];
  autoReplyComplimentaryStartedAt?: string;
}): BespokeDemoPersistedState {
  return {
    version: 1,
    ...input,
  };
}

/** Non-fatal compose draft — excluded from remote sync (transient UI). */
export function emptyComposeDraftSafe(defaultContactId: string): ComposeMailDraft {
  return {
    toName: "",
    toEmail: "",
    ccEmail: "",
    bccEmail: "",
    subject: "",
    body: "",
    attachment: "",
    scheduleDate: "",
    scheduleTime: "09:00",
    contactId: defaultContactId,
  };
}
