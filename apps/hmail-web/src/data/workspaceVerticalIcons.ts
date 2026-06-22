import type { BusinessVertical } from "../types/mail";
import type { MarketplaceBrowseVertical } from "../types/addon";

export const WORKSPACE_VERTICAL_ICONS: Record<BusinessVertical, string> = {
  standard: "✉️",
  "free-basic": "🧭",
  legal: "⚖️",
  "real-estate": "🏠",
  accounting: "📊",
  recruitment: "👥",
  "b2b-services": "🤝",
  healthcare: "🏥",
};

export const MARKETPLACE_VERTICAL_ICONS: Record<MarketplaceBrowseVertical, string> = {
  legal: WORKSPACE_VERTICAL_ICONS.legal,
  accounting: WORKSPACE_VERTICAL_ICONS.accounting,
  "real-estate": WORKSPACE_VERTICAL_ICONS["real-estate"],
  recruitment: WORKSPACE_VERTICAL_ICONS.recruitment,
  "b2b-services": WORKSPACE_VERTICAL_ICONS["b2b-services"],
  healthcare: WORKSPACE_VERTICAL_ICONS.healthcare,
};
