import type { AssetDraft } from "../growth/content-bundle-builder.js";
import type { GrowthContentAssetType } from "../growth/content-asset-types.js";
import type { GrowthWizardProfile } from "../growth/wizard-profile.js";
import { wizardBusinessName } from "../growth/wizard-profile.js";
import { callGrowthLlmJson, isGrowthLlmConfigured } from "./growth-llm-core.service.js";

const LLM_ASSET_TYPES: GrowthContentAssetType[] = [
  "homepage_copy",
  "landing_copy",
  "ad_copy",
  "email_sequence",
  "social_post",
];

function shouldEnhanceAsset(assetType: GrowthContentAssetType): boolean {
  return LLM_ASSET_TYPES.includes(assetType);
}

function systemPromptFor(assetType: GrowthContentAssetType): string {
  const base = `You are a conversion copywriter. Return valid JSON only — no markdown fences.`;
  switch (assetType) {
    case "homepage_copy":
      return `${base} Keys: heroHeadline, heroSubheadline, heroCta, sections (array of {heading, body}), generationMode:"llm".`;
    case "landing_copy":
      return `${base} Keys: headline, subheadline, bullets (string[]), cta, guarantee, generationMode:"llm".`;
    case "ad_copy":
      return `${base} Keys: google (array of {headline, description}), meta (array of {primaryText, headline, description}), generationMode:"llm".`;
    case "email_sequence":
      return `${base} Keys: emails (array of {step, subject, preheader, body}), generationMode:"llm". Keep 6 emails.`;
    case "social_post":
      return `${base} Keys: caption, hashtags (string[]), callToAction, generationMode:"llm".`;
    default:
      return base;
  }
}

export async function enhanceContentDraftsWithLlm(
  profile: GrowthWizardProfile,
  drafts: AssetDraft[],
): Promise<AssetDraft[]> {
  if (!(await isGrowthLlmConfigured())) {
    return drafts.map((d) => ({
      ...d,
      body: { ...d.body, generationMode: "template" },
    }));
  }

  const business = wizardBusinessName(profile);
  const industry = profile.step1?.industry ?? "local services";
  const serviceArea = profile.step1?.serviceArea ?? "";
  const enhanced: AssetDraft[] = [];

  for (const draft of drafts) {
    if (!shouldEnhanceAsset(draft.assetType)) {
      enhanced.push(draft);
      continue;
    }

    if (draft.assetType === "social_post" && draft.sortOrder > 4) {
      enhanced.push({ ...draft, body: { ...draft.body, generationMode: "template" } });
      continue;
    }

    const parsed = await callGrowthLlmJson({
      system: systemPromptFor(draft.assetType),
      user: `Business: ${business}
Industry: ${industry}
Service area: ${serviceArea}
Asset type: ${draft.assetType}
Title: ${draft.title}

Template draft (improve specificity, keep structure):
${JSON.stringify(draft.body, null, 2)}`,
    });

    if (!parsed) {
      enhanced.push({ ...draft, body: { ...draft.body, generationMode: "template" } });
      continue;
    }

    enhanced.push({
      ...draft,
      body: {
        ...draft.body,
        ...parsed,
        generationMode: "llm",
      },
    });
  }

  return enhanced;
}

export async function getGrowthContentLlmStatus(): Promise<{ configured: boolean }> {
  return { configured: await isGrowthLlmConfigured() };
}
