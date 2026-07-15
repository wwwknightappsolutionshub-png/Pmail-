/** Mail app session lifetime: sliding window from last activity. */
export const MAIL_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function mailSessionExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + MAIL_SESSION_TTL_MS);
}
