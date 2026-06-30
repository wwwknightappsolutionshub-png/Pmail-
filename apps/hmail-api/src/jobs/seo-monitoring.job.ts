import { runPlatformSeoScan, seedPlatformSeoTasks } from "../services/platform-seo.service.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

let seeded = false;

async function runWeekly() {
  try {
    if (!seeded) {
      await seedPlatformSeoTasks();
      seeded = true;
    }
    await runPlatformSeoScan("weekly");
    console.log("[seo-monitoring-job] Weekly SEO scan complete");
  } catch (err) {
    console.error("[seo-monitoring-job] Weekly scan failed:", err);
  }
}

async function runMonthly() {
  try {
    await runPlatformSeoScan("monthly");
    console.log("[seo-monitoring-job] Monthly SEO scan complete");
  } catch (err) {
    console.error("[seo-monitoring-job] Monthly scan failed:", err);
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
  return next.getTime() - now.getTime();
}

export function startSeoMonitoringJob() {
  void seedPlatformSeoTasks().catch((err) => console.error("[seo-monitoring-job] Seed failed:", err));

  const scheduleWeekly = () => {
    setTimeout(() => {
      void runWeekly();
      setInterval(() => void runWeekly(), 7 * DAY_MS);
    }, msUntilNextUtc(6, 1));
  };

  const scheduleMonthly = () => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 7, 0, 0, 0));
    setTimeout(() => {
      void runMonthly();
      setInterval(() => void runMonthly(), 30 * DAY_MS);
    }, next.getTime() - now.getTime());
  };

  scheduleWeekly();
  scheduleMonthly();

  setTimeout(() => void runWeekly(), 30_000);
}
