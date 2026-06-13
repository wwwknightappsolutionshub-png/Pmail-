export type AddonGroup = "ircc_inbox" | "ai_tools" | "client_work" | "communications" | "compliance";

export type AddonReleasePhase = 1 | 2 | 3;

export type AddonAccessStatus = "none" | "trial" | "active" | "expired";

export interface AddonItem {
  id: string;
  slug: string;
  name: string;
  group: AddonGroup;
  description: string;
  features: string[];
  sortOrder: number;
  priceCents: number;
  releasePhase: AddonReleasePhase;
  comingSoon: boolean;
  accessStatus: AddonAccessStatus;
  trialEndsAt?: string;
  trialDaysLeft?: number;
  canStartTrial: boolean;
}

export const ADDON_GROUP_LABELS: Record<AddonGroup, string> = {
  ircc_inbox: "IRCC Inbox",
  ai_tools: "AI Tools",
  client_work: "Client Work",
  communications: "Communications",
  compliance: "Compliance",
};

export const ADDON_GROUP_ORDER: AddonGroup[] = [
  "ircc_inbox",
  "ai_tools",
  "client_work",
  "communications",
  "compliance",
];
