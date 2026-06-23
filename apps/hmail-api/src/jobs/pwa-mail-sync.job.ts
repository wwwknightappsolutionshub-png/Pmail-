import { dispatchScheduledOutreachCampaigns } from "../services/recruitment-outreach.service.js";
import { syncMailForPwaUsers } from "../services/pwa-mail-sync.service.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

export function startRecruitmentOutreachJob(): void {
  const run = async () => {
    try {
      await dispatchScheduledOutreachCampaigns();
    } catch (err) {
      console.error("[recruitment-outreach-job]", err);
    }
  };

  void run();
  setInterval(run, FIVE_MINUTES_MS);
}

export function startPwaMailSyncJob(): void {
  const run = async () => {
    try {
      await syncMailForPwaUsers();
    } catch (err) {
      console.error("[pwa-mail-sync-job]", err);
    }
  };

  void run();
  setInterval(run, TWO_MINUTES_MS);
}
