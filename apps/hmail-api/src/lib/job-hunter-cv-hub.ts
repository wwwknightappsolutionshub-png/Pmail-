import type { JobHunterCvTemplate } from "./job-hunter-cv-content.js";
import { JOB_HUNTER_REGION_LABELS, type JobHunterRegion } from "./job-hunter.js";

export const CV_EXPERIENCE_LEVELS = ["entry", "mid", "senior"] as const;
export type CvExperienceLevel = (typeof CV_EXPERIENCE_LEVELS)[number];

export const CV_EXPERIENCE_LEVEL_LABELS: Record<CvExperienceLevel, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior level",
};

export const CV_PROFESSION_LABELS: Record<string, string> = {
  engineering: "Engineering",
  product: "Product",
  healthcare: "Healthcare",
  analytics: "Data & Analytics",
  marketing: "Marketing",
  "project-management": "Project Management",
  "human-resources": "Human Resources",
  "customer-success": "Customer Success",
  operations: "Operations",
  sales: "Sales",
  finance: "Finance",
  design: "Design",
  legal: "Legal",
  education: "Education",
  "social-work": "Social Work",
  hospitality: "Hospitality",
  property: "Property & Real Estate",
};

export type CvTemplateMeta = Omit<JobHunterCvTemplate, "content">;

export function sortCvTemplates(
  templates: CvTemplateMeta[],
  sortBy: "country" | "experience" | "profession" = "profession",
): CvTemplateMeta[] {
  const sorted = [...templates];
  if (sortBy === "country") {
    sorted.sort((a, b) => a.region.localeCompare(b.region) || a.title.localeCompare(b.title));
  } else if (sortBy === "experience") {
    const order: Record<CvExperienceLevel, number> = { entry: 0, mid: 1, senior: 2 };
    sorted.sort(
      (a, b) =>
        order[a.experienceLevel] - order[b.experienceLevel] || a.roleCategory.localeCompare(b.roleCategory),
    );
  } else {
    sorted.sort(
      (a, b) =>
        a.roleCategory.localeCompare(b.roleCategory) ||
        orderExperience(a.experienceLevel) - orderExperience(b.experienceLevel),
    );
  }
  return sorted;
}

function orderExperience(level: CvExperienceLevel): number {
  return level === "entry" ? 0 : level === "mid" ? 1 : 2;
}

export function groupCvTemplatesByProfession(templates: CvTemplateMeta[]) {
  const groups = new Map<string, CvTemplateMeta[]>();
  for (const template of templates) {
    const list = groups.get(template.roleCategory) ?? [];
    list.push(template);
    groups.set(template.roleCategory, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([profession, items]) => ({
      profession,
      label: CV_PROFESSION_LABELS[profession] ?? profession.replace(/-/g, " "),
      templates: items,
    }));
}

export function regionLabel(region: JobHunterRegion): string {
  return JOB_HUNTER_REGION_LABELS[region] ?? region;
}
