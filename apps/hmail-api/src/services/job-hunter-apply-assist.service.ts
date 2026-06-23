import { getEnv, getEnabledPaymentProviders, type PaymentProviderId } from "../config/env.js";
import {
  JOB_HUNTER_REGION_LABELS,
  normalizeJobHunterRegion,
  type JobHunterRegion,
} from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { createManualJobApplication } from "./job-hunter-applications.service.js";
import { listAttachableCareerDocuments } from "./job-hunter-documents.service.js";
import {
  callJobHunterLlmJson,
  isJobHunterLlmConfigured,
  JobHunterLlmUnavailableError,
} from "./job-hunter-llm.service.js";
import { executeOutgoingMailSend } from "./mail-outgoing.service.js";
import type { MailCredentials } from "./imap.service.js";
import { createMockCheckoutUrl } from "./payments/mock.provider.js";
import { initializePaystackTransaction } from "./payments/paystack.provider.js";
import { createStripeCheckoutSession } from "./payments/stripe.provider.js";
import type { CheckoutMetadata } from "./provisioning.service.js";

export const JOB_APPLY_ASSIST_ADDON_SLUG = "job-apply-assist-functionality";

export const APPLY_ASSIST_CREDIT_PACK_CENTS = 500;
export const APPLY_ASSIST_CREDITS_PER_PACK = 100;
export const APPLY_ASSIST_CREDIT_COST = 1;
export const APPLY_ASSIST_DAILY_CAP = 20;

export const APPLY_ASSIST_CHANNELS = ["email_apply", "linkedin_assist", "indeed_assist"] as const;
export type ApplyAssistChannel = (typeof APPLY_ASSIST_CHANNELS)[number];

export type ApplyAssistPrefilledPayload = {
  channel: ApplyAssistChannel;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  toEmail?: string;
  company?: string;
  coverBlurb?: string;
  checklist?: string[];
  openUrl?: string;
  assistDisclaimer?: string;
};

export class ApplyAssistValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyAssistValidationError";
  }
}

export class ApplyAssistDailyCapError extends Error {
  constructor() {
    super(`Daily assist limit reached (${APPLY_ASSIST_DAILY_CAP} confirmed assists per day).`);
    this.name = "ApplyAssistDailyCapError";
  }
}

export class ApplyAssistInsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient Apply Assist credits. Purchase a credit pack to continue.");
    this.name = "ApplyAssistInsufficientCreditsError";
  }
}

function isApplyAssistChannel(value: string): value is ApplyAssistChannel {
  return APPLY_ASSIST_CHANNELS.includes(value as ApplyAssistChannel);
}

function parsePrefillPayload(json: string | null | undefined): ApplyAssistPrefilledPayload | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ApplyAssistPrefilledPayload;
  } catch {
    return null;
  }
}

function serializeQueue(row: {
  id: string;
  channel: string;
  status: string;
  jobUrl: string | null;
  careersEmail: string | null;
  company: string | null;
  targetRole: string;
  region: string;
  userDocumentId: string | null;
  prefilledPayloadJson: string | null;
  applicationId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    jobUrl: row.jobUrl,
    careersEmail: row.careersEmail,
    company: row.company,
    targetRole: row.targetRole,
    region: row.region,
    userDocumentId: row.userDocumentId,
    prefilled: parsePrefillPayload(row.prefilledPayloadJson),
    applicationId: row.applicationId,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateApplyAssistWallet(tenantId: string, userId: string) {
  const existing = await prisma.jobApplyAssistCreditWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.jobApplyAssistCreditWallet.create({
    data: { userId, tenantId, balance: 0 },
  });
}

export async function grantApplyAssistCredits(input: {
  tenantId: string;
  userId: string;
  credits: number;
  reason: string;
  checkoutId?: string;
}) {
  if (input.credits <= 0) throw new ApplyAssistValidationError("Credit grant must be positive");

  await prisma.$transaction(async (tx) => {
    await tx.jobApplyAssistCreditWallet.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, tenantId: input.tenantId, balance: input.credits },
      update: { balance: { increment: input.credits } },
    });
    await tx.jobApplyAssistLedger.create({
      data: {
        userId: input.userId,
        delta: input.credits,
        reason: input.reason,
        queueId: input.checkoutId ?? null,
      },
    });
  });

  return getApplyAssistWalletState(input.tenantId, input.userId);
}

