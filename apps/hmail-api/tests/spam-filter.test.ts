import { describe, expect, it } from "vitest";
import { classifyBotSpamMessage } from "../src/services/spam-filter.service.js";

describe("bot spam filter", () => {
  it("flags automated noreply senders", () => {
    expect(
      classifyBotSpamMessage({
        from: "No Reply <noreply@alerts.example.com>",
        subject: "Your weekly summary",
        snippet: "",
      }),
    ).toBe(true);
  });

  it("flags bulk ESP domains", () => {
    expect(
      classifyBotSpamMessage({
        from: "Promotions <promo@mail.example.sendgrid.net>",
        subject: "Limited time offer inside",
        snippet: "",
      }),
    ).toBe(true);
  });

  it("flags generic marketing copy", () => {
    expect(
      classifyBotSpamMessage({
        from: "SEO Team <hello@traffic-boost.io>",
        subject: "Increase your website traffic with SEO",
        snippet: "Click here to unsubscribe from this marketing email",
      }),
    ).toBe(true);
  });

  it("does not flag a normal business sender", () => {
    expect(
      classifyBotSpamMessage({
        from: "Jane Client <jane.client@acmeconsulting.com>",
        subject: "Re: immigration consultation",
        snippet: "Thanks for your reply yesterday.",
      }),
    ).toBe(false);
  });

  it("does not delete messages sent by the mailbox owner", () => {
    expect(
      classifyBotSpamMessage(
        {
          from: "info@onoseimmigration.com",
          subject: "test",
          snippet: "",
        },
        "info@onoseimmigration.com",
      ),
    ).toBe(false);
  });
});
