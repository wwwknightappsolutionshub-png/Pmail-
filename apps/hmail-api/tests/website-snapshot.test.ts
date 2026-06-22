import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchWebsiteSnapshot, isWebsiteUrlFetchable } from "../src/growth/website-snapshot.js";

describe("website-snapshot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks localhost and .local URLs from fetch", () => {
    expect(isWebsiteUrlFetchable("http://localhost:5174")).toBe(false);
    expect(isWebsiteUrlFetchable("https://hostnet.local")).toBe(false);
    expect(isWebsiteUrlFetchable("https://example.com")).toBe(true);
  });

  it("parses title, meta, and blog links from HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        headers: { get: () => "text/html; charset=utf-8" },
        arrayBuffer: async () =>
          new TextEncoder().encode(`
            <html><head>
              <title>Acme Plumbing</title>
              <meta name="description" content="Emergency plumbing in Toronto" />
            </head><body>
              <h1>Your trusted plumber</h1>
              <a href="/blog/winter-tips">Winter tips</a>
              <a href="/contact">Contact us</a>
              <p>Free consultation available today for local homeowners.</p>
            </body></html>
          `).buffer,
      }),
    );

    const snapshot = await fetchWebsiteSnapshot("https://acme-plumbing.example");
    expect(snapshot.fetched).toBe(true);
    expect(snapshot.title).toBe("Acme Plumbing");
    expect(snapshot.metaDescription).toContain("Emergency plumbing");
    expect(snapshot.h1Headings[0]).toContain("trusted plumber");
    expect(snapshot.detectedBlogLinks.length).toBeGreaterThan(0);
    expect(snapshot.hasContactSignals).toBe(true);
    expect(snapshot.hasOfferSignals).toBe(true);
  });
});
