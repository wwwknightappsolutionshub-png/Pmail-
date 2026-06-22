import { processGrowthJobQueue } from "../services/growth-orchestrator.service.js";
import { runWeeklyBriefsForAllWorkspaces } from "../services/growth-optimization-llm.service.js";
import { prisma } from "../lib/prisma.js";
import { processDueGrowthChannelDeliveries } from "../services/growth-channel.service.js";

const QUEUE_INTERVAL_MS = 15 * 1000;
const WEEKLY_BRIEF_INTERVAL_MS = 60 * 60 * 1000;
const CHANNEL_DUE_INTERVAL_MS = 5 * 60 * 1000;

let lastWeeklyBriefRun = 0;
let lastChannelDueRun = 0;

async function processDueChannelsForAllWorkspaces() {
  const workspaces = await prisma.growthWorkspace.findMany({
    where: { status: "channels_ready" },
    select: { tenantId: true, id: true },
  });
  for (const ws of workspaces) {
    try {
      await processDueGrowthChannelDeliveries(ws.tenantId, ws.id);
    } catch (err) {
      console.error("[growth-channel-due]", ws.id, err);
    }
  }
}

export function startGrowthQueueJob(): void {
  const run = async () => {
    try {
      await processGrowthJobQueue();
    } catch (err) {
      console.error("[growth-queue-job]", err);
    }

    const now = Date.now();
    if (now - lastWeeklyBriefRun >= WEEKLY_BRIEF_INTERVAL_MS) {
      lastWeeklyBriefRun = now;
      try {
        const sent = await runWeeklyBriefsForAllWorkspaces();
        if (sent > 0) console.info(`[growth-weekly-brief] emailed ${sent} workspace(s)`);
      } catch (err) {
        console.error("[growth-weekly-brief]", err);
      }
    }

    if (now - lastChannelDueRun >= CHANNEL_DUE_INTERVAL_MS) {
      lastChannelDueRun = now;
      try {
        await processDueChannelsForAllWorkspaces();
      } catch (err) {
        console.error("[growth-channel-due-job]", err);
      }
    }
  };

  void run();
  setInterval(run, QUEUE_INTERVAL_MS);
}
