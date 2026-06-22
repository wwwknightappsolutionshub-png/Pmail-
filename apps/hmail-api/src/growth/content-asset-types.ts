/** Phase B day-one content asset types (stored in GrowthContentAsset). */
export const GROWTH_CONTENT_ASSET_TYPES = [
  "persona",
  "positioning",
  "competitor_analysis",
  "offer_recommendations",
  "website_audit",
  "seo_recommendations",
  "homepage_copy",
  "landing_copy",
  "ad_copy",
  "blog_post",
  "social_post",
  "email_sequence",
  "bundle_summary",
] as const;

export type GrowthContentAssetType = (typeof GROWTH_CONTENT_ASSET_TYPES)[number];

export function isGrowthContentAssetType(value: string): value is GrowthContentAssetType {
  return (GROWTH_CONTENT_ASSET_TYPES as readonly string[]).includes(value);
}