async function deductApplyAssistCredit(input: {
  userId: string;
  reason: string;
  applicationId?: string;
  queueId: string;
}) {
  const wallet = await prisma.jobApplyAssistCreditWallet.findUnique({ where: { userId: input.userId } });
  if (!wallet || wallet.balance < APPLY_ASSIST_CREDIT_COST) {
    throw new ApplyAssistInsufficientCreditsError();
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.jobApplyAssistCreditWallet.updateMany({
      where: { userId: input.userId, balance: { gte: APPLY_ASSIST_CREDIT_COST } },
      data: { balance: { decrement: APPLY_ASSIST_CREDIT_COST } },
    });
    if (updated.count === 0) throw new ApplyAssistInsufficientCreditsError();

    await tx.jobApplyAssistLedger.create({
      data: {
        userId: input.userId,
        delta: -APPLY_ASSIST_CREDIT_COST,
        reason: input.reason,
        applicationId: input.applicationId ?? null,
        queueId: input.queueId,
      },
    });
  });
}

export async function getApplyAssistWalletState(tenantId: string, userId: string) {
  const wallet = await getOrCreateApplyAssistWallet(tenantId, userId);
  const [confirmedToday, recentLedger] = await Promise.all([
    countConfirmedAssistsToday(userId),
    prisma.jobApplyAssistLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    balance: wallet.balance,
    creditPackPriceCents: APPLY_ASSIST_CREDIT_PACK_CENTS,
    creditsPerPack: APPLY_ASSIST_CREDITS_PER_PACK,
    creditCostPerAssist: APPLY_ASSIST_CREDIT_COST,
    dailyCap: APPLY_ASSIST_DAILY_CAP,
    confirmedToday,
    remainingToday: Math.max(0, APPLY_ASSIST_DAILY_CAP - confirmedToday),
    ledger: recentLedger.map((row) => ({
      id: row.id,
      delta: row.delta,
      reason: row.reason,
      applicationId: row.applicationId,
      queueId: row.queueId,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function countConfirmedAssistsToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.jobApplyAssistQueue.count({
    where: {
      userId,
      status: "confirmed",
      confirmedAt: { gte: start },
    },
  });
}

export async function createApplyAssistCreditCheckout(input: {
  provider: PaymentProviderId;
  tenantId: string;
  tenantSlug: string;
  userId: string;
  customerEmail: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  const env = getEnv();
  const enabled = getEnabledPaymentProviders();
  if (!enabled.includes(input.provider)) {
    throw new ApplyAssistValidationError("Selected payment provider is not configured");
  }

  const addon = await prisma.addon.findFirst({
    where: { slug: JOB_APPLY_ASSIST_ADDON_SLUG, isActive: true, deletedAt: null },
  });
  if (!addon) throw new ApplyAssistValidationError("Apply Assist add-on not found");

  const successUrl = input.successUrl ?? env.PAYMENT_SUCCESS_URL;
  const cancelUrl = input.cancelUrl ?? env.PAYMENT_CANCEL_URL;

  const metadata: CheckoutMetadata = {
    billingPeriod: "one_time",
    applyAssistCredits: {
      userId: input.userId,
      credits: APPLY_ASSIST_CREDITS_PER_PACK,
      creditPurchase: true,
    },
  };

  const checkout = await prisma.paymentCheckout.create({
    data: {
      tenantId: input.tenantId,
      provider: input.provider,
      productType: "addon",
      productId: addon.id,
      productSlug: addon.slug,
      productName: `${addon.name} — ${APPLY_ASSIST_CREDITS_PER_PACK} credits`,
      amountCents: APPLY_ASSIST_CREDIT_PACK_CENTS,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      successUrl,
      cancelUrl,
      metadata: JSON.stringify(metadata),
    },
  });

  let checkoutUrl: string;
  let externalId: string | null = null;

  if (input.provider === "mock") {
    checkoutUrl = createMockCheckoutUrl(checkout.id);
    externalId = `mock_${checkout.id}`;
  } else if (input.provider === "stripe") {
    const session = await createStripeCheckoutSession({
      checkoutId: checkout.id,
      amountCents: APPLY_ASSIST_CREDIT_PACK_CENTS,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      productName: `${addon.name} — ${APPLY_ASSIST_CREDITS_PER_PACK} credits`,
      customerEmail: input.customerEmail,
      successUrl,
      cancelUrl,
      billingPeriod: "monthly",
    });
    checkoutUrl = session.checkoutUrl;
    externalId = session.sessionId;
  } else {
    const tx = await initializePaystackTransaction({
      checkoutId: checkout.id,
      amountCents: APPLY_ASSIST_CREDIT_PACK_CENTS,
      currency: env.PAYMENT_DEFAULT_CURRENCY,
      customerEmail: input.customerEmail,
      successUrl,
      productName: `${addon.name} — ${APPLY_ASSIST_CREDITS_PER_PACK} credits`,
    });
    checkoutUrl = tx.checkoutUrl;
    externalId = tx.reference;
  }

  const updated = await prisma.paymentCheckout.update({
    where: { id: checkout.id },
    data: { checkoutUrl, externalId },
  });

  return {
    checkout: {
      id: updated.id,
      checkoutUrl: updated.checkoutUrl,
      amountCents: updated.amountCents,
      productName: updated.productName,
      credits: APPLY_ASSIST_CREDITS_PER_PACK,
    },
  };
}

export async function listApplyAssistQueue(userId: string) {
  const rows = await prisma.jobApplyAssistQueue.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(serializeQueue);
}

export async function createApplyAssistQueueItem(input: {
  tenantId: string;
  userId: string;
  channel: string;
  targetRole: string;
  region: string;
  jobUrl?: string | null;
  careersEmail?: string | null;
  company?: string | null;
  userDocumentId?: string | null;
}) {
  if (!isApplyAssistChannel(input.channel)) {
    throw new ApplyAssistValidationError("Invalid apply assist channel");
  }

  const region = normalizeJobHunterRegion(input.region) as JobHunterRegion;
  const targetRole = input.targetRole.trim();
  if (!targetRole) throw new ApplyAssistValidationError("Target role is required");

  if (input.channel === "email_apply") {
    const email = input.careersEmail?.trim();
    if (!email || !email.includes("@")) {
      throw new ApplyAssistValidationError("Careers email is required for email-apply assists");
    }
  } else {
    const url = input.jobUrl?.trim();
    if (!url) {
      throw new ApplyAssistValidationError("Job URL is required for LinkedIn/Indeed assist");
    }
  }

  if (input.userDocumentId) {
    const doc = await prisma.userDocument.findFirst({
      where: { id: input.userDocumentId, userId: input.userId },
    });
    if (!doc) throw new ApplyAssistValidationError("Selected CV document not found");
  }

  const row = await prisma.jobApplyAssistQueue.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      channel: input.channel,
      status: "queued",
      jobUrl: input.jobUrl?.trim() || null,
      careersEmail: input.careersEmail?.trim() || null,
      company: input.company?.trim() || null,
      targetRole,
      region,
      userDocumentId: input.userDocumentId ?? null,
    },
  });

  return serializeQueue(row);
}

async function loadCvSummary(userId: string, userDocumentId: string | null): Promise<string> {
  if (!userDocumentId) return "No CV attached.";
  const doc = await prisma.userDocument.findFirst({
    where: { id: userDocumentId, userId },
    include: { jobHunterCvDocument: true },
  });
  if (!doc?.jobHunterCvDocument) return `Attached document: ${doc?.filename ?? "CV"}`;
  try {
    const content = JSON.parse(doc.jobHunterCvDocument.contentJson) as {
      fullName?: string;
      summary?: string;
      skills?: string[];
    };
    return [
      content.fullName ? `Name: ${content.fullName}` : null,
      content.summary ? `Summary: ${content.summary}` : null,
      content.skills?.length ? `Skills: ${content.skills.slice(0, 12).join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return `Attached CV: ${doc.filename}`;
  }
}

export async function prefillApplyAssistQueueItem(userId: string, queueId: string) {
  const row = await prisma.jobApplyAssistQueue.findFirst({ where: { id: queueId, userId } });
  if (!row) return null;
  if (row.status === "confirmed") {
    throw new ApplyAssistValidationError("This assist was already confirmed");
  }

  if (!(await isJobHunterLlmConfigured())) {
    throw new JobHunterLlmUnavailableError();
  }

  const region = normalizeJobHunterRegion(row.region) as JobHunterRegion;
  const cvSummary = await loadCvSummary(userId, row.userDocumentId);

  let prefilled: ApplyAssistPrefilledPayload;

  if (row.channel === "email_apply") {
    const parsed = await callJobHunterLlmJson({
      system: `You draft job application emails for candidates. Return JSON only with keys: subject (string), bodyText (string), bodyHtml (string), company (string optional). Professional tone for ${JOB_HUNTER_REGION_LABELS[region]}. No fabrication of employers.`,
      user: `Target role: ${row.targetRole}
Region: ${region}
Careers email: ${row.careersEmail ?? ""}
Company hint: ${row.company ?? "unknown"}
Job URL: ${row.jobUrl ?? "n/a"}

Candidate CV summary:
${cvSummary}`,
    });

    prefilled = {
      channel: "email_apply",
      subject: String(parsed.subject ?? `Application — ${row.targetRole}`),
      bodyText: String(parsed.bodyText ?? ""),
      bodyHtml: String(parsed.bodyHtml ?? parsed.bodyText ?? ""),
      toEmail: row.careersEmail ?? undefined,
      company: String(parsed.company ?? row.company ?? ""),
    };

    if (!prefilled.bodyText?.trim()) {
      await prisma.jobApplyAssistQueue.update({
        where: { id: row.id },
        data: { status: "failed" },
      });
      throw new ApplyAssistValidationError("AI prefill did not return email body");
    }
  } else {
    const channelLabel = row.channel === "linkedin_assist" ? "LinkedIn" : "Indeed";
    const parsed = await callJobHunterLlmJson({
      system: `You assist job seekers with ${channelLabel} applications ONLY — no automation. Return JSON: coverBlurb (string), checklist (string[]), assistDisclaimer (string). Remind user they must submit manually.`,
      user: `Target role: ${row.targetRole}
Region: ${region}
Job URL: ${row.jobUrl ?? ""}
Company: ${row.company ?? "unknown"}

CV summary:
${cvSummary}`,
    });

    prefilled = {
      channel: row.channel as ApplyAssistChannel,
      coverBlurb: String(parsed.coverBlurb ?? ""),
      checklist: Array.isArray(parsed.checklist) ? parsed.checklist.map(String) : [],
      openUrl: row.jobUrl ?? undefined,
      assistDisclaimer:
        String(parsed.assistDisclaimer ?? "") ||
        `Assist-only: open the ${channelLabel} posting yourself, paste the cover blurb, and confirm here after you submit. PMail+ does not apply on your behalf.`,
    };

    if (!prefilled.coverBlurb?.trim()) {
      await prisma.jobApplyAssistQueue.update({
        where: { id: row.id },
        data: { status: "failed" },
      });
      throw new ApplyAssistValidationError("AI prefill did not return assist content");
    }
  }

  const updated = await prisma.jobApplyAssistQueue.update({
    where: { id: row.id },
    data: {
      status: "prefilled",
      prefilledPayloadJson: JSON.stringify(prefilled),
      company: prefilled.company ?? row.company,
    },
  });

  return serializeQueue(updated);
}

export async function confirmApplyAssistQueueItem(input: {
  tenantId: string;
  userId: string;
  queueId: string;
  apiPublicBase: string;
  credentials: MailCredentials;
  userSubmitted?: boolean;
  subjectOverride?: string;
  bodyTextOverride?: string;
  bodyHtmlOverride?: string;
}) {
  const row = await prisma.jobApplyAssistQueue.findFirst({
    where: { id: input.queueId, userId: input.userId },
  });
  if (!row) return null;

  if (row.status !== "prefilled") {
    throw new ApplyAssistValidationError("Prefill the assist before confirming");
  }

  const prefilled = parsePrefillPayload(row.prefilledPayloadJson);
  if (!prefilled) {
    throw new ApplyAssistValidationError("Missing prefilled payload");
  }

  if (prefilled.channel !== "email_apply" && !input.userSubmitted) {
    throw new ApplyAssistValidationError(
      "Confirm that you submitted the application yourself before completing this assist",
    );
  }

  const confirmedToday = await countConfirmedAssistsToday(input.userId);
  if (confirmedToday >= APPLY_ASSIST_DAILY_CAP) {
    throw new ApplyAssistDailyCapError();
  }

  const wallet = await prisma.jobApplyAssistCreditWallet.findUnique({ where: { userId: input.userId } });
  if (!wallet || wallet.balance < APPLY_ASSIST_CREDIT_COST) {
    throw new ApplyAssistInsufficientCreditsError();
  }

  let applicationId: string | undefined;

  if (prefilled.channel === "email_apply") {
    const subject = input.subjectOverride?.trim() || prefilled.subject || `Application — ${row.targetRole}`;
    const bodyText = input.bodyTextOverride?.trim() || prefilled.bodyText || "";
    const bodyHtml = input.bodyHtmlOverride?.trim() || prefilled.bodyHtml || undefined;
    const to = prefilled.toEmail || row.careersEmail;
    if (!to) throw new ApplyAssistValidationError("Recipient email is missing");

    await executeOutgoingMailSend({
      tenantId: input.tenantId,
      userId: input.userId,
      credentials: input.credentials,
      apiPublicBase: input.apiPublicBase,
      payload: {
        to,
        subject,
        text: bodyText,
        html: bodyHtml,
        userDocumentIds: row.userDocumentId ? [row.userDocumentId] : undefined,
      },
    });
  }

  const company =
    row.company?.trim() ||
    prefilled.company?.trim() ||
    (prefilled.channel === "email_apply" ? "Email application" : "Job board assist");

  const application = await createManualJobApplication(input.userId, {
    company,
    roleTitle: row.targetRole,
    status: "applied",
  });
  applicationId = application.id;

  await deductApplyAssistCredit({
    userId: input.userId,
    reason: `assist_confirm:${row.channel}`,
    applicationId,
    queueId: row.id,
  });

  const updated = await prisma.jobApplyAssistQueue.update({
    where: { id: row.id },
    data: {
      status: "confirmed",
      applicationId,
      confirmedAt: new Date(),
    },
  });

  const walletState = await getApplyAssistWalletState(input.tenantId, input.userId);

  return {
    queue: serializeQueue(updated),
    application,
    wallet: walletState,
  };
}

export async function listApplyAssistSetup(userId: string) {
  const documents = await listAttachableCareerDocuments(userId);
  return {
    channels: APPLY_ASSIST_CHANNELS,
    regions: Object.entries(JOB_HUNTER_REGION_LABELS).map(([code, label]) => ({ code, label })),
    documents,
    creditPackPriceCents: APPLY_ASSIST_CREDIT_PACK_CENTS,
    creditsPerPack: APPLY_ASSIST_CREDITS_PER_PACK,
    dailyCap: APPLY_ASSIST_DAILY_CAP,
    linkedInIndeedCopy:
      "LinkedIn and Indeed paths are assist-only: we generate a cover blurb and checklist, open the job URL for you, and charge one credit only after you confirm you submitted manually.",
  };
}

export { JobHunterLlmUnavailableError };
