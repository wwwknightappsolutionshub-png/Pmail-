export function formatUserFacingError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;

  if (/can't reach database|database server|invalid `prisma\.|ECONNREFUSED|connection refused/i.test(message)) {
    return "PMail+ cannot reach the server right now. Please try again in a minute.";
  }

  if (
    /cannot reach the mail service|mail service error|failed to fetch|networkerror|load failed|seems you are offline|npm run dev -w hmail-api/i.test(
      message,
    )
  ) {
    return "Seems you are offline. Check your connection and try again.";
  }

  if (/authentication failed|invalid credentials|invalid email or password/i.test(message)) {
    return "Wrong email or password. Double-check and try again.";
  }

  if (/gmail could not sign in|google app password|app password|wrong gmail password|gmail sign-in failed/i.test(message)) {
    return "Gmail sign-in failed. Use a Google App Password (not your normal Gmail password) and make sure IMAP is enabled.";
  }

  if (/command failed/i.test(message)) {
    return "Could not connect to your mail server — verify your email, password, and provider settings.";
  }

  return message || fallback;
}
