import { z } from "zod";

/** Trim and normalize website input (empty, bare domains, localhost dev URLs). */
export function normalizeWebsiteInput(val: unknown): string {
  if (val == null) return "";
  const s = String(val).trim();
  if (!s || s === "https://" || s === "http://") return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

const optionalText = (max: number) =>
  z.preprocess((v) => (v == null ? "" : String(v).trim()), z.string().max(max));

const optionalWebsiteUrl = z.preprocess(
  normalizeWebsiteInput,
  z.union([z.literal(""), z.string().url({ message: "Enter a valid website URL or leave blank" })]),
);

const urlList = z.preprocess(
  (val) => {
    if (!Array.isArray(val)) return [];
    return val.map(normalizeWebsiteInput).filter(Boolean);
  },
  z.array(z.string().url()).default([]),
);

/** Step 1 — Business Information */
export const growthWizardStep1Schema = z.object({
  businessName: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(200)),
  industry: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(120)),
  website: optionalWebsiteUrl,
  serviceArea: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(500)),
  productsServices: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(2000)),
  averageCustomerValue: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(120)),
  monthlyRevenueGoal: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(120)),
  monthlyMarketingBudget: z.preprocess((v) => String(v ?? "").trim(), z.string().min(1).max(120)),
});

/** Step 2 — Customer Information */
export const growthWizardStep2Schema = z.object({
  idealCustomer: z.string().min(1).max(2000),
  customerProblems: z.string().min(1).max(2000),
  desiredOutcomes: z.string().min(1).max(2000),
  customerObjections: z.string().min(1).max(2000),
  existingCustomerExamples: optionalText(2000),
});

/** Step 3 — Competitors */
export const growthWizardStep3Schema = z.object({
  competitorUrls: urlList,
  competitorNames: z.array(z.string().min(1).max(200)).default([]),
  whyBetter: z.string().min(1).max(2000),
  whyDifferent: z.string().min(1).max(2000),
});

/** Step 4 — Offer Configuration */
export const growthWizardStep4Schema = z.object({
  mainOffer: z.string().min(1).max(2000),
  upsells: optionalText(2000),
  freeConsultation: z.boolean().default(false),
  discounts: optionalText(1000),
  guarantees: optionalText(1000),
});

/** Step 5 — Communication Style */
export const growthCommunicationStyles = [
  "professional",
  "friendly",
  "luxury",
  "corporate",
  "playful",
  "technical",
] as const;

export const growthWizardStep5Schema = z.object({
  style: z.enum(growthCommunicationStyles),
  notes: optionalText(1000),
});

/** Step 6 — Assets */
export const growthAssetKindSchema = z.enum([
  "logo",
  "brand_guide",
  "image",
  "video",
  "testimonial",
  "case_study",
]);

export const growthWizardAssetSchema = z.object({
  kind: growthAssetKindSchema,
  url: z.string().min(1).max(2000),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(120).optional(),
});

export const growthWizardStep6Schema = z.object({
  assets: z.array(growthWizardAssetSchema).default([]),
});

export type GrowthWizardStep1 = z.infer<typeof growthWizardStep1Schema>;
export type GrowthWizardStep2 = z.infer<typeof growthWizardStep2Schema>;
export type GrowthWizardStep3 = z.infer<typeof growthWizardStep3Schema>;
export type GrowthWizardStep4 = z.infer<typeof growthWizardStep4Schema>;
export type GrowthWizardStep5 = z.infer<typeof growthWizardStep5Schema>;
export type GrowthWizardStep6 = z.infer<typeof growthWizardStep6Schema>;

export const GROWTH_WIZARD_STEP_COUNT = 6;

const stepSchemas = [
  growthWizardStep1Schema,
  growthWizardStep2Schema,
  growthWizardStep3Schema,
  growthWizardStep4Schema,
  growthWizardStep5Schema,
  growthWizardStep6Schema,
] as const;

export function parseGrowthWizardStep(step: number, data: unknown) {
  if (step < 1 || step > GROWTH_WIZARD_STEP_COUNT) {
    throw new Error(`Invalid wizard step: ${step}`);
  }
  return stepSchemas[step - 1].parse(data);
}

export function wizardStepFieldKey(step: number): `step${1 | 2 | 3 | 4 | 5 | 6}Json` {
  return `step${step as 1 | 2 | 3 | 4 | 5 | 6}Json`;
}

export function formatZodValidationMessage(err: z.ZodError): string {
  const flat = err.flatten();
  const fieldMessages = Object.entries(flat.fieldErrors).flatMap(([field, messages]) =>
    (messages ?? []).map((message) => `${field}: ${message}`),
  );
  const formMessages = flat.formErrors ?? [];
  const parts = [...formMessages, ...fieldMessages];
  return parts.length > 0 ? parts.join("; ") : "Validation failed";
}
