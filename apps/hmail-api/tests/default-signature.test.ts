import { describe, expect, it } from "vitest";
import {
  PMail_DEFAULT_SIGNATURE_TAGLINE,
  PMail_SIGNATURE_EXPLORE_ATTR,
  buildDefaultBrandedSignatureHtml,
  embedBrandedSignatureLogoInline,
  embedCustomSignatureAvatarInline,
  ensureCustomSignatureAvatarHtml,
  normalizeOutboundBrandedSignature,
  pickPublicWebOrigin,
  userHasCustomSignature,
} from "../src/services/default-signature.service.js";

describe("default branded signature", () => {
  it("builds HTML with logo and tagline", () => {
    const html = buildDefaultBrandedSignatureHtml({
      logoUrl: "https://mail.prohost.cloud/pmail-signature-logo.png",
      exploreUrl: "https://mail.prohost.cloud/welcome/prohost/",
    });
    expect(html).toContain('data-pmail-signature="branded"');
    expect(html).toContain('contenteditable="false"');
    expect(html).toContain(PMail_SIGNATURE_EXPLORE_ATTR);
    expect(html).toContain(PMail_DEFAULT_SIGNATURE_TAGLINE);
    expect(html).toContain("https://mail.prohost.cloud/pmail-signature-logo.png");
    expect(html).toContain("Explore Now");
    expect(html).toContain("https://mail.prohost.cloud/welcome/prohost/");
    expect(html).not.toContain("/api/public/track/link/");
  });

  it("prefers public web origin over localhost", () => {
    expect(
      pickPublicWebOrigin(["http://localhost:5173", "https://mail.prohost.cloud"]),
    ).toBe("https://mail.prohost.cloud");
    expect(
      pickPublicWebOrigin(["http://localhost:5174", "http://127.0.0.1:5173"]),
    ).toBe("http://localhost:5174");
  });

  it("rewrites localhost explore links before send", () => {
    const broken = `<p>Hi</p><div data-pmail-signature="branded"><a href="http://localhost:5173/welcome/prohost/" ${PMail_SIGNATURE_EXPLORE_ATTR}>Explore Now</a></div>`;
    const fixed = normalizeOutboundBrandedSignature(broken);
    expect(fixed).not.toContain("localhost:5173");
    expect(fixed).toContain("/welcome/prohost");
  });

  it("embeds inline CID logo for branded signatures", async () => {
    const html = buildDefaultBrandedSignatureHtml({
      logoUrl: "https://mail.prohost.cloud/pmail-signature-logo.png",
      exploreUrl: "https://mail.prohost.cloud/welcome/prohost/",
    });
    const embedded = await embedBrandedSignatureLogoInline(html);
    expect(embedded.inlineAttachment).not.toBeNull();
    expect(embedded.html).toContain('src="cid:pmail-signature-logo@pmail"');
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

  it("embeds custom signature avatar into HTML", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const html = ensureCustomSignatureAvatarHtml("Jane Doe | CEO", dataUrl);
    expect(html).toContain('data-pmail-signature="custom"');
    expect(html).toContain('data-pmail-signature-avatar="1"');
    expect(html).toContain(dataUrl);
    expect(html).toContain("Jane Doe | CEO");
    expect(ensureCustomSignatureAvatarHtml(html, dataUrl)).toBe(html);
  });

  it("embeds inline CID for custom signature avatar data URLs", async () => {
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const html = ensureCustomSignatureAvatarHtml("Jane Doe | CEO", dataUrl);
    const embedded = await embedCustomSignatureAvatarInline(html);
    expect(embedded.inlineAttachment).not.toBeNull();
    expect(embedded.inlineAttachment?.cid).toBe("pmail-signature-avatar@pmail");
    expect(embedded.html).toContain('src="cid:pmail-signature-avatar@pmail"');
    expect(embedded.html).not.toContain("data:image/png;base64");
  });
});
