const DISMISS_KEY = "pmail-multi-inbox-prompt-dismissed-v1";
const SESSION_SHOW_KEY = "pmail-multi-inbox-prompt-session-shows-v1";
const MAX_SESSION_SHOWS = 2;

export function isMultiInboxPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMultiInboxPromptDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

function getSessionShowCount(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_SHOW_KEY);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

/** Permanent dismiss, or already shown twice this browser session. */
export function canShowMultiInboxPrompt(): boolean {
  if (isMultiInboxPromptDismissed()) return false;
  return getSessionShowCount() < MAX_SESSION_SHOWS;
}

export function recordMultiInboxPromptShown(): void {
  try {
    const next = Math.min(MAX_SESSION_SHOWS, getSessionShowCount() + 1);
    sessionStorage.setItem(SESSION_SHOW_KEY, String(next));
  } catch {
    /* ignore */
  }
}
