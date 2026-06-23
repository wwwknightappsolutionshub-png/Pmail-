import { extractEmailDomain } from "./job-hunter.js";

export const JOB_APPLICATION_STATUSES = [
  "applied",
  "acknowledged",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
] as const;

export type JobApplicationStatus = (typeof JOB_APPLICATION_STATUSES)[number];

export const JOB_APPLICATION_SOURCES = ["mail_inferred", "manual"] as const;
export type JobApplicationSource = (typeof JOB_APPLICATION_SOURCES)[number];

export type CareerMailDirection = "inbound" | "outbound";

export type CareerMailInput = {
  direction: CareerMailDirection;
  subject: string;
  fromEmail: string;
  toEmails?: string[];
  snippet?: string;
  date?: string;
};

export type CareerMailParseResult = {
  status: JobApplicationStatus;
  company: string;
  roleTitle: string;
  threadHint: string;
};

const RECRUITER_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "greenhouse.io",
  "lever.co",
  "workday.com",
  "myworkday.com",
  "icims.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "jobvite.com",
  "bamboohr.com",
  "recruitee.com",
  "workable.com",
  "breezy.hr",
  "applytojob.com",
  "successfactors.com",
  "taleo.net",
  "ultipro.com",
  "paylocity.com",
];

const CAREERS_LOCAL_PARTS = /^(careers|jobs|recruiting|talent|hr|hiring|apply|applications?)@/i;

const ACK_PATTERNS =
  /thank you for (your )?apply|application (was )?received|we('ve| have) received your application|thanks for applying/i;
const INTERVIEW_PATTERNS =
  /interview|phone screen|schedule (a |your )?(call|chat|meeting)|next steps|speak with you/i;
const REJECT_PATTERNS =
  /unfortunately|not moving forward|regret to inform|other candidates|position has been filled|will not be proceeding|decided to pursue/i;
const OFFER_PATTERNS = /offer letter|pleased to offer|congratulations|extend an offer|job offer/i;
const APPLY_PATTERNS =
  /application for|applying for|my application|resume for|cover letter for|interested in the .+ role/i;

function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd?):\s*/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .trim()
    .toLowerCase();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function companyFromEmail(email: string): string | null {
  const domain = extractEmailDomain(email);
  if (!domain) return null;
  if (RECRUITER_DOMAINS.some((known) => domain === known || domain.endsWith(`.${known}`))) {
    return titleCase(knownRecruiterLabel(domain));
  }
  const base = domain.split(".")[0] ?? domain;
  if (["gmail", "outlook", "yahoo", "hotmail", "icloud"].includes(base)) return null;
  return titleCase(base.replace(/[-_]/g, " "));
}

function knownRecruiterLabel(domain: string): string {
  if (domain.includes("linkedin")) return "LinkedIn";
  if (domain.includes("indeed")) return "Indeed";
  if (domain.includes("greenhouse")) return "Greenhouse";
  if (domain.includes("lever")) return "Lever";
  if (domain.includes("workday")) return "Workday";
  if (domain.includes("icims")) return "iCIMS";
  return domain.split(".")[0] ?? domain;
}

