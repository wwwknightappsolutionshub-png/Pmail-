/** Bespoke Mail industry verticals — legal includes immigration / RCIC PMail+ modules. */
export type AddonVertical =
  | "legal"
  | "real-estate"
  | "accounting"
  | "recruitment"
  | "b2b-services"
  | "healthcare"
  | "platform";

export const ADDON_VERTICAL_ORDER: AddonVertical[] = [
  "legal",
  "real-estate",
  "accounting",
  "recruitment",
  "b2b-services",
  "healthcare",
  "platform",
];

export const ADDON_VERTICAL_LABELS: Record<AddonVertical, string> = {
  legal: "Law firms & legal practices (incl. immigration / RCIC)",
  "real-estate": "Real estate agencies",
  accounting: "Accounting & bookkeeping firms",
  recruitment: "Recruitment & staffing agencies",
  "b2b-services": "B2B professional services",
  healthcare: "Healthcare & medical practices",
  platform: "Platform-wide (all industries)",
};
