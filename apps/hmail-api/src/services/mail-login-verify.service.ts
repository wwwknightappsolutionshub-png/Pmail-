import type { TenantMailConfig } from "@prisma/client";
import {
  inferProviderPresetFromEmail,
  MAIL_PROVIDER_PRESETS,
  matchProviderPresetFromHosts,
} from "../data/mail-providers.js";
import type { MailCredentials } from "./imap.service.js";
import { verifyImapLogin } from "./imap.service.js";
import { verifySmtpLogin } from "./smtp.service.js";
import { logMailAuthVerifyFailure } from "../lib/mail-auth-log.js";

export class MailAuthVerificationError extends Error {
  phase: "imap" | "smtp";

  constructor(phase: "imap" | "smtp", cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(detail);
    this.name = "MailAuthVerificationError";
    this.phase = phase;
    this.cause = cause;
  }
}

function hostingerPresetHosts() {
  return MAIL_PROVIDER_PRESETS.hostinger;
}

export function isHostingerMailConfig(
  config: Pick<TenantMailConfig, "imapHost" | "imapPort" | "imapSecure" | "smtpHost" | "smtpPort" | "smtpSecure">,
): boolean {
  return matchProviderPresetFromHosts(config) === "hostinger";
}

export function buildCustomDomainMailboxHosts(email: string): Pick<
  TenantMailConfig,
  "imapHost" | "imapPort" | "imapSecure" | "smtpHost" | "smtpPort" | "smtpSecure"
> | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || inferProviderPresetFromEmail(email)) return null;

  return {
    imapHost: `mail.${domain}`,
    imapPort: 993,
    imapSecure: true,
    smtpHost: `mail.${domain}`,
    smtpPort: 465,
    smtpSecure: true,
  };
}

export function listLoginMailConfigCandidates(email: string, primary: TenantMailConfig): TenantMailConfig[] {
  const candidates: TenantMailConfig[] = [primary];

  const customDomainHosts = buildCustomDomainMailboxHosts(email);
  if (!customDomainHosts) return candidates;

  const pushCandidate = (hosts: typeof customDomainHosts) => {
    const next: TenantMailConfig = {
      ...primary,
      ...hosts,
    };
    if (!candidates.some((entry) => entry.imapHost === next.imapHost && entry.smtpHost === next.smtpHost)) {
      candidates.push(next);
    }
  };

  if (isHostingerMailConfig(primary)) {
    pushCandidate(customDomainHosts);
  }

  const hostinger = hostingerPresetHosts();
  if (primary.imapHost === customDomainHosts.imapHost && primary.smtpHost === customDomainHosts.smtpHost) {
    pushCandidate({
      imapHost: hostinger.imapHost,
      imapPort: hostinger.imapPort,
      imapSecure: hostinger.imapSecure,
      smtpHost: hostinger.smtpHost,
      smtpPort: hostinger.smtpPort,
      smtpSecure: hostinger.smtpSecure,
    });
  }

  return candidates;
}

export async function verifyMailboxForLogin(
  credentials: MailCredentials,
): Promise<TenantMailConfig> {
  const candidates = listLoginMailConfigCandidates(credentials.email, credentials.mailConfig);
  let lastImapError: unknown;
  let lastSmtpError: unknown;

  for (const mailConfig of candidates) {
    const attempt: MailCredentials = { ...credentials, mailConfig };
    try {
      await verifyImapLogin(attempt);
    } catch (err) {
      lastImapError = err;
      logMailAuthVerifyFailure({
        phase: "imap",
        email: credentials.email,
        host: mailConfig.imapHost,
        port: mailConfig.imapPort,
        err,
      });
      continue;
    }

    try {
      await verifySmtpLogin(attempt.email, attempt.password, mailConfig);
      return mailConfig;
    } catch (err) {
      lastSmtpError = err;
      logMailAuthVerifyFailure({
        phase: "smtp",
        email: credentials.email,
        host: mailConfig.smtpHost,
        port: mailConfig.smtpPort,
        err,
      });
    }
  }

  if (lastSmtpError) {
    throw new MailAuthVerificationError("smtp", lastSmtpError);
  }
  throw new MailAuthVerificationError("imap", lastImapError ?? new Error("Mail authentication failed"));
}
