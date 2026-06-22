/** Canonical landing sections — must match `LandingPage.tsx` section keys and order. */
export type LandingSectionMeta = {
  key: string;
  label: string;
  /** HTML `id` on the live marketing page, when present */
  anchor: string | null;
  liveOnPage: boolean;
};

export const LANDING_SECTION_CATALOG: LandingSectionMeta[] = [
  { key: "hero", label: "Hero", anchor: null, liveOnPage: true },
  { key: "enterprise", label: "Enterprise platform", anchor: "platform", liveOnPage: true },
  { key: "solutions", label: "Solutions", anchor: "solutions", liveOnPage: true },
  { key: "platform", label: "Product suite", anchor: "product-suite", liveOnPage: true },
  { key: "growth_cta", label: "Prohost Growth", anchor: "growth", liveOnPage: true },
  { key: "features", label: "Capabilities", anchor: "features", liveOnPage: true },
  { key: "trust", label: "Security & reliability", anchor: "security", liveOnPage: true },
  { key: "hmail_addons", label: "Bespoke mail", anchor: "pmail", liveOnPage: true },
  { key: "testimonials", label: "Testimonials", anchor: "testimonials", liveOnPage: true },
  { key: "contact", label: "Register / custom pricing", anchor: "register", liveOnPage: true },
  { key: "hosting_intro", label: "Hosting intro", anchor: null, liveOnPage: false },
  { key: "cta_footer", label: "Footer CTA", anchor: null, liveOnPage: false },
];

export const LIVE_LANDING_SECTION_KEYS = LANDING_SECTION_CATALOG.filter((s) => s.liveOnPage).map((s) => s.key);

const catalogOrder = new Map(LANDING_SECTION_CATALOG.map((entry, index) => [entry.key, index]));

export function getLandingSectionMeta(key: string): LandingSectionMeta | undefined {
  return LANDING_SECTION_CATALOG.find((entry) => entry.key === key);
}

export function formatLandingSectionLabel(key: string): string {
  return getLandingSectionMeta(key)?.label ?? key.replace(/_/g, " ");
}

export function sortSectionsLikeLandingPage<T extends { sectionKey: string; sortOrder: number }>(sections: T[]): T[] {
  return [...sections].sort((a, b) => {
    const aMeta = getLandingSectionMeta(a.sectionKey);
    const bMeta = getLandingSectionMeta(b.sectionKey);
    const aLive = aMeta?.liveOnPage ?? false;
    const bLive = bMeta?.liveOnPage ?? false;

    if (aLive && bLive) return a.sortOrder - b.sortOrder;
    if (aLive !== bLive) return aLive ? -1 : 1;

    const ai = catalogOrder.get(a.sectionKey) ?? 999;
    const bi = catalogOrder.get(b.sectionKey) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.sortOrder - b.sortOrder;
  });
}
