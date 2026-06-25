import { describe, expect, it } from "vitest";
import {
  PMail_DEFAULT_SIGNATURE_TAGLINE,
  buildDefaultBrandedSignatureHtml,
  userHasCustomSignature,
} from "../src/services/default-signature.service.js";

describe("default branded signature", () => {
  it("builds HTML with logo and tagline", () => {
    const html = buildDefaultBrandedSignatureHtml({
      logoUrl: "https://mail.prohost.cloud/favicon.svg",
      joinUrl: "https://mail.prohost.cloud/welcome",
    });
    expect(html).toContain("data-pmail-signature=\"branded\"");
    expect(html).toContain(PMail_DEFAULT_SIGNATURE_TAGLINE);
    expect(html).toContain("https://mail.prohost.cloud/favicon.svg");
    expect(html).toContain("Join Free");
  });

  it("detects when user has a custom signature", () => {
    expect(
      userHasCustomSignature({
        activeSignatureId: "sig-1",
        signatures: [{ id: "sig-1", body: "Jane Doe | CEO" }],
      }),
    ).toBe(true);
    expect(
      userHasCustomSignature({
        activeSignatureId: "sig-1",
        signatures: [{ id: "sig-1", body: "   " }],
      }),
    ).toBe(false);
  });
});
