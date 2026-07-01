export function formatUserFacingError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : fallback;

  if (/can't reach database|database server|invalid `prisma\.|ECONNREFUSED|connection refused/i.test(message)) {
    return "PMail+ cannot reach the server database right now. Please try again in a minute. If this continues, contact your administrator.";
  }

  if (/cannot reach the mail service|mail service error/i.test(message)) {
    return "Cannot reach PMail+ right now. Check your connection and try again in a moment.";
  }

  if (/authentication failed|invalid credentials|invalid email or password/i.test(message)) {
    return "Authentication failed — check your email and app password.";
  }

  if (/command failed/i.test(message)) {
    return "Could not connect to your mail server — verify your email, app password, and provider settings.";
  }

  return message || fallback;
}
