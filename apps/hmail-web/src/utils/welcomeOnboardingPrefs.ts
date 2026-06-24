const WELCOME_ONBOARDING_SEEN_KEY = "pmail_welcome_onboarding_seen";

export function hasSeenWelcomeOnboarding(): boolean {
  try {
    return localStorage.getItem(WELCOME_ONBOARDING_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeOnboardingSeen(): void {
  try {
    localStorage.setItem(WELCOME_ONBOARDING_SEEN_KEY, "1");
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}
