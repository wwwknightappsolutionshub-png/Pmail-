import { describe, expect, it } from "vitest";
import { buildImapCriteriaFromParsed, parseMailSearchQuery } from "../src/lib/mail-search-parser.js";

describe("mail search parser", () => {
  it("parses from: and is:unread operators", () => {
    const parsed = parseMailSearchQuery("from:ircc@cic.gc.ca is:unread");
    expect(parsed.filter).toBe("unread");
    expect(parsed.terms).toEqual([{ field: "sender", value: "ircc@cic.gc.ca" }]);
  });

  it("parses has:attachment", () => {
    const parsed = parseMailSearchQuery("subject:biometrics has:attachment");
    expect(parsed.hasAttachment).toBe(true);
    expect(parsed.terms[0]).toEqual({ field: "subject", value: "biometrics" });
  });

  it("builds IMAP criteria with attachment flag", () => {
    const parsed = parseMailSearchQuery("from:client@example.com has:attachment");
    const criteria = buildImapCriteriaFromParsed(parsed);
    expect(criteria).toMatchObject({ from: "client@example.com", hasAttachment: true });
  });
});
