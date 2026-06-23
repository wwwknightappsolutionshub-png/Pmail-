import { syncAllJobHunterApplications } from "../services/job-hunter-applications.service.js";

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function startJobHunterSyncJob(): void {
  const run = async () => {
    try {
      await syncAllJobHunterApplications();
    } catch (err) {
      console.error("[job-hunter-sync-job]", err);
    }
  };

  void run();
  setInterval(run, TEN_MINUTES_MS);
}