function extractCompany(subject: string, counterpartyEmail: string): string {
  const atMatch = subject.match(/\bat\s+([A-Za-z0-9][A-Za-z0-9\s&'.-]{1,60})/i);
  if (atMatch?.[1]) return atMatch[1].trim();

  const dashMatch = subject.match(/[-–—]\s*([A-Za-z0-9][A-Za-z0-9\s&'.-]{1,60})$/);
  if (dashMatch?.[1] && !APPLY_PATTERNS.test(dashMatch[1])) return dashMatch[1].trim();

  const fromCompany = companyFromEmail(counterpartyEmail);
  if (fromCompany) return fromCompany;

  return "Unknown company";
}

function extractRoleTitle(subject: string): string {
  const normalized = subject.replace(/^(re|fwd?):\s*/gi, "").trim();
  const forMatch = normalized.match(
    /(?:application|applying|resume|cover letter) for(?: the)?(?: position of)?\s+(.+?)(?:\s+at\b|\s+[-–—]|$)/i,
  );
  if (forMatch?.[1]) return forMatch[1].trim();

  const roleMatch = normalized.match(
    /(?:role|position):\s*(.+?)(?:\s+at\b|\s+[-–—]|$)/i,
  );
  if (roleMatch?.[1]) return roleMatch[1].trim();

  const yourAppMatch = normalized.match(/your application(?: for)?\s+(.+?)(?:\s+at\b|$)/i);
  if (yourAppMatch?.[1]) return yourAppMatch[1].trim();

  return "Role not specified";
}

function buildThreadHint(subject: string, company: string): string {
  return `${normalizeSubject(subject)}|${company.trim().toLowerCase()}`;
}

function isCareerCounterparty(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = extractEmailDomain(lower);
  if (CAREERS_LOCAL_PARTS.test(lower)) return true;
  if (RECRUITER_DOMAINS.some((known) => domain === known || domain.endsWith(`.${known}`))) return true;
  return /recruit|career|talent|hiring|hr/i.test(lower);
}

function inferInboundStatus(subject: string, snippet: string): JobApplicationStatus | null {
  const haystack = `${subject}\n${snippet}`;
  if (OFFER_PATTERNS.test(haystack)) return "offer";
  if (REJECT_PATTERNS.test(haystack)) return "rejected";
  if (INTERVIEW_PATTERNS.test(haystack)) return "interview";
  if (ACK_PATTERNS.test(haystack)) return "acknowledged";
  return null;
}

export function classifyCareerMail(input: CareerMailInput): CareerMailParseResult | null {
  const subject = input.subject.trim() || "(No subject)";
  const snippet = (input.snippet ?? "").slice(0, 2000);
  const counterpartyEmail = input.direction === "inbound" ? input.fromEmail : input.toEmails?.[0] ?? "";

  if (input.direction === "outbound") {
    const haystack = `${subject}\n${snippet}`;
    if (!APPLY_PATTERNS.test(haystack) && !input.toEmails?.some((email) => isCareerCounterparty(email))) {
      return null;
    }
    const company = extractCompany(subject, counterpartyEmail);
    const roleTitle = extractRoleTitle(subject);
    return {
      status: "applied",
      company,
      roleTitle,
      threadHint: buildThreadHint(subject, company),
    };
  }

  if (!isCareerCounterparty(input.fromEmail) && !inferInboundStatus(subject, snippet)) {
    return null;
  }

  const status = inferInboundStatus(subject, snippet);
  if (!status) return null;

  const company = extractCompany(subject, input.fromEmail);
  const roleTitle = extractRoleTitle(subject);
  return {
    status,
    company,
    roleTitle,
    threadHint: buildThreadHint(subject, company),
  };
}

export function isJobApplicationStatus(value: string): value is JobApplicationStatus {
  return JOB_APPLICATION_STATUSES.includes(value as JobApplicationStatus);
}

export function shouldUpgradeApplicationStatus(
  current: JobApplicationStatus,
  incoming: JobApplicationStatus,
): boolean {
  const rank: Record<JobApplicationStatus, number> = {
    applied: 1,
    acknowledged: 2,
    interview: 3,
    offer: 4,
    rejected: 4,
    withdrawn: 5,
  };
  if (current === "withdrawn") return false;
  if (incoming === "withdrawn") return true;
  if (current === "offer" && incoming === "rejected") return true;
  if (current === "rejected" && incoming === "offer") return true;
  return rank[incoming] >= rank[current];
}

export function computeCareerScoreFromApplications(applicationCount: number): number {
  if (applicationCount <= 0) return 0;
  return Math.min(100, applicationCount * 20);
}
