import { extractEmailAddress } from "./list-unsubscribe.js";

export type MailSlaThreadStatus = "open" | "at_risk" | "breached" | "responded" | "dismissed";

export type MailSlaAlertType = "at_risk" | "breached";

const SUBJECT_PREFIX_RE = /^(re|fwd|fw):\s*/gi;

export function normalizeSlaSubject(subject: string): string {
  let value = subject.trim();
  while (SUBJECT_PREFIX_RE.test(value)) {
    SUBJECT_PREFIX_RE.lastIndex = 0;
    value = value.replace(SUBJECT_PREFIX_RE, "").trim();
  }
  return value || "(No subject)";
}

export function buildSlaThreadKey(subject: string, fromEmail: string): string {
  const normalized = normalizeSlaSubject(subject).toLowerCase();
  const email = extractEmailAddress(fromEmail).toLowerCase();
  return `${normalized}|${email}`;
}

export function computeSlaDeadline(firstInboundAt: Date, responseHours: number): Date {
  return new Date(firstInboundAt.getTime() + responseHours * 60 * 60 * 1000);
}

export function computeSlaAtRiskAt(firstInboundAt: Date, responseHours: number, atRiskRatio: number): Date {
  const ratio = Math.min(Math.max(atRiskRatio, 0.1), 0.99);
  return new Date(firstInboundAt.getTime() + responseHours * ratio * 60 * 60 * 1000);
}

export function computeSlaThreadStatus(input: {
  status: string;
  respondedAt: Date | null;
  dismissedAt: Date | null;
  firstInboundAt: Date;
  deadlineAt: Date;
  atRiskAt: Date;
  now?: Date;
}): MailSlaThreadStatus {
  if (input.dismissedAt || input.status === "dismissed") return "dismissed";
  if (input.respondedAt || input.status === "responded") return "responded";

  const now = input.now ?? new Date();
  if (now >= input.deadlineAt) return "breached";
  if (now >= input.atRiskAt) return "at_risk";
  return "open";
}

export function remainingMs(deadlineAt: Date, now: Date = new Date()): number {
  return Math.max(0, deadlineAt.getTime() - now.getTime());
}

export function formatSlaDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 48) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days}d ${remHours}h` : `${days}d`;
}

export function buildSlaReferencesHeader(input: {
  messageId: string | null;
  referencesHeader: string | null;
}): string | undefined {
  const parts = (input.referencesHeader ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (input.messageId && !parts.includes(input.messageId)) {
    parts.push(input.messageId);
  }
  return parts.length ? parts.join(" ") : input.messageId ?? undefined;
}
