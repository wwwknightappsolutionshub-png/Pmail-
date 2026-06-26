import { describe, expect, it } from "vitest";
import {
  inferProviderPresetFromEmail,
  resolveSuggestedMailConfigForLogin,
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

  it("suggests tenant hostinger settings for custom domains even when onboarding flag is false", () => {
    const suggested = resolveSuggestedMailConfigForLogin("user@company.com", {
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      mailOnboardingComplete: false,
    });
    expect(suggested.providerPreset).toBe("hostinger");
    expect(suggested.smtpHost).toBe("smtp.hostinger.com");
  });

  it("falls back to hostinger when no domain match and no tenant mail", () => {
    const suggested = resolveSuggestedMailConfigForLogin("user@company.com", null);
    expect(suggested.providerPreset).toBe("hostinger");
  });
});
