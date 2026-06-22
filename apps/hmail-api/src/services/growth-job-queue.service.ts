import { prisma } from "../lib/prisma.js";
import { logGrowthAudit } from "./growth-audit.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

export type GrowthJobType = "orchestration_pipeline" | "agent_run" | "content_bundle";

export async function enqueueGrowthJob(input: {
  tenantId: string;
  workspaceId: string;
  jobType: GrowthJobType;
  payload?: Record<string, unknown>;
  scheduledFor?: Date;
}) {
  const job = await prisma.growthJob.create({
    data: {
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      jobType: input.jobType,
      payloadJson: JSON.stringify(input.payload ?? {}),
      scheduledFor: input.scheduledFor ?? new Date(),
      status: "pending",
    },
  });

  await logGrowthAudit({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    action: "job.enqueued",
    entityType: "growth_job",
    entityId: job.id,
    metadata: { jobType: input.jobType },
  });

  await emitGrowthEvent({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    eventType: "job.enqueued",
    payload: { jobId: job.id, jobType: input.jobType },
  });

  return formatJob(job);
}

export async function listGrowthJobs(tenantId: string, workspaceId: string, limit = 30) {
  const rows = await prisma.growthJob.findMany({
    where: { tenantId, workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(formatJob);
}

export async function getGrowthJob(tenantId: string, jobId: string) {
  const row = await prisma.growthJob.findFirst({
    where: { id: jobId, tenantId },
  });
  if (!row) return null;
  return formatJob(row);
}

export async function claimPendingGrowthJobs(limit = 5) {
  const due = await prisma.growthJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: "asc" },
    take: limit,
  });

  const claimed = [];
  for (const job of due) {
    const updated = await prisma.growthJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: {
        status: "processing",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (updated.count === 1) {
      const fresh = await prisma.growthJob.findUnique({ where: { id: job.id } });
      if (fresh) claimed.push(fresh);
    }
  }

  return claimed.map(formatJob);
}

export async function completeGrowthJob(
  jobId: string,
  result: Record<string, unknown>,
) {
  await prisma.growthJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      resultJson: JSON.stringify(result),
      completedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function failGrowthJob(jobId: string, errorMessage: string) {
  const job = await prisma.growthJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const shouldRetry = job.attempts < job.maxAttempts;
  await prisma.growthJob.update({
    where: { id: jobId },
    data: {
      status: shouldRetry ? "pending" : "failed",
      errorMessage,
      completedAt: shouldRetry ? null : new Date(),
      scheduledFor: shouldRetry ? new Date(Date.now() + 60_000) : job.scheduledFor,
    },
  });

  if (!shouldRetry) {
    await emitGrowthEvent({
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      eventType: "job.failed",
      payload: { jobId, errorMessage },
    });
  }
}

function formatJob(row: {
  id: string;
  tenantId: string;
  workspaceId: string;
  jobType: string;
  status: string;
  payloadJson: string;
  resultJson: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  scheduledFor: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    jobType: row.jobType,
    status: row.status,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    result: row.resultJson ? (JSON.parse(row.resultJson) as Record<string, unknown>) : null,
    errorMessage: row.errorMessage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    scheduledFor: row.scheduledFor.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
