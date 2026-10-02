import { dispatchScheduledOutreachCampaigns } from "../services/recruitment-outreach.service.js";
import { syncMailForPwaUsers } from "../services/pwa-mail-sync.service.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
/** Was 2 minutes — too aggressive; each tick opens IMAP for every push-subscribed mailbox. */
const PWA_MAIL_SYNC_INTERVAL_MS = 5 * 60 * 1000;

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
  setInterval(run, PWA_MAIL_SYNC_INTERVAL_MS);
}
