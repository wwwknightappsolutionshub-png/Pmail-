import { describe, expect, it } from "vitest";
import { classifyMailAuthError, mailboxAuthErrorMessage } from "../src/lib/mail-auth-errors.js";
import {
  buildCustomDomainMailboxHosts,
  listLoginMailConfigCandidates,
} from "../src/services/mail-login-verify.service.js";

describe("mail auth errors", () => {
  it("classifies TLS failures", () => {
    expect(classifyMailAuthError(new Error("self signed certificate in certificate chain"))).toBe("tls");
  });

  it("classifies network failures", () => {
    expect(classifyMailAuthError(new Error("connect ETIMEDOUT 1.2.3.4:993"))).toBe("network");
  });

  it("mentions custom-domain mail host for TLS failures", () => {
    const message = mailboxAuthErrorMessage(
      "info@onoseimmigration.com",
      "imap",
      new Error("unable to verify the first certificate"),
    );
    expect(message).toContain("mail.onoseimmigration.com");
  });

  it("explains when a saved Microsoft host is used for a non-Microsoft mailbox", () => {
    const message = mailboxAuthErrorMessage(
      "info@onoseimmigration.com",
      "imap",
      new Error("AUTHENTICATIONFAILED"),
      "outlook.office365.com",
    );
    expect(message).toContain("Microsoft 365");
    expect(message).toContain("outlook.office365.com");
  });
});

describe("login mail config candidates", () => {
  it("adds mail.domain host fallback for Hostinger tenant defaults", () => {
    const primary = {
      id: "tenant-mail",
      tenantId: "tenant-1",
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      mailOnboardingComplete: true,
    };

    const candidates = listLoginMailConfigCandidates("info@onoseimmigration.com", primary);
    expect(candidates).toHaveLength(2);
    expect(candidates[1]?.imapHost).toBe("mail.onoseimmigration.com");
    expect(candidates[1]?.smtpHost).toBe("mail.onoseimmigration.com");
  });

  it("builds custom-domain mailbox hosts for business emails", () => {
    expect(buildCustomDomainMailboxHosts("info@onoseimmigration.com")).toEqual({
      imapHost: "mail.onoseimmigration.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "mail.onoseimmigration.com",
      smtpPort: 465,
      smtpSecure: true,
    });
  });
});
