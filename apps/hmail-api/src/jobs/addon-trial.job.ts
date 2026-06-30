import { processTrialNurtureEmails } from "../services/addon.service.js";
import { processPanelWorkspaceTrialEmails } from "../services/panel-workspace-trial.service.js";
import { processPmailProspectDemoEmails } from "../services/pmail-prospect-demo.service.js";

const HOUR_MS = 60 * 60 * 1000;

export function startAddonTrialJob(): void {
  const run = async () => {
    try {
      await processTrialNurtureEmails();
      await processPanelWorkspaceTrialEmails();
      await processPmailProspectDemoEmails();
    } catch (err) {
      console.error("[addon-trial-job]", err);
    }
  };

  void run();
  setInterval(run, HOUR_MS);
}
