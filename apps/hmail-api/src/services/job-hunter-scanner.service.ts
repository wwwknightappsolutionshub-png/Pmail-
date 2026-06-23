import {
  JOB_HUNTER_REGION_LABELS,
  JOB_HUNTER_REGIONS,
  normalizeJobHunterRegion,
  type JobHunterRegion,
} from "../lib/job-hunter.js";
import {
  CV_SCANNER_ALLOWED_MIMES,
  extractTextFromCv,
  normalizeCvMimeType,
} from "../lib/cv-text-extract.js";
import { getEnv } from "../config/env.js";
import {
  callJobHunterLlmJson,
  isJobHunterLlmConfigured,
  JobHunterLlmUnavailableError,
} from "./job-hunter-llm.service.js";
import {
  canRateCvWithScanner,
  type CvScannerAccessDeniedReason,
} from "./job-hunter-settings.service.js";

export { JobHunterLlmUnavailableError };

export type CvCategoryScore = {
  score: number;
  notes: string;
};

export type CvRatingResult = {
  overallScore: number;
  categories: {
    ats: CvCategoryScore;
    format: CvCategoryScore;
    keywords: CvCategoryScore;
    sections: CvCategoryScore;
  };
  regionNotes: string;
  improvements: string[];
  targetRole: string | null;
  region: JobHunterRegion;
  fileName: string;
};

export class CvScannerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvScannerValidationError";
  }
}

export class CvScannerAccessError extends Error {
  reason: CvScannerAccessDeniedReason;

  constructor(reason: CvScannerAccessDeniedReason) {
    super(
      reason === "addon"
        ? "Job Hunter add-on is required."
        : "CV scanner is available from compose attach toast until Career unlocks, or unlock Career navigation first.",
    );
    this.name = "CvScannerAccessError";
    this.reason = reason;
  }
}

function clampScore(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function parseCategory(raw: unknown, fallbackNotes: string): CvCategoryScore {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const row = raw as Record<string, unknown>;
    return {
      score: clampScore(row.score),
      notes: typeof row.notes === "string" ? row.notes.trim() : fallbackNotes,
    };
  }
  return { score: 0, notes: fallbackNotes };
}

function parseImprovements(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function regionGuidance(region: JobHunterRegion): string {
  switch (region) {
    case "US":
      return "Use US conventions: one-page preference for early career, no photo, concise bullet achievements, US spelling.";
    case "CA":
      return "Use Canadian conventions: bilingual note if applicable, Canadian spelling, 1–2 pages typical, no photo unless requested.";
    case "UK":
      return "Use UK conventions: CV (not resume), personal statement optional, UK spelling, referees available on request.";
    case "ME":
      return "Use Middle East conventions: photo often expected, nationality/visa status clarity, formal tone, GCC market keywords.";
    default:
      return "Use international best practices: clear sections, quantified impact, ATS-friendly headings, neutral formatting.";
  }
}

export function listScannerRegions() {
  return JOB_HUNTER_REGIONS.map((code) => ({
    code,
    label: JOB_HUNTER_REGION_LABELS[code],
  }));
}

export async function rateCvDocument(input: {
  tenantId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  region: string;
  targetRole?: string | null;
  fromToastOptIn?: boolean;
}): Promise<CvRatingResult> {
  const access = await canRateCvWithScanner(input.tenantId, input.userId, Boolean(input.fromToastOptIn));
  if (!access.allowed) {
    throw new CvScannerAccessError(access.reason ?? "career_nav_locked");
  }

  if (!(await isJobHunterLlmConfigured())) {
    throw new JobHunterLlmUnavailableError();
  }

  const regionInput = input.region?.trim().toUpperCase();
  if (regionInput && !JOB_HUNTER_REGIONS.includes(regionInput as JobHunterRegion)) {
    throw new CvScannerValidationError("Invalid region. Use US, CA, UK, ME, or INTL.");
  }
  const region = normalizeJobHunterRegion(input.region);

  const env = getEnv();
  const maxBytes = env.JOB_HUNTER_CV_MAX_BYTES;
  const fileName = input.fileName.trim() || "document";
  const mimeType = normalizeCvMimeType(input.mimeType, fileName);

  if (!CV_SCANNER_ALLOWED_MIMES.has(mimeType)) {
    throw new CvScannerValidationError("Only PDF and Word (.docx) CV files are supported.");
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.dataBase64, "base64");
  } catch {
    throw new CvScannerValidationError("Invalid file encoding.");
  }

  if (buffer.length === 0) {
    throw new CvScannerValidationError("Uploaded file is empty.");
  }
  if (buffer.length > maxBytes) {
    throw new CvScannerValidationError(`CV file exceeds ${Math.round(maxBytes / (1024 * 1024))} MB limit.`);
  }

  const cvText = await extractTextFromCv(buffer, mimeType);
  if (cvText.length < 40) {
    throw new CvScannerValidationError("Could not extract enough text from this document. Try a text-based PDF or DOCX.");
  }

  const targetRole = input.targetRole?.trim() || null;
  const truncatedText = cvText.slice(0, 12000);

  const system = `You are Job Hunter CV Scanner for PMail+. Return ONLY valid JSON (no markdown) with this shape:
{
  "overallScore": number (0-100),
  "categories": {
    "ats": { "score": number, "notes": string },
    "format": { "score": number, "notes": string },
    "keywords": { "score": number, "notes": string },
    "sections": { "score": number, "notes": string }
  },
  "regionNotes": string,
  "improvements": string[]
}
Score honestly from the CV text. improvements must be actionable bullet strings the user can edit later.`;

  const user = `Region: ${region} (${JOB_HUNTER_REGION_LABELS[region]})
${targetRole ? `Target role: ${targetRole}` : "Target role: not specified"}
Regional guidance: ${regionGuidance(region)}

CV filename: ${fileName}

CV text:
${truncatedText}`;

  const llm = await callJobHunterLlmJson({ system, user });

  return {
    overallScore: clampScore(llm.overallScore),
    categories: {
      ats: parseCategory(
        llm.categories && typeof llm.categories === "object"
          ? (llm.categories as Record<string, unknown>).ats
          : null,
        "ATS parseability",
      ),
      format: parseCategory(
        llm.categories && typeof llm.categories === "object"
          ? (llm.categories as Record<string, unknown>).format
          : null,
        "Layout and readability",
      ),
      keywords: parseCategory(
        llm.categories && typeof llm.categories === "object"
          ? (llm.categories as Record<string, unknown>).keywords
          : null,
        "Role-relevant keywords",
      ),
      sections: parseCategory(
        llm.categories && typeof llm.categories === "object"
          ? (llm.categories as Record<string, unknown>).sections
          : null,
        "Section completeness",
      ),
    },
    regionNotes: typeof llm.regionNotes === "string" ? llm.regionNotes.trim() : regionGuidance(region),
    improvements: parseImprovements(llm.improvements),
    targetRole,
    region,
    fileName,
  };
}
