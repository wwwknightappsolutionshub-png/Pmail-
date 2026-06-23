import type { JobHunterRegion } from "./job-hunter.js";
import type { CvExperienceLevel } from "./job-hunter-cv-hub.js";

export type JobHunterCvExperience = {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type JobHunterCvEducation = {
  degree: string;
  school: string;
  year: string;
  details?: string;
};

export type JobHunterCvCertification = {
  name: string;
  issuer: string;
  year: string;
};

export type JobHunterCvContent = {
  fullName: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedIn?: string;
  };
  summary: string;
  experience: JobHunterCvExperience[];
  education: JobHunterCvEducation[];
  skills: string[];
  certifications: JobHunterCvCertification[];
};

export const JOB_HUNTER_CV_SOURCES = ["builder", "scanner", "import"] as const;
export type JobHunterCvSource = (typeof JOB_HUNTER_CV_SOURCES)[number];

export function parseCvContentJson(raw: string): JobHunterCvContent {
  const parsed = JSON.parse(raw) as JobHunterCvContent;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid CV content");
  }
  return parsed;
}

export function emptyCvContent(input?: Partial<JobHunterCvContent>): JobHunterCvContent {
  return {
    fullName: input?.fullName ?? "",
    contact: {
      email: input?.contact?.email ?? "",
      phone: input?.contact?.phone ?? "",
      location: input?.contact?.location ?? "",
      linkedIn: input?.contact?.linkedIn,
    },
    summary: input?.summary ?? "",
    experience: input?.experience ?? [],
    education: input?.education ?? [],
    skills: input?.skills ?? [],
    certifications: input?.certifications ?? [],
  };
}

export function isJobHunterCvSource(value: string): value is JobHunterCvSource {
  return JOB_HUNTER_CV_SOURCES.includes(value as JobHunterCvSource);
}

export type JobHunterCvTemplate = {
  id: string;
  region: JobHunterRegion;
  roleCategory: string;
  industry: string;
  experienceLevel: CvExperienceLevel;
  title: string;
  description: string;
  content: JobHunterCvContent;
};
