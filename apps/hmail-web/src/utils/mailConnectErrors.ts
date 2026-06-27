export function formatMailConnectError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Failed to add mailbox";
  if (/command failed/i.test(message)) {
    return "Could not connect — verify your email, password, and mail provider settings.";
  }
  if (/authentication/i.test(message) || /invalid credentials/i.test(message)) {
    return "Authentication failed — check your email and app password.";
  }
  return message;
}
