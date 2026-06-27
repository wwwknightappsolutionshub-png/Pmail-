import { describe, expect, it } from "vitest";
import {
  dedupeReferralRecipients,
  isPersonalReferralEmail,
  referralRecipientDedupeKey,
} from "../src/services/referral-recipient-filter.js";

describe("referral recipient filter", () => {
  it("rejects generic and automated mailbox addresses", () => {
    expect(isPersonalReferralEmail("noreply@example.com")).toBe(false);
    expect(isPersonalReferralEmail("support@acme.test")).toBe(false);
    expect(isPersonalReferralEmail("notifications@facebookmail.com")).toBe(false);
    expect(isPersonalReferralEmail("5551234567@txt.att.net")).toBe(false);
    expect(isPersonalReferralEmail("friend@example.com")).toBe(true);
    expect(isPersonalReferralEmail("jane.doe@gmail.com")).toBe(true);
  });

  it("dedupes gmail aliases and plus tags to one recipient", () => {
    expect(referralRecipientDedupeKey("Jane.Doe@gmail.com")).toBe("janedoe@gmail.com");
    expect(referralRecipientDedupeKey("jane.doe+news@gmail.com")).toBe("janedoe@gmail.com");

    const recipients = dedupeReferralRecipients([
      "jane.doe@gmail.com",
      "Jane.Doe+tag@gmail.com",
      "janedoe@googlemail.com",
    ]);

    expect(recipients).toEqual(["jane.doe@gmail.com"]);
  });

  it("filters generic addresses before dedupe", () => {
    const recipients = dedupeReferralRecipients([
      "friend@example.com",
      "noreply@example.com",
      "info@example.com",
      "friend@example.com",
    ]);

    expect(recipients).toEqual(["friend@example.com"]);
  });
});
