const DISMISS_KEY = "pmail-multi-inbox-prompt-dismissed-v1";

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
