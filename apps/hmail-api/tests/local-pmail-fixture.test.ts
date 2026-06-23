import { describe, expect, it } from "vitest";
import {
  localFixtureGetMessage,
  localFixtureListMessages,
  localFixtureSetMessageFlags,
} from "../src/services/local-pmail-fixture.service.js";
import type { MailCredentials } from "../src/services/mail-account.service.js";

const fixtureCredentials: MailCredentials = {
  email: "pmailtester@gmail.com",
  password: "demo",
  mailAccountId: null,
  mailConfig: {
    id: "fixture",
    tenantId: "fixture",
    providerPreset: "custom",
    imapHost: "local.pmail.test",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "local.pmail.test",
    smtpPort: 465,
    smtpSecure: true,
    mailOnboardingComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("local pmail fixture mail mutations", () => {
  it("marks unread fixture messages as read without IMAP", () => {
    const unread = localFixtureGetMessage(fixtureCredentials, "INBOX", 1);
    expect(unread?.seen).toBe(false);

    localFixtureSetMessageFlags(fixtureCredentials, "INBOX", 1, { seen: true });

    const read = localFixtureGetMessage(fixtureCredentials, "INBOX", 1);
    expect(read?.seen).toBe(true);

    const list = localFixtureListMessages(fixtureCredentials, "INBOX");
    expect(list.messages.find((message) => message.uid === 1)?.seen).toBe(true);
  });
});
