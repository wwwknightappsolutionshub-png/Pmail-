import { describe, expect, it, vi } from "vitest";
import { logLoginRejected, logMailAuthVerifyFailure } from "../src/lib/mail-auth-log.js";

describe("mail auth logging", () => {
  it("logs one line for IMAP failures with email and host", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logMailAuthVerifyFailure({
      phase: "imap",
      email: "info@onoseimmigration.com",
      host: "imap.hostinger.com",
      port: 993,
      err: {
        authenticationFailed: true,
        serverResponseCode: "AUTHENTICATIONFAILED",
        response: "3 NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)",
      },
    });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toBe(
      "[auth] IMAP verify failed email=info@onoseimmigration.com host=imap.hostinger.com:993 reason=AUTHENTICATIONFAILED response=3 NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)",
    );
    warn.mockRestore();
  });

  it("logs one line when login is rejected", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logLoginRejected({
      email: "info@onoseimmigration.com",
      phase: "imap",
      message: "Invalid email or password",
    });

    expect(warn.mock.calls[0]?.[0]).toBe(
      "[auth] login rejected email=info@onoseimmigration.com phase=imap message=Invalid email or password",
    );
    warn.mockRestore();
  });
});
