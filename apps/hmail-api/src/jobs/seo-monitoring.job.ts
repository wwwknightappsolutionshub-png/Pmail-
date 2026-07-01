import { getEnv } from "../config/env.js";
import { runPlatformSeoScan, seedPlatformSeoTasks } from "../services/platform-seo.service.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_SCHEDULE_MS = HOUR_MS;

let seeded = false;
let scanInFlight = false;

async function runScan(period: "weekly" | "monthly") {
  if (scanInFlight) {
    console.warn(`[seo-monitoring-job] ${period} scan skipped — previous scan still running`);
    return;
  }

  scanInFlight = true;
  try {
    if (!seeded) {
      await seedPlatformSeoTasks();
      seeded = true;
    }
    await runPlatformSeoScan(period);
    console.log(`[seo-monitoring-job] ${period === "weekly" ? "Weekly" : "Monthly"} SEO scan complete`);
  } catch (err) {
    console.error(`[seo-monitoring-job] ${period} scan failed:`, err);
  } finally {
    scanInFlight = false;
  }
}

function msUntilNextUtc(hour: number, dayOfWeek?: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (dayOfWeek !== undefined) {
    const delta = (dayOfWeek - next.getUTCDay() + 7) % 7;
    if (delta === 0 && next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 7);
    } else {
      next.setUTCDate(next.getUTCDate() + delta);
    }
  } else if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return Math.max(MIN_SCHEDULE_MS, next.getTime() - now.getTime());
}

function msUntilNextMonthlyUtc(hour: number): number {
  const now = new Date();
  let next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, hour, 0, 0, 0));
  if (next.getTime() <= now.getTime()) {
    next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, hour, 0, 0, 0));
  }
  return Math.max(MIN_SCHEDULE_MS, next.getTime() - now.getTime());
}

function scheduleRecurring(task: () => Promise<void>, initialDelayMs: number, intervalMs: number) {
  const safeInitial = Math.max(MIN_SCHEDULE_MS, initialDelayMs);
  const safeInterval = Math.max(MIN_SCHEDULE_MS, intervalMs);
  setTimeout(() => {
    void task();
    setInterval(() => void task(), safeInterval);
  }, safeInitial);
}

export function startSeoMonitoringJob() {
  if (!getEnv().SEO_MONITORING_JOB_ENABLED) {
    console.log("[seo-monitoring-job] Disabled via SEO_MONITORING_JOB_ENABLED=false");
    return;
  }

  void seedPlatformSeoTasks().catch((err) => console.error("[seo-monitoring-job] Seed failed:", err));

  scheduleRecurring(() => runScan("weekly"), msUntilNextUtc(6, 1), 7 * DAY_MS);
  scheduleRecurring(() => runScan("monthly"), msUntilNextMonthlyUtc(7), 30 * DAY_MS);

  setTimeout(() => void runScan("weekly"), 30_000);
}
