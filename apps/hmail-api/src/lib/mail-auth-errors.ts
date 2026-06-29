import { isGoogleMailbox } from "./mailbox-credentials.js";

export type MailAuthFailurePhase = "imap" | "smtp";

function errorText(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

function isTlsError(message: string): boolean {
  return /certificate|self[- ]signed|unable to verify|UNABLE_TO_VERIFY|CERT_|TLS|SSL/i.test(message);
}

function isNetworkError(message: string): boolean {
  return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ECONNRESET|ETIMEOUT|timeout|getaddrinfo/i.test(message);
}

function isAuthRejected(message: string): boolean {
  return /auth|invalid credentials|authentication failed|login failed|535|534|NO\b|\[AUTHENTICATIONFAILED\]/i.test(
    message,
  );
}

export function classifyMailAuthError(err: unknown): "tls" | "network" | "auth" | "unknown" {
  const message = errorText(err);
  if (isTlsError(message)) return "tls";
  if (isNetworkError(message)) return "network";
  if (isAuthRejected(message)) return "auth";
  return "unknown";
}

export function mailboxAuthErrorMessage(
  email: string,
  phase: MailAuthFailurePhase,
  err?: unknown,
): string {
  if (isGoogleMailbox(email)) {
    return phase === "smtp"
      ? "Gmail accepted IMAP but SMTP failed. Use a Google App Password and keep Google selected with smtp.gmail.com:587."
      : "Gmail could not sign in. In Gmail go to Settings → Forwarding and POP/IMAP → enable IMAP. If 2-Step Verification is on, create an App Password at myaccount.google.com/apppasswords and use that here (not your regular Gmail password).";
  }

  const kind = err ? classifyMailAuthError(err) : "unknown";
  const domain = email.trim().toLowerCase().split("@")[1];

  if (kind === "network") {
    return `Could not reach your mail server (${phase.toUpperCase()}). The live server may be blocked from connecting to your provider. Try again, or sign in locally and set a custom mail server such as mail.${domain ?? "yourdomain.com"} under Mail provider.`;
  }

  if (kind === "tls") {
    return `Secure connection to your mail server failed (${phase.toUpperCase()}). If this mailbox uses a custom domain on Hostinger, choose Custom and set IMAP/SMTP to mail.${domain ?? "yourdomain.com"} (ports 993 / 465).`;
  }

  if (phase === "smtp") {
    return "Your password worked for incoming mail (IMAP) but outgoing mail (SMTP) failed. Confirm SMTP host and port with your provider — Hostinger custom domains often use mail.yourdomain.com on port 465.";
  }

  return "Invalid email or password";
}
