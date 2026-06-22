import { GROWTH_AGENT_REGISTRY, isGrowthAgentKey } from "../growth/agent-registry.js";
import { loadGrowthWizardProfile } from "../growth/wizard-profile.js";
import { resolveWebsiteSnapshotForProfile } from "../growth/website-snapshot.js";
import { prisma } from "../lib/prisma.js";
import {
  claimPendingGrowthJobs,
  completeGrowthJob,
  enqueueGrowthJob,
  failGrowthJob,
  type GrowthJobType,
} from "./growth-job-queue.service.js";
import { runGrowthAgent } from "./growth-agent-runner.service.js";
import {
  generateDayOneContentBundle,
  getGrowthContentBundleSummary,
} from "./growth-content-bundle.service.js";
import { setWorkspaceStatus } from "./growth-workspace.service.js";
import { emitGrowthEvent } from "./growth-event-bus.service.js";

export async function enqueueWizardAnalysisPipeline(input: {
  tenantId: string;
  workspaceId: string;
}) {
  return enqueueGrowthJob({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    jobType: "orchestration_pipeline",
    payload: { pipeline: "wizard_analysis", agentKeys: GROWTH_AGENT_REGISTRY.map((a) => a.key) },
  });
}

/** Backfill Phase B bundle for workspaces that finished analysis before content_bundle existed. */
export async function ensureContentBundleQueued(input: {
  tenantId: string;
  workspaceId: string;
  workspaceStatus: string;
  wizardCompleted: boolean;
}) {
  if (!input.wizardCompleted) return null;
  if (input.workspaceStatus !== "foundation_ready") return null;

  const summary = await getGrowthContentBundleSummary(input.tenantId, input.workspaceId);
  if (summary.hasBundle) return null;

  const activeJob = await prisma.growthJob.findFirst({
    where: {
      workspaceId: input.workspaceId,
      jobType: "content_bundle",
      status: { in: ["pending", "processing"] },
    },
  });
  if (activeJob) return null;

  return enqueueGrowthJob({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    jobType: "content_bundle",
    payload: { pipeline: "day_one_bundle", backfill: true },
  });
}

/** Phase B — force-regenerate content bundle (wizard data preserved). */
export async function enqueueContentBundleRegeneration(input: {
  tenantId: string;
  workspaceId: string;
  wizardCompleted: boolean;
}) {
  if (!input.wizardCompleted) {
    throw new Error("Complete the onboarding wizard before regenerating the content bundle");
  }

  const activeJob = await prisma.growthJob.findFirst({
    where: {
      workspaceId: input.workspaceId,
      jobType: "content_bundle",
      status: { in: ["pending", "processing"] },
    },
  });
  if (activeJob) {
    throw new Error("Content bundle generation is already in progress");
  }

  await setWorkspaceStatus(input.workspaceId, "content_generating");

  return enqueueGrowthJob({
    tenantId: input.tenantId,
    workspaceId: input.workspaceId,
    jobType: "content_bundle",
    payload: { pipeline: "day_one_bundle", regenerate: true },
  });
}

export async function processGrowthJobQueue(): Promise<number> {
  const jobs = await claimPendingGrowthJobs(5);
  let processed = 0;

  for (const job of jobs) {
    try {
      if (job.jobType === "orchestration_pipeline") {
        await runOrchestrationPipeline(job);
      } else if (job.jobType === "content_bundle") {
        await runContentBundleJob(job);
      } else if (job.jobType === "agent_run") {
        const agentKey = job.payload.agentKey;
        if (typeof agentKey !== "string" || !isGrowthAgentKey(agentKey)) {
          throw new Error("Invalid agent_run payload");
        }
        await runGrowthAgent({
          tenantId: job.tenantId,
          workspaceId: job.workspaceId,
          agentKey,
          jobId: job.id,
        });
        await completeGrowthJob(job.id, { agentKey, status: "completed" });
      } else {
        throw new Error(`Unsupported job type: ${job.jobType as GrowthJobType}`);
      }
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job processing failed";
      await failGrowthJob(job.id, message);
    }
  }

  return processed;
}

async function runOrchestrationPipeline(job: {
  id: string;
  tenantId: string;
  workspaceId: string;
}) {
  await setWorkspaceStatus(job.workspaceId, "analysis_running");

  await emitGrowthEvent({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    eventType: "pipeline.started",
    payload: { jobId: job.id },
  });

  const profile = await loadGrowthWizardProfile(job.workspaceId);
  const websiteSnapshot = await resolveWebsiteSnapshotForProfile(profile);

  const completedAgents: string[] = [];

  for (const agent of GROWTH_AGENT_REGISTRY) {
    await runGrowthAgent({
      tenantId: job.tenantId,
      workspaceId: job.workspaceId,
      agentKey: agent.key,
      websiteSnapshot,
    });
    completedAgents.push(agent.key);
  }

  await setWorkspaceStatus(job.workspaceId, "foundation_ready");

  await enqueueGrowthJob({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    jobType: "content_bundle",
    payload: { pipeline: "day_one_bundle" },
  });

  await completeGrowthJob(job.id, {
    pipeline: "wizard_analysis",
    completedAgents,
    phase: "B",
  });

  await emitGrowthEvent({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    eventType: "pipeline.completed",
    payload: { jobId: job.id, completedAgents },
  });
}

async function runContentBundleJob(job: {
  id: string;
  tenantId: string;
  workspaceId: string;
}) {
  await emitGrowthEvent({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    eventType: "content_bundle.job_started",
    payload: { jobId: job.id },
  });

  const result = await generateDayOneContentBundle({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
  });

  await completeGrowthJob(job.id, {
    pipeline: "day_one_bundle",
    assetCount: result.assetCount,
    phase: "B",
  });

  await emitGrowthEvent({
    tenantId: job.tenantId,
    workspaceId: job.workspaceId,
    eventType: "content_bundle.job_completed",
    payload: { jobId: job.id, assetCount: result.assetCount },
  });
}
