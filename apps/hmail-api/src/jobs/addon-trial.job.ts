import { processTrialNurtureEmails } from "../services/addon.service.js";

const HOUR_MS = 60 * 60 * 1000;

export function startAddonTrialJob(): void {
  const run = async () => {
    try {
      await processTrialNurtureEmails();
    } catch (err) {
      console.error("[addon-trial-job]", err);
    }
  };

  void run();
  setInterval(run, HOUR_MS);
}
