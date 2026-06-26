export function isGoogleMailbox(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain === "gmail.com" || domain === "googlemail.com";
}

/** Google App Passwords are often copied with spaces — Gmail accepts them without. */
export function normalizeMailboxPassword(email: string, password: string): string {
  const trimmed = password.trim();
  if (isGoogleMailbox(email)) {
    return trimmed.replace(/\s+/g, "");
  }
  return trimmed;
}
