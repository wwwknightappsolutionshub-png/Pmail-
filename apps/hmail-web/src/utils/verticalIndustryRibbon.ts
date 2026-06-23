import {
  ACCOUNTING_NAV,
  B2B_NAV,
  HEALTHCARE_NAV,
  PHASE_1_NAV,
  PHASE_2_NAV,
  REAL_ESTATE_NAV,
  RECRUITMENT_NAV,
  toolAddonSlug,
} from "../constants/addonTools";
import type { BusinessVertical } from "../types/mail";

function industryNavFor(businessVertical?: BusinessVertical | null) {
  switch (businessVertical) {
    case "legal":
      return null;
    case "real-estate":
      return REAL_ESTATE_NAV;
    case "accounting":
      return ACCOUNTING_NAV;
    case "recruitment":
      return RECRUITMENT_NAV;
    case "b2b-services":
      return B2B_NAV;
    case "healthcare":
      return HEALTHCARE_NAV;
    default:
      return null;
  }
}

/** True when the user has purchased/trialed a vertical workspace add-on (not standard mail only). */
export function hasVerticalIndustryRibbonAccess(
  businessVertical: BusinessVertical | null | undefined,
  hasAddon: (slug: string) => boolean,
): boolean {
  if (!businessVertical || businessVertical === "standard" || businessVertical === "free-basic") {
    return false;
  }

  if (businessVertical === "legal") {
    return [...PHASE_1_NAV, ...PHASE_2_NAV].some((item) => {
      const slug = toolAddonSlug(item.view);
      return Boolean(slug && hasAddon(slug));
    });
  }

  const industryNav = industryNavFor(businessVertical);
  if (!industryNav?.length) return false;

  return industryNav.some((item) => {
    const slug = toolAddonSlug(item.view);
    return Boolean(slug && hasAddon(slug));
  });
}

export function shouldHideVerticalIndustryRibbon(
  businessVertical: BusinessVertical | null | undefined,
  hasAddon: (slug: string) => boolean,
): boolean {
  return !hasVerticalIndustryRibbonAccess(businessVertical, hasAddon);
}
