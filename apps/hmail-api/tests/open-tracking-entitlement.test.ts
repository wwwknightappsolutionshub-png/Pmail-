import { describe, expect, it } from "vitest";
import { resolveOutboundTrackingEnabled } from "../src/services/open-tracking-entitlement.service.js";

describe("open tracking entitlement", () => {
  it("defaults tracking on when entitled and not explicitly disabled", () => {
    expect(resolveOutboundTrackingEnabled(undefined, true)).toBe(true);
    expect(resolveOutboundTrackingEnabled(true, true)).toBe(true);
  });

  it("respects explicit disable and blocks when not entitled", () => {
    expect(resolveOutboundTrackingEnabled(false, true)).toBe(false);
    expect(resolveOutboundTrackingEnabled(undefined, false)).toBe(false);
    expect(resolveOutboundTrackingEnabled(true, false)).toBe(false);
  });
});
