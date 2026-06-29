import { describe, expect, it } from "vitest";
import {
  inferProviderPresetFromEmail,
  mailConfigsMatch,
  resolveSuggestedMailConfigForLogin,
  savedMailConfigMismatchesLoginSuggestion,
} from "../src/data/mail-providers.js";

describe("mail provider suggestions", () => {
  it("infers Google for gmail.com addresses", () => {
    expect(inferProviderPresetFromEmail("user@gmail.com")).toBe("google");
  });

  it("prefers consumer provider from email domain over tenant defaults", () => {
    const suggested = resolveSuggestedMailConfigForLogin("user@gmail.com", {
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      mailOnboardingComplete: false,
    });
    expect(suggested.providerPreset).toBe("google");
    expect(suggested.imapHost).toBe("imap.gmail.com");
  });

  it("suggests custom-domain Hostinger mailbox hosts for business domains", () => {
    const suggested = resolveSuggestedMailConfigForLogin("user@company.com", {
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      mailOnboardingComplete: false,
    });
    expect(suggested.providerPreset).toBe("custom");
    expect(suggested.imapHost).toBe("mail.company.com");
    expect(suggested.smtpHost).toBe("mail.company.com");
  });

  it("falls back to hostinger when no domain match and no tenant mail", () => {
    const suggested = resolveSuggestedMailConfigForLogin("user@company.com", null);
    expect(suggested.providerPreset).toBe("hostinger");
  });

  it("detects when a saved Microsoft config does not match a custom-domain mailbox", () => {
    const suggested = resolveSuggestedMailConfigForLogin("info@onoseimmigration.com", {
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      mailOnboardingComplete: true,
    });
    const saved = {
      imapHost: "outlook.office365.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.office365.com",
      smtpPort: 587,
      smtpSecure: false,
    };

    expect(savedMailConfigMismatchesLoginSuggestion("info@onoseimmigration.com", saved, suggested)).toBe(true);
    expect(mailConfigsMatch(saved, suggested)).toBe(false);
  });
});
