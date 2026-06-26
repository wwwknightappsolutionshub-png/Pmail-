import { describe, expect, it } from "vitest";
import { isGoogleMailbox, normalizeMailboxPassword } from "../src/lib/mailbox-credentials.js";

describe("mailbox-credentials", () => {
  it("detects Gmail addresses", () => {
    expect(isGoogleMailbox("user@gmail.com")).toBe(true);
    expect(isGoogleMailbox("user@googlemail.com")).toBe(true);
    expect(isGoogleMailbox("user@outlook.com")).toBe(false);
  });

  it("strips spaces from Google app passwords", () => {
    expect(normalizeMailboxPassword("user@gmail.com", "abcd efgh ijkl mnop")).toBe("abcdefghijklmnop");
  });

  it("trims but keeps spaces for non-Gmail", () => {
    expect(normalizeMailboxPassword("user@outlook.com", "  secret  ")).toBe("secret");
  });
});
