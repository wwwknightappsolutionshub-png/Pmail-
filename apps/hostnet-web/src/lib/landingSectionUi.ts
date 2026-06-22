/** Shared field → UI mapping for landing sections (must match `LandingPage.tsx`). */

export function landingSectionEyebrow(sectionKey: string, subtitle: string | null | undefined): string | null {
  switch (sectionKey) {
    case "hero":
      return "Prohost Cloud";
    case "enterprise":
      return "Platform";
    case "solutions":
      return "Solutions";
    case "platform":
      return "Product suite";
    case "features":
      return "Capabilities";
    case "trust":
      return "Security & reliability";
    case "hmail_addons":
      return "Bespoke mail";
    case "testimonials":
      return subtitle?.trim() || "Testimonials";
    case "contact":
      return "Custom pricing";
    default:
      return subtitle?.trim() || null;
  }
}

/** Subtitle rendered as `.section-lead` on the live page (not eyebrow). */
export function landingSectionUsesSubtitleAsLead(sectionKey: string): boolean {
  return sectionKey === "enterprise" || sectionKey === "solutions" || sectionKey === "trust";
}

/** Product suite: subtitle is primary muted line; body is fallback when subtitle empty. */
export function landingSectionPlatformCopy(subtitle: string, body: string): { mutedHtml: string | null; useBody: boolean } {
  if (subtitle.trim()) return { mutedHtml: subtitle, useBody: false };
  if (body.trim()) return { mutedHtml: null, useBody: true };
  return { mutedHtml: null, useBody: false };
}

/** Capabilities: body is primary muted line; subtitle is fallback when body empty. */
export function landingSectionFeaturesCopy(subtitle: string, body: string): { leadHtml: string | null; useSubtitle: boolean } {
  if (body.trim()) return { leadHtml: body, useSubtitle: false };
  if (subtitle.trim()) return { leadHtml: subtitle, useSubtitle: true };
  return { leadHtml: null, useSubtitle: false };
}

export type LandingBulletVariant = "stack" | "rail" | "suite" | "list" | "security" | "chips";

export function landingSectionBulletVariant(sectionKey: string): LandingBulletVariant | null {
  switch (sectionKey) {
    case "enterprise":
      return "stack";
    case "solutions":
      return "rail";
    case "platform":
      return "suite";
    case "features":
      return "list";
    case "trust":
      return "security";
    default:
      return null;
  }
}
