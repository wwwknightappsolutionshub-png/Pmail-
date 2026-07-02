import { describe, expect, it } from "vitest";
import {
  PMail_DEFAULT_SIGNATURE_TAGLINE,
  buildDefaultBrandedSignatureHtml,
  userHasCustomSignature,
} from "../src/services/default-signature.service.js";

describe("default branded signature", () => {
  it("builds HTML with logo and tagline", () => {
    const html = buildDefaultBrandedSignatureHtml({
      logoUrl: "https://mail.prohost.cloud/pwa-192.png",
      exploreUrl: "https://mail.prohost.cloud/welcome/prohost/",
    });
    expect(html).toContain("data-pmail-signature=\"branded\"");
    expect(html).toContain(PMail_DEFAULT_SIGNATURE_TAGLINE);
    expect(html).toContain("https://mail.prohost.cloud/pwa-192.png");
    expect(html).toContain("Explore Now");
    expect(html).toContain("https://mail.prohost.cloud/welcome/prohost/");
    expect(html).not.toContain("/api/public/track/link/");
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
