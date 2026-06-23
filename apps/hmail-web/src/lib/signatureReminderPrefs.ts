export function canShowSignatureReminderToast(): boolean {
  try {
    return localStorage.getItem("pmail_signature_reminder_dont_ask") !== "1";
  } catch {
    return true;
  }
}

export function setSignatureReminderDontAskAgain(): void {
  try {
    localStorage.setItem("pmail_signature_reminder_dont_ask", "1");
  } catch {
    // ignore storage errors
  }
}
