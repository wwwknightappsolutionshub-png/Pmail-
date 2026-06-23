import {
  JOB_HUNTER_REGION_LABELS,
  normalizeJobHunterRegion,
  type JobHunterRegion,
} from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { getMailCredentialsForAccount } from "./mail-account.service.js";
import { getMessage } from "./imap.service.js";
import {
  callJobHunterLlmJson,
  isJobHunterLlmConfigured,
  JobHunterLlmUnavailableError,
} from "./job-hunter-llm.service.js";

export { JobHunterLlmUnavailableError };

export class InterviewPrepValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterviewPrepValidationError";
  }
}

export type InterviewPrepQuestion = {
  question: string;
  answerOutline: string[];
  tips: string[];
};

export type InterviewPrepResult = {
  targetRole: string | null;
  region: JobHunterRegion;
  source: "job_description" | "application";
  questions: InterviewPrepQuestion[];
  generalTips: string[];
};

function regionInterviewGuidance(region: JobHunterRegion): string {
  switch (region) {
    case "US":
      return "US interviews often emphasize STAR stories, quantified impact, and concise answers.";
    case "CA":
      return "Canadian employers value bilingual awareness where relevant, teamwork, and clear competency examples.";
    case "UK":
      return "UK interviews may include competency-based questions; keep answers structured and professional.";
    case "ME":
      return "Middle East roles may weigh leadership, stakeholder management, and cross-cultural collaboration.";
    default:
      return "International interviews benefit from clarity on work authorization, time zones, and remote collaboration.";
  }
}

function shouldSkipImapFetch(imapHost: string): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return imapHost === "local.pmail.test";
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function resolveApplicationMailContext(
  userId: string,
  applicationId: string,
): Promise<{ text: string; targetRole: string | null; company: string }> {
  const application = await prisma.jobApplication.findFirst({ where: { id: applicationId, userId } });
  if (!application) {
    throw new InterviewPrepValidationError("Application not found");
  }

  let mailContext = "";
  if (application.imapFolder && application.messageUid && application.mailAccountId) {
    const credentials = await getMailCredentialsForAccount(userId, application.mailAccountId);
    if (credentials && !shouldSkipImapFetch(credentials.mailConfig.imapHost)) {
      try {
        const message = await getMessage(credentials, application.imapFolder, application.messageUid);
        if (message) {
          const bodyText = message.text?.trim() || (message.html ? stripHtml(message.html) : "");
          mailContext = [
            `Subject: ${message.subject}`,
            `From: ${message.from}`,
            `Snippet: ${message.snippet}`,
            bodyText ? `Body excerpt:\n${bodyText.slice(0, 4000)}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        }
      } catch {
        // fall back to stored application metadata
      }
    }
  }

  const baseContext = [
    `Company: ${application.company}`,
    `Role: ${application.roleTitle}`,
    application.threadHint ? `Thread hint: ${application.threadHint}` : "",
    mailContext,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    text: baseContext,
    targetRole: application.roleTitle,
    company: application.company,
  };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseQuestions(value: unknown): InterviewPrepQuestion[] {
  if (!Array.isArray(value)) return [];
  const questions: InterviewPrepQuestion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const question = typeof row.question === "string" ? row.question.trim() : "";
    if (!question) continue;
    questions.push({
      question,
      answerOutline: parseStringArray(row.answerOutline),
      tips: parseStringArray(row.tips),
    });
  }
  return questions.slice(0, 12);
}

export async function generateInterviewPrep(input: {
  userId: string;
  jobDescription?: string;
  applicationId?: string;
  targetRole?: string;
  region?: string;
}): Promise<InterviewPrepResult> {
  if (!(await isJobHunterLlmConfigured())) {
    throw new JobHunterLlmUnavailableError();
  }

  const region = normalizeJobHunterRegion(input.region);
  let contextText = "";
  let targetRole = input.targetRole?.trim() || null;
  let source: InterviewPrepResult["source"] = "job_description";

  if (input.jobDescription?.trim()) {
    contextText = input.jobDescription.trim();
  } else if (input.applicationId) {
    const appContext = await resolveApplicationMailContext(input.userId, input.applicationId);
    contextText = appContext.text;
    targetRole = targetRole ?? appContext.targetRole;
    source = "application";
  } else {
    throw new InterviewPrepValidationError("Provide jobDescription or applicationId");
  }

  if (contextText.length < 40) {
    throw new InterviewPrepValidationError(
      "Insufficient job description context. Paste a job description or choose an application with more detail.",
    );
  }

  const truncatedContext = contextText.slice(0, 12000);

  const system = `You are Job Hunter Interview Prep for PMail+. Return ONLY valid JSON (no markdown) with this shape:
{
  "questions": [
    {
      "question": string,
      "answerOutline": string[],
      "tips": string[]
    }
  ],
  "generalTips": string[]
}
Provide 8-10 likely interview questions tailored to the role and region. answerOutline items are concise bullet talking points (not full scripts). tips are short coaching notes. generalTips are 3-5 overall prep reminders. Do not invent company secrets or claim insider knowledge.`;

  const user = `Region: ${region} (${JOB_HUNTER_REGION_LABELS[region]})
Regional guidance: ${regionInterviewGuidance(region)}
${targetRole ? `Target role: ${targetRole}` : "Target role: not specified"}

Job / application context:
${truncatedContext}`;

  const llm = await callJobHunterLlmJson({ system, user });
  const questions = parseQuestions(llm.questions);
  if (questions.length < 4) {
    throw new Error("Job Hunter AI returned insufficient interview prep content");
  }

  return {
    targetRole,
    region,
    source,
    questions,
    generalTips: parseStringArray(llm.generalTips).slice(0, 8),
  };
}
