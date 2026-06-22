import type {
  GrowthWizardStep1,
  GrowthWizardStep2,
  GrowthWizardStep3,
  GrowthWizardStep4,
  GrowthWizardStep5,
  GrowthWizardStep6,
} from "./wizard-schema.js";
import { prisma } from "../lib/prisma.js";

export type GrowthWizardProfile = {
  step1: GrowthWizardStep1 | null;
  step2: GrowthWizardStep2 | null;
  step3: GrowthWizardStep3 | null;
  step4: GrowthWizardStep4 | null;
  step5: GrowthWizardStep5 | null;
  step6: GrowthWizardStep6 | null;
};

function parseStep<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadGrowthWizardProfile(workspaceId: string): Promise<GrowthWizardProfile> {
  const profile = await prisma.growthBusinessProfile.findUnique({ where: { workspaceId } });
  if (!profile) {
    return { step1: null, step2: null, step3: null, step4: null, step5: null, step6: null };
  }

  return {
    step1: parseStep<GrowthWizardStep1>(profile.step1Json),
    step2: parseStep<GrowthWizardStep2>(profile.step2Json),
    step3: parseStep<GrowthWizardStep3>(profile.step3Json),
    step4: parseStep<GrowthWizardStep4>(profile.step4Json),
    step5: parseStep<GrowthWizardStep5>(profile.step5Json),
    step6: parseStep<GrowthWizardStep6>(profile.step6Json),
  };
}

export function wizardCommunicationStyle(profile: GrowthWizardProfile): string {
  return profile.step5?.style ?? "professional";
}

export function wizardBusinessName(profile: GrowthWizardProfile): string {
  return profile.step1?.businessName?.trim() || "Your business";
}

export function wizardWebsiteUrl(profile: GrowthWizardProfile): string {
  const raw = profile.step1?.website;
  if (raw == null) return "";
  return String(raw).trim();
}

export function hasExistingWebsite(profile: GrowthWizardProfile): boolean {
  return wizardWebsiteUrl(profile).length > 0;
}

export type GrowthContentBundleMode = "greenfield" | "existing_site";

export function resolveContentBundleMode(profile: GrowthWizardProfile): GrowthContentBundleMode {
  return hasExistingWebsite(profile) ? "existing_site" : "greenfield";
}
